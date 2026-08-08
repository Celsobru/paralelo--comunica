const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { runAsync, allAsync, getAsync } = require('./db');
const rssMonitor = require('./rss-monitor');
const whatsappBot = require('./whatsapp-bot');

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message || err);
});

const app = express();
app.set('trust proxy', 1); // Required for rate-limit behind Cloudflare

// Security: IP logging with CF-Connecting-IP
morgan.token('client-ip', (req) => {
  return req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
});
app.use(morgan(':client-ip - :method :url :status :res[content-length] - :response-time ms'));

const uploadDir = path.join(__dirname, 'public', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  },
});
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'video/mp4'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido'), false);
  }
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 200 * 1024 * 1024 } });

// Security: Rate Limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Muitas tentativas de recuperação. Tente novamente em 1 hora.' }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));
app.use(session({
  secret: 'paralelo-comunica-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 },
}));

app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname)));

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ error: 'Não autenticado' });
}

function requireMaster(req, res, next) {
  if (req.session && req.session.role === 'admin') return next();
  res.status(403).json({ error: 'Acesso administrativo necessário' });
}

function requireAdmin(req, res, next) {
  if (req.session && (req.session.role === 'admin' || req.session.role === 'comum')) return next();
  res.status(403).json({ error: 'Acesso de editor necessário' });
}

function requireClient(req, res, next) {
  if (req.session && req.session.role === 'client') return next();
  res.status(403).json({ error: 'Acesso de cliente necessário' });
}

async function ensureAdminUser() {
  const admin = await getAsync('SELECT id FROM users WHERE role = ? LIMIT 1', ['admin']);
  if (!admin) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    await runAsync(
      'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, datetime("now","localtime"))',
      ['Administrador', 'admin@paralelo.com.br', passwordHash, 'admin']
    );
    console.log('Conta admin criada: admin@paralelo.com.br / admin123');
  }
}

// ===== AUTH =====
app.post('/api/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  const user = await getAsync('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) return res.status(401).json({ error: 'Credenciais inválidas' });
  req.session.userId = user.id;
  req.session.role = user.role;
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

app.post('/api/logout', requireAuth, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const user = await getAsync('SELECT id, name, email, role FROM users WHERE id = ?', [req.session.userId]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.post('/api/users/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await getAsync('SELECT * FROM users WHERE id = ?', [req.session.userId]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) return res.status(400).json({ error: 'Senha atual incorreta' });
  const hash = bcrypt.hashSync(newPassword, 10);
  await runAsync('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
  res.json({ ok: true });
});

// ===== UPLOAD =====
app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// ===== PUBLIC NEWS =====
app.get('/api/news', async (req, res) => {
  const { category, subcategory } = req.query;
  const adminNews = await allAsync(
    "SELECT * FROM news WHERE status = 'published' AND (news_type = 'admin' OR news_type IS NULL) ORDER BY created_at DESC"
  );
  const clientNews = await allAsync(
    "SELECT * FROM news WHERE status = 'published' AND news_type = 'client' AND payment_status = 'paid' AND (expires_at = '' OR expires_at >= date('now','localtime')) ORDER BY created_at DESC"
  );

  let allNews;
  if (adminNews.length > 0) {
    allNews = [adminNews[0], ...clientNews, ...adminNews.slice(1)];
  } else {
    allNews = clientNews;
  }

  if (category) {
    allNews = allNews.filter(n => n.category === category);
  }
  if (subcategory) {
    allNews = allNews.filter(n => (n.subcategory || '').toLowerCase() === subcategory.toLowerCase());
  }

  res.json(allNews);
});

app.get('/api/news/:id', async (req, res) => {
  const news = await getAsync('SELECT * FROM news WHERE id = ?', [req.params.id]);
  if (!news) return res.status(404).json({ error: 'Notícia não encontrada' });
  res.json(news);
});

// ===== PUBLIC AD SPACES =====
app.get('/api/ad-spaces-public', async (req, res) => {
  const spaces = await allAsync(`
    SELECT s.*,
      CASE WHEN a.id IS NOT NULL AND a.status = 'active'
        AND (a.end_date IS NULL OR a.end_date >= date('now'))
      THEN 'occupied' ELSE 'available' END as availability,
      a.end_date as expires_at,
      a.title as ad_title,
      a.link as ad_link,
      a.image_url as ad_image,
      a.embed_code as ad_embed,
      a.video_url as ad_video,
      c.company_name as occupied_by
    FROM ad_spaces s
    LEFT JOIN ads a ON a.ad_space_id = s.id AND a.status = 'active'
      AND (a.end_date IS NULL OR a.end_date >= date('now'))
    LEFT JOIN clients c ON a.client_id = c.id
    WHERE s.active = 1
    ORDER BY s.position
  `);
  res.json(spaces);
});

// ===== ADMIN NEWS =====
app.get('/api/admin/news', requireAdmin, async (req, res) => {
  const news = await allAsync('SELECT n.*, u.name AS author_name FROM news n LEFT JOIN users u ON n.author_id = u.id ORDER BY n.created_at DESC');
  res.json(news);
});

app.post('/api/admin/news', requireAdmin, async (req, res) => {
  const { title, category, subcategory, description, full_content, image_url, video_url, source, datetime, status, ad_space_id } = req.body;
  const authorId = req.session.userId;
  const result = await runAsync(
    'INSERT INTO news (title, category, subcategory, description, full_content, image_url, video_url, source, datetime, status, author_id, ad_space_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now","localtime"))',
    [title, category, subcategory || '', description, full_content || '', image_url, video_url || '', source, datetime, status || 'published', authorId, ad_space_id || null]
  );
  res.json({ id: result.lastID });
});

app.put('/api/admin/news/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, category, subcategory, description, full_content, image_url, video_url, source, datetime, status, ad_space_id } = req.body;
  await runAsync(
    'UPDATE news SET title = ?, category = ?, subcategory = ?, description = ?, full_content = ?, image_url = ?, video_url = ?, source = ?, datetime = ?, status = ?, ad_space_id = ? WHERE id = ?',
    [title, category, subcategory || '', description, full_content || '', image_url, video_url || '', source, datetime, status, ad_space_id || null, id]
  );
  res.json({ ok: true });
});

app.delete('/api/admin/news/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  await runAsync('DELETE FROM news WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ===== CLIENT NEWS =====
async function getNewsConfig() {
  const cfg = await getAsync('SELECT * FROM news_config WHERE id = 1');
  return cfg || { price_per_day_cents: 1000, min_days: 2, max_days: 10 };
}

app.get('/api/news-config', async (req, res) => {
  const cfg = await getNewsConfig();
  res.json(cfg);
});

app.get('/api/admin/news-config', requireAdmin, async (req, res) => {
  const cfg = await getNewsConfig();
  res.json(cfg);
});

app.put('/api/admin/news-config', requireAdmin, async (req, res) => {
  const { price_per_day_cents, min_days, max_days } = req.body;
  await runAsync(
    'UPDATE news_config SET price_per_day_cents=?, min_days=?, max_days=?, updated_at=datetime("now","localtime") WHERE id=1',
    [price_per_day_cents != null ? price_per_day_cents : 1000, min_days || 2, max_days || 10]
  );
  res.json({ ok: true });
});

app.get('/api/client/news', requireClient, async (req, res) => {
  const news = await allAsync('SELECT * FROM news WHERE author_id = ? ORDER BY created_at DESC', [req.session.userId]);
  res.json(news);
});

app.post('/api/client/news', requireClient, async (req, res) => {
  const { title, category, description, full_content, image_url, source, datetime, duration_days } = req.body;
  const authorId = req.session.userId;
  const cfg = await getNewsConfig();
  const days = Math.max(cfg.min_days, Math.min(cfg.max_days, parseInt(duration_days) || cfg.min_days));
  const priceCents = days * cfg.price_per_day_cents;
  const isFree = cfg.price_per_day_cents === 0;
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + days);

  const result = await runAsync(
    'INSERT INTO news (title, category, description, full_content, image_url, source, datetime, status, author_id, news_type, price_cents, payment_status, duration_days, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now","localtime"))',
    [title, category, description, full_content || '', image_url, source || '', datetime || '', isFree ? 'published' : 'draft', authorId, 'client', priceCents, isFree ? 'paid' : 'pending', days, expiresAt.toISOString().split('T')[0]]
  );
  res.json({ id: result.lastID, price_cents: priceCents, duration_days: days, expires_at: expiresAt.toISOString().split('T')[0], is_free: isFree });
});

app.put('/api/client/news/:id', requireClient, async (req, res) => {
  const { id } = req.params;
  const { title, category, description, full_content, image_url, source, datetime } = req.body;
  const news = await getAsync('SELECT * FROM news WHERE id = ? AND author_id = ?', [id, req.session.userId]);
  if (!news) return res.status(404).json({ error: 'Noticia nao encontrada' });
  if (news.payment_status === 'paid') return res.status(400).json({ error: 'Noticia ja paga, nao e possivel alterar' });
  await runAsync(
    'UPDATE news SET title = ?, category = ?, description = ?, full_content = ?, image_url = ?, source = ?, datetime = ? WHERE id = ? AND author_id = ?',
    [title, category, description, full_content || '', image_url, source, datetime, id, req.session.userId]
  );
  res.json({ ok: true });
});

app.put('/api/client/news/:id/pay', requireClient, async (req, res) => {
  const { id } = req.params;
  const { payment_method } = req.body;
  const news = await getAsync('SELECT * FROM news WHERE id = ? AND author_id = ?', [id, req.session.userId]);
  if (!news) return res.status(404).json({ error: 'Noticia nao encontrada' });
  if (news.payment_status === 'paid') return res.status(400).json({ error: 'Noticia ja paga' });
  await runAsync(
    "UPDATE news SET payment_status = 'paid', status = 'published' WHERE id = ? AND author_id = ?",
    [id, req.session.userId]
  );
  res.json({ ok: true });
});

app.delete('/api/client/news/:id', requireClient, async (req, res) => {
  const { id } = req.params;
  await runAsync('DELETE FROM news WHERE id = ? AND author_id = ?', [id, req.session.userId]);
  res.json({ ok: true });
});

// ===== ADMIN CLIENTS =====
app.get('/api/admin/clients', requireAdmin, async (req, res) => {
  const clients = await allAsync(
    'SELECT c.id, c.company_name, c.phone, c.website, c.notes, c.user_id, u.name, u.email FROM clients c JOIN users u ON c.user_id = u.id ORDER BY c.created_at DESC'
  );
  res.json(clients);
});

app.get('/api/admin/clients/:id', requireAdmin, async (req, res) => {
  const client = await getAsync(
    'SELECT c.id, c.company_name, c.phone, c.website, c.notes, c.user_id, u.name, u.email FROM clients c JOIN users u ON c.user_id = u.id WHERE c.id = ?',
    [req.params.id]
  );
  if (!client) return res.status(404).json({ error: 'Cliente nao encontrado' });
  res.json(client);
});

app.post('/api/admin/clients', requireAdmin, async (req, res) => {
  const { name, email, password, company_name, phone, website, notes } = req.body;
  try {
    const passwordHash = bcrypt.hashSync(password || 'senha123', 10);
    const userResult = await runAsync(
      'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, datetime("now","localtime"))',
      [name, email, passwordHash, 'client']
    );
    const userId = userResult.lastID;
    const clientResult = await runAsync(
      'INSERT INTO clients (user_id, company_name, phone, website, notes, created_at) VALUES (?, ?, ?, ?, ?, datetime("now","localtime"))',
      [userId, company_name, phone, website, notes]
    );
    res.json({ id: clientResult.lastID, user_id: userId });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Este email ja esta cadastrado' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/clients/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, password, company_name, phone, website, notes } = req.body;
  const client = await getAsync('SELECT * FROM clients WHERE id = ?', [id]);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  if (password) {
    const passwordHash = bcrypt.hashSync(password, 10);
    await runAsync('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, client.user_id]);
  }
  await runAsync(
    'UPDATE users SET name = ?, email = ? WHERE id = ?',
    [name, email, client.user_id]
  );
  await runAsync(
    'UPDATE clients SET company_name = ?, phone = ?, website = ?, notes = ? WHERE id = ?',
    [company_name, phone, website, notes, id]
  );
  res.json({ ok: true });
});

// ===== ADMIN AD SPACES =====
app.get('/api/admin/ad-spaces', requireMaster, async (req, res) => {
  const spaces = await allAsync(`
    SELECT s.*,
      CASE WHEN a.id IS NOT NULL AND a.status = 'active'
        AND (a.end_date IS NULL OR a.end_date >= date('now'))
      THEN 'occupied' ELSE 'available' END as availability,
      a.end_date as expires_at,
      a.title as ad_title,
      c.company_name as occupied_by
    FROM ad_spaces s
    LEFT JOIN ads a ON a.ad_space_id = s.id AND a.status = 'active'
      AND (a.end_date IS NULL OR a.end_date >= date('now'))
    LEFT JOIN clients c ON a.client_id = c.id
    ORDER BY s.position
  `);
  res.json(spaces);
});

app.post('/api/admin/ad-spaces', requireMaster, async (req, res) => {
  const { name, position, description, price_cents, width, height, active } = req.body;
  const result = await runAsync(
    'INSERT INTO ad_spaces (name, position, description, price_cents, width, height, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now","localtime"))',
    [name, position, description, price_cents, width, height, active ? 1 : 0]
  );
  res.json({ id: result.lastID });
});

app.put('/api/admin/ad-spaces/:id', requireMaster, async (req, res) => {
  const { id } = req.params;
  const { name, position, description, price_cents, width, height, active } = req.body;
  await runAsync(
    'UPDATE ad_spaces SET name = ?, position = ?, description = ?, price_cents = ?, width = ?, height = ?, active = ? WHERE id = ?',
    [name, position, description, price_cents, width, height, active ? 1 : 0, id]
  );
  res.json({ ok: true });
});

app.get('/api/admin/ad-spaces/:id', requireMaster, async (req, res) => {
  const space = await getAsync('SELECT * FROM ad_spaces WHERE id = ?', [req.params.id]);
  if (!space) return res.status(404).json({ error: 'Espaco nao encontrado' });
  res.json(space);
});

// ===== ADMIN ADS =====
app.get('/api/admin/ads', requireAdmin, async (req, res) => {
  const ads = await allAsync(
    "SELECT a.*, COALESCE(c.company_name, 'Cliente Removido/Sem Perfil') AS client_name, COALESCE(s.name, 'Espaço Removido') AS space_name FROM ads a LEFT JOIN clients c ON a.client_id = c.id LEFT JOIN ad_spaces s ON a.ad_space_id = s.id ORDER BY a.created_at DESC"
  );
  res.json(ads);
});

app.post('/api/admin/ads', requireAdmin, async (req, res) => {
  const { client_id, ad_space_id, title, link, image_url, embed_code, video_url, start_date, end_date, status } = req.body;
  const result = await runAsync(
    'INSERT INTO ads (client_id, ad_space_id, title, link, image_url, embed_code, video_url, status, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now","localtime"))',
    [client_id, ad_space_id, title, link, image_url, embed_code, video_url || '', status || 'active', start_date, end_date]
  );
  res.json({ id: result.lastID });
});

app.get('/api/admin/ads/:id', requireAdmin, async (req, res) => {
  const ad = await getAsync(
    "SELECT a.*, COALESCE(c.company_name, 'Cliente Removido/Sem Perfil') AS client_name, COALESCE(s.name, 'Espaço Removido') AS space_name FROM ads a LEFT JOIN clients c ON a.client_id = c.id LEFT JOIN ad_spaces s ON a.ad_space_id = s.id WHERE a.id = ?",
    [req.params.id]
  );
  if (!ad) return res.status(404).json({ error: 'Anuncio nao encontrado' });
  res.json(ad);
});

app.put('/api/admin/ads/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { client_id, ad_space_id, title, link, image_url, embed_code, video_url, start_date, end_date, status } = req.body;
  await runAsync(
    'UPDATE ads SET client_id = ?, ad_space_id = ?, title = ?, link = ?, image_url = ?, embed_code = ?, video_url = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?',
    [client_id, ad_space_id, title, link, image_url, embed_code, video_url || '', start_date, end_date, status, id]
  );
  res.json({ ok: true });
});

app.delete('/api/admin/ads/:id', requireAdmin, async (req, res) => {
  await runAsync('DELETE FROM ads WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ===== ADMIN SUBSCRIPTIONS =====
app.get('/api/admin/subscriptions', requireAdmin, async (req, res) => {
  const subscriptions = await allAsync(
    'SELECT s.*, u.name AS user_name, u.email FROM subscriptions s JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC'
  );
  res.json(subscriptions);
});

app.post('/api/admin/subscriptions', requireAdmin, async (req, res) => {
  const { user_id, plan, price_cents, status, expires_at, payment_method } = req.body;
  const result = await runAsync(
    'INSERT INTO subscriptions (user_id, plan, price_cents, status, started_at, expires_at, payment_method, last_payment_date, created_at) VALUES (?, ?, ?, ?, datetime("now","localtime"), ?, ?, datetime("now","localtime"), datetime("now","localtime"))',
    [user_id, plan, price_cents, status || 'active', expires_at, payment_method]
  );
  res.json({ id: result.lastID });
});

app.post('/api/subscribe', requireAuth, async (req, res) => {
  const { plan, payment_method } = req.body;
  if (!plan) return res.status(400).json({ error: 'Plano obrigatório' });
  const price_cents = plan === 'monthly' ? 199 : 0;
  const startedAt = new Date();
  const expiresAt = new Date(startedAt);
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  await runAsync(
    'INSERT INTO subscriptions (user_id, plan, price_cents, status, started_at, expires_at, payment_method, last_payment_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now","localtime"))',
    [req.session.userId, plan, price_cents, 'active', startedAt.toISOString(), expiresAt.toISOString(), payment_method, startedAt.toISOString()]
  );
  res.json({ ok: true, plan, price_cents });
});

// ===== CLIENT AD SPACES (public view with availability) =====
app.get('/api/client/ad-spaces', requireClient, async (req, res) => {
  const spaces = await allAsync(`
    SELECT s.*,
      CASE WHEN a.id IS NOT NULL AND a.status = 'active'
        AND (a.end_date IS NULL OR a.end_date >= date('now'))
      THEN 'occupied' ELSE 'available' END as availability,
      a.end_date as expires_at,
      a.title as ad_title,
      c.company_name as occupied_by,
      a.client_id as occupied_by_id
    FROM ad_spaces s
    LEFT JOIN ads a ON a.ad_space_id = s.id AND a.status = 'active'
      AND (a.end_date IS NULL OR a.end_date >= date('now'))
    LEFT JOIN clients c ON a.client_id = c.id
    WHERE s.active = 1
    ORDER BY s.position
  `);
  res.json(spaces);
});

// ===== CLIENT ADS =====
app.get('/api/client/ads', requireClient, async (req, res) => {
  const client = await getAsync('SELECT id FROM clients WHERE user_id = ?', [req.session.userId]);
  if (!client) return res.json([]);
  const ads = await allAsync(
    'SELECT a.*, s.name AS space_name, s.position AS space_position, s.width, s.height FROM ads a JOIN ad_spaces s ON a.ad_space_id = s.id WHERE a.client_id = ? ORDER BY a.created_at DESC',
    [client.id]
  );
  res.json(ads);
});

app.post('/api/client/ads', requireClient, async (req, res) => {
  const client = await getAsync('SELECT id FROM clients WHERE user_id = ?', [req.session.userId]);
  if (!client) return res.status(400).json({ error: 'Perfil de cliente nao encontrado' });
  const { ad_space_id, title, link, image_url, embed_code, video_url, start_date, end_date } = req.body;
  const space = await getAsync('SELECT * FROM ad_spaces WHERE id = ? AND active = 1', [ad_space_id]);
  if (!space) return res.status(400).json({ error: 'Espaco nao encontrado ou inativo' });
  const existing = await getAsync(
    "SELECT id FROM ads WHERE ad_space_id = ? AND status = 'active' AND (end_date IS NULL OR end_date >= date('now'))",
    [ad_space_id]
  );
  if (existing) return res.status(400).json({ error: 'Este espaco ja esta ocupado por outro anuncio ativo' });
  const result = await runAsync(
    'INSERT INTO ads (client_id, ad_space_id, title, link, image_url, embed_code, video_url, status, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now","localtime"))',
    [client.id, ad_space_id, title, link || '', image_url || '', embed_code || '', video_url || '', 'active', start_date || null, end_date || null]
  );
  res.json({ id: result.lastID });
});

app.delete('/api/client/ads/:id', requireClient, async (req, res) => {
  const client = await getAsync('SELECT id FROM clients WHERE user_id = ?', [req.session.userId]);
  if (!client) return res.status(400).json({ error: 'Perfil de cliente não encontrado' });
  await runAsync('DELETE FROM ads WHERE id = ? AND client_id = ?', [req.params.id, client.id]);
  res.json({ ok: true });
});

// ===== ADMIN NOTIFICATIONS =====
async function broadcastNotification(notificationId, title, message, audience) {
  try {
    let phones = [];
    if (audience === 'clients') {
      const rows = await allAsync("SELECT DISTINCT phone FROM clients WHERE phone IS NOT NULL AND phone != ''");
      phones = rows.map(r => r.phone);
    } else if (audience === 'subscribers') {
      const rows = await allAsync(`
        SELECT DISTINCT c.phone FROM clients c
        JOIN subscriptions s ON c.user_id = s.user_id
        WHERE c.phone IS NOT NULL AND c.phone != '' AND s.status = 'active'
      `);
      phones = rows.map(r => r.phone);
    } else { // 'all'
      const rows = await allAsync("SELECT DISTINCT phone FROM clients WHERE phone IS NOT NULL AND phone != ''");
      phones = rows.map(r => r.phone);
    }

    if (phones.length === 0) {
      await runAsync(
        "UPDATE notifications SET status = 'sent', sent_at = datetime('now','localtime') WHERE id = ?",
        [notificationId]
      );
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const phone of phones) {
      if (!whatsappBot.ready) {
        failCount++;
        continue;
      }
      let cleanNumber = phone.replace(/\D/g, '');
      if (cleanNumber.length > 0) {
        if (cleanNumber.length <= 11 && !cleanNumber.startsWith('55')) {
          cleanNumber = '55' + cleanNumber;
        }
        try {
          const fullMessage = `📢 *${title}*\n\n${message}`;
          await whatsappBot.sendMessage(cleanNumber, fullMessage);
          successCount++;
          // Delay de 2 segundos para evitar banimento do WhatsApp
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
          console.error(`Failed to send notification to ${phone}:`, err.message);
          failCount++;
        }
      } else {
        failCount++;
      }
    }

    const finalStatus = failCount === phones.length ? 'failed' : 'sent';
    await runAsync(
      "UPDATE notifications SET status = ?, sent_at = datetime('now','localtime') WHERE id = ?",
      [finalStatus, notificationId]
    );
  } catch (err) {
    console.error('Error in broadcastNotification:', err.message);
    await runAsync(
      "UPDATE notifications SET status = 'failed' WHERE id = ?",
      [notificationId]
    );
  }
}

app.get('/api/admin/notifications', requireAdmin, async (req, res) => {
  const notifications = await allAsync('SELECT * FROM notifications ORDER BY created_at DESC');
  res.json(notifications);
});

app.post('/api/admin/notifications', requireAdmin, async (req, res) => {
  const { title, message, audience, sendNow } = req.body;
  
  if (sendNow && !whatsappBot.ready) {
    return res.status(400).json({ error: 'WhatsApp não está conectado. Escaneie o QR Code primeiro.' });
  }

  const result = await runAsync(
    'INSERT INTO notifications (title, message, audience, status, sent_at, created_at) VALUES (?, ?, ?, ?, ?, datetime("now","localtime"))',
    [title, message, audience, sendNow ? 'sending' : 'draft', sendNow ? new Date().toISOString() : null]
  );
  
  const notificationId = result.lastID;

  if (sendNow) {
    // Dispara a transmissão em segundo plano para não travar a requisição HTTP
    broadcastNotification(notificationId, title, message, audience).catch(err => {
      console.error('Broadcast error:', err);
    });
  }

  res.json({ id: notificationId, status: sendNow ? 'sending' : 'draft' });
});

app.get('/api/admin/notifications/template', requireAdmin, async (req, res) => {
  const row = await getAsync('SELECT whatsapp_template FROM site_config WHERE id = 1');
  res.json({ template: row?.whatsapp_template || '' });
});

app.post('/api/admin/notifications/template', requireAdmin, async (req, res) => {
  const { template } = req.body;
  await runAsync('UPDATE site_config SET whatsapp_template = ? WHERE id = 1', [template || '']);
  res.json({ ok: true });
});

app.delete('/api/admin/notifications/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  await runAsync('DELETE FROM notifications WHERE id = ?', [id]);
  res.json({ ok: true });
});

app.delete('/api/admin/notifications', requireAdmin, async (req, res) => {
  await runAsync('DELETE FROM notifications');
  res.json({ ok: true });
});

// ===== PUBLIC SITE STATS =====
app.get('/api/site-stats', async (req, res) => {
  const stats = await getAsync('SELECT * FROM site_stats WHERE id = 1');
  res.json(stats || { total_visitors: 0, online_max: 0 });
});

// ===== ADMIN SITE STATS =====
app.put('/api/admin/site-stats', requireAdmin, async (req, res) => {
  const { total_visitors, online_max } = req.body;
  await runAsync(
    'UPDATE site_stats SET total_visitors = ?, online_max = ?, updated_at = datetime("now","localtime") WHERE id = 1',
    [total_visitors || 0, online_max || 0]
  );
  res.json({ ok: true });
});

// ===== ADMIN ANALYTICS =====
app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
  const [newsCount, clientCount, adSpaceCount, activeAds, subscribers, occupiedSpaces] = await Promise.all([
    getAsync('SELECT COUNT(*) AS value FROM news'),
    getAsync('SELECT COUNT(*) AS value FROM clients'),
    getAsync('SELECT COUNT(*) AS value FROM ad_spaces WHERE active = 1'),
    getAsync('SELECT COUNT(*) AS value FROM ads WHERE status = ?', ['active']),
    getAsync('SELECT COUNT(*) AS value FROM subscriptions WHERE status = ?', ['active']),
    getAsync(`SELECT COUNT(*) AS value FROM ad_spaces s
      WHERE s.active = 1 AND EXISTS (
        SELECT 1 FROM ads a WHERE a.ad_space_id = s.id AND a.status = 'active'
        AND (a.end_date IS NULL OR a.end_date >= date('now'))
      )`),
  ]);
  res.json({
    newsCount: newsCount.value,
    clientCount: clientCount.value,
    adSpaceCount: adSpaceCount.value,
    activeAds: activeAds.value,
    subscribers: subscribers.value,
    occupiedSpaces: occupiedSpaces.value,
    availableSpaces: adSpaceCount.value - occupiedSpaces.value,
  });
});

// ===== PAYMENT CONFIG =====
app.get('/api/admin/payment-config', requireMaster, async (req, res) => {
  const config = await getAsync('SELECT * FROM payment_config WHERE id = 1');
  res.json(config || {});
});

app.put('/api/admin/payment-config', requireMaster, async (req, res) => {
  const { pix_key, pix_name, pix_city, bank_name, bank_agency, bank_account, bank_cpf, company_name, subscription_price_cents } = req.body;
  await runAsync(
    'UPDATE payment_config SET pix_key=?, pix_name=?, pix_city=?, bank_name=?, bank_agency=?, bank_account=?, bank_cpf=?, company_name=?, subscription_price_cents=?, updated_at=datetime("now","localtime") WHERE id=1',
    [pix_key||'', pix_name||'', pix_city||'', bank_name||'', bank_agency||'', bank_account||'', bank_cpf||'', company_name||'', subscription_price_cents != null ? Number(subscription_price_cents) : 399]
  );
  res.json({ ok: true });
});

app.get('/api/payment-config', async (req, res) => {
  const config = await getAsync('SELECT pix_key, pix_name, pix_city, company_name FROM payment_config WHERE id = 1');
  res.json(config || {});
});

app.get('/api/subscription-price', async (req, res) => {
  const config = await getAsync('SELECT subscription_price_cents FROM payment_config WHERE id = 1');
  const price_cents = config?.subscription_price_cents !== undefined && config?.subscription_price_cents !== null ? config.subscription_price_cents : 399;
  const price_reais = (price_cents / 100).toFixed(2).replace('.', ',');
  res.json({ price_cents, price_reais: `R$ ${price_reais}` });
});

app.get('/api/site-config', async (req, res) => {
  try {
    const config = (await getAsync('SELECT * FROM site_config WHERE id = 1')) || {};
    try {
      const rss = await getAsync('SELECT whatsapp_phone FROM rss_config WHERE id = 1');
      if (rss && rss.whatsapp_phone) {
        config.whatsapp_phone = rss.whatsapp_phone;
      }
    } catch(e) {}
    res.json(config);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/site-config', requireMaster, async (req, res) => {
  const config = await getAsync('SELECT * FROM site_config WHERE id = 1');
  res.json(config || {});
});

app.put('/api/admin/site-config', requireMaster, async (req, res) => {
  const { site_name, site_slogan, site_description, footer_categories, inst_sobre, inst_contato, inst_anuncie, inst_privacidade, social_instagram, social_twitter, social_facebook, social_youtube, copyright, live_status, live_youtube_channel_id, live_video_url, live_title, nav_items } = req.body;
  const navItemsStr = nav_items ? (typeof nav_items === 'string' ? nav_items : JSON.stringify(nav_items)) : '[]';
  await runAsync(
    `UPDATE site_config SET site_name=?, site_slogan=?, site_description=?, footer_categories=?, inst_sobre=?, inst_contato=?, inst_anuncie=?, inst_privacidade=?, social_instagram=?, social_twitter=?, social_facebook=?, social_youtube=?, copyright=?, live_status=?, live_youtube_channel_id=?, live_video_url=?, live_title=?, nav_items=?, updated_at=datetime("now","localtime") WHERE id=1`,
    [site_name||'', site_slogan||'', site_description||'', footer_categories||'', inst_sobre||'', inst_contato||'', inst_anuncie||'', inst_privacidade||'', social_instagram||'', social_twitter||'', social_facebook||'', social_youtube||'', copyright||'', live_status||'auto', live_youtube_channel_id||'', live_video_url||'', live_title||'Transmissão Ao Vivo', navItemsStr]
  );
  res.json({ ok: true });
});

app.get('/api/pages/:slug', async (req, res) => {
  const page = await getAsync('SELECT * FROM pages WHERE slug = ?', [req.params.slug]);
  if (!page) return res.status(404).json({ error: 'Página não encontrada' });
  res.json(page);
});

app.get('/api/admin/pages', requireAdmin, async (req, res) => {
  const pages = await allAsync('SELECT * FROM pages ORDER BY id');
  res.json(pages);
});

app.get('/api/admin/pages/:slug', requireAdmin, async (req, res) => {
  const page = await getAsync('SELECT * FROM pages WHERE slug = ?', [req.params.slug]);
  res.json(page || {});
});

app.put('/api/admin/pages/:slug', requireAdmin, async (req, res) => {
  const { title, content } = req.body;
  await runAsync(
    'UPDATE pages SET title=?, content=?, updated_at=datetime("now","localtime") WHERE slug=?',
    [title||'', content||'', req.params.slug]
  );
  res.json({ ok: true });
});

// ===== RESERVATIONS =====
app.get('/api/admin/reservations', requireAdmin, async (req, res) => {
  const rows = await allAsync(`
    SELECT r.*, c.company_name, u.name AS client_name, u.email AS client_email, s.name AS space_name
    FROM reservations r
    JOIN clients c ON r.client_id = c.id
    JOIN users u ON c.user_id = u.id
    JOIN ad_spaces s ON r.ad_space_id = s.id
    ORDER BY r.created_at DESC
  `);
  res.json(rows);
});

app.post('/api/client/reservations', requireClient, async (req, res) => {
  const client = await getAsync('SELECT id FROM clients WHERE user_id = ?', [req.session.userId]);
  if (!client) return res.status(400).json({ error: 'Perfil de cliente nao encontrado' });
  const { ad_space_id, start_date, end_date } = req.body;
  if (!ad_space_id || !start_date || !end_date) return res.status(400).json({ error: 'Campos obrigatorios' });

  const start = new Date(start_date);
  const end = new Date(end_date);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  if (days < 7 || days > 30) return res.status(400).json({ error: 'Periodo deve ser de 7 a 30 dias' });

  const space = await getAsync('SELECT * FROM ad_spaces WHERE id = ?', [ad_space_id]);
  if (!space) return res.status(400).json({ error: 'Espaco nao encontrado' });

  const priceCents = Math.round(space.price_cents / 30 * days);
  const isFree = space.price_cents === 0;
  const status = isFree ? 'paid' : 'pending';

  const result = await runAsync(
    'INSERT INTO reservations (client_id, ad_space_id, start_date, end_date, total_days, price_cents, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now","localtime"))',
    [client.id, ad_space_id, start_date, end_date, days, priceCents, status]
  );
  res.json({ id: result.lastID, price_cents: priceCents, total_days: days, is_free: isFree });
});

app.put('/api/admin/reservations/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Status invalido' });

  const reservation = await getAsync('SELECT * FROM reservations WHERE id = ?', [id]);
  if (!reservation) return res.status(404).json({ error: 'Reserva nao encontrada' });

  await runAsync('UPDATE reservations SET status = ? WHERE id = ?', [status, id]);
  res.json({ ok: true });
});

app.delete('/api/admin/reservations/:id', requireAdmin, async (req, res) => {
  await runAsync('DELETE FROM reservations WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ===== CLIENT RESERVATIONS =====
app.get('/api/client/reservations', requireClient, async (req, res) => {
  const client = await getAsync('SELECT id FROM clients WHERE user_id = ?', [req.session.userId]);
  if (!client) return res.json([]);
  const rows = await allAsync(`
    SELECT r.*, s.name AS space_name, s.width, s.height
    FROM reservations r
    JOIN ad_spaces s ON r.ad_space_id = s.id
    WHERE r.client_id = ?
    ORDER BY r.created_at DESC
  `, [client.id]);
  res.json(rows);
});

app.put('/api/client/reservations/:id/pay', requireClient, async (req, res) => {
  const client = await getAsync('SELECT id FROM clients WHERE user_id = ?', [req.session.userId]);
  if (!client) return res.status(400).json({ error: 'Perfil nao encontrado' });
  const reservation = await getAsync('SELECT * FROM reservations WHERE id = ? AND client_id = ?', [req.params.id, client.id]);
  if (!reservation) return res.status(404).json({ error: 'Reserva nao encontrada' });
  if (reservation.status !== 'approved') return res.status(400).json({ error: 'Reserva ainda nao aprovada' });

  const { payment_method } = req.body;
  await runAsync(
    'UPDATE reservations SET status = ?, payment_method = ? WHERE id = ?',
    ['paid', payment_method || 'pix', req.params.id]
  );
  res.json({ ok: true });
});

app.post('/api/client/ads/from-reservation', requireClient, async (req, res) => {
  const client = await getAsync('SELECT id FROM clients WHERE user_id = ?', [req.session.userId]);
  if (!client) return res.status(400).json({ error: 'Perfil nao encontrado' });

  const { reservation_id, title, link, image_url, embed_code, video_url } = req.body;
  if (!reservation_id) return res.status(400).json({ error: 'Reserva obrigatoria' });

  const reservation = await getAsync('SELECT * FROM reservations WHERE id = ? AND client_id = ?', [reservation_id, client.id]);
  if (!reservation) return res.status(404).json({ error: 'Reserva nao encontrada' });
  if (reservation.status !== 'paid') return res.status(400).json({ error: 'Reserva ainda nao foi paga' });

  const existing = await getAsync('SELECT id FROM ads WHERE reservation_id = ?', [reservation_id]);
  if (existing) return res.status(400).json({ error: 'Anuncio ja criado para esta reserva' });

  const result = await runAsync(
    'INSERT INTO ads (client_id, ad_space_id, title, link, image_url, embed_code, video_url, status, start_date, end_date, reservation_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now","localtime"))',
    [client.id, reservation.ad_space_id, title || 'Anuncio reservado', link || '', image_url || '', embed_code || '', video_url || '', 'scheduled', reservation.start_date, reservation.end_date, reservation_id]
  );
  res.json({ id: result.lastID, status: 'scheduled', start_date: reservation.start_date, end_date: reservation.end_date });
});

app.put('/api/client/ads/:id', requireClient, async (req, res) => {
  const client = await getAsync('SELECT id FROM clients WHERE user_id = ?', [req.session.userId]);
  if (!client) return res.status(400).json({ error: 'Perfil nao encontrado' });
  const ad = await getAsync('SELECT * FROM ads WHERE id = ? AND client_id = ?', [req.params.id, client.id]);
  if (!ad) return res.status(404).json({ error: 'Anuncio nao encontrado' });
  if (ad.status !== 'scheduled') return res.status(400).json({ error: 'So e possivel editar anuncios agendados' });

  const { title, link, image_url, embed_code, video_url } = req.body;
  await runAsync(
    'UPDATE ads SET title=?, link=?, image_url=?, embed_code=?, video_url=? WHERE id=?',
    [title || ad.title, link || ad.link, image_url || ad.image_url, embed_code || ad.embed_code, video_url || ad.video_url, req.params.id]
  );
  res.json({ ok: true });
});

// ===== QUICK AD =====
app.post('/api/client/ads/quick', requireClient, async (req, res) => {
  const client = await getAsync('SELECT id FROM clients WHERE user_id = ?', [req.session.userId]);
  if (!client) return res.status(400).json({ error: 'Perfil de cliente nao encontrado' });
  const { ad_space_id, title, link, image_url, embed_code, video_url } = req.body;
  if (!ad_space_id) return res.status(400).json({ error: 'Espaco obrigatorio' });

  const existing = await getAsync(
    "SELECT id FROM ads WHERE ad_space_id = ? AND status = 'active' AND (end_date IS NULL OR end_date >= date('now'))",
    [ad_space_id]
  );
  if (existing) return res.status(400).json({ error: 'Espaco ja esta ocupado' });

  const space = await getAsync('SELECT price_cents FROM ad_spaces WHERE id = ?', [ad_space_id]);
  const isFree = space && space.price_cents === 0;
  const priceCents = isFree ? 0 : 3000;
  const days = 7;

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + days);

  const result = await runAsync(
    'INSERT INTO ads (client_id, ad_space_id, title, link, image_url, embed_code, video_url, status, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now","localtime"))',
    [client.id, ad_space_id, title || 'Anuncio rapido', link || '', image_url || '', embed_code || '', video_url || '', 'active', now.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
  );
  res.json({ id: result.lastID, price_cents: priceCents, total_days: days, end_date: endDate.toISOString().split('T')[0], is_free: isFree });
});

// ===== WHATSAPP BOT =====
app.get('/api/admin/whatsapp/status', requireAdmin, async (req, res) => {
  res.json(whatsappBot.getStatus());
});

app.post('/api/admin/whatsapp/disconnect', requireAdmin, async (req, res) => {
  await whatsappBot.stop();
  await new Promise(r => setTimeout(r, 1000));
  whatsappBot.start().catch(() => {});
  res.json({ ok: true });
});

// ===== RSS MONITOR =====
app.get('/api/admin/rss/sources', requireAdmin, async (req, res) => {
  const sources = await allAsync('SELECT * FROM rss_sources ORDER BY created_at DESC');
  res.json(sources);
});

app.post('/api/admin/rss/sources', requireAdmin, async (req, res) => {
  const { name, feed_url } = req.body;
  if (!name || !feed_url) return res.status(400).json({ error: 'Nome e URL do feed são obrigatórios' });

  // Valida se a URL realmente é um feed RSS
  const Parser = require('rss-parser');
  const parser = new Parser({ timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
  try {
    await parser.parseURL(feed_url);
  } catch (err) {
    const msg = err.message.toLowerCase();
    if (msg.includes('attribute without value') || msg.includes('not recognized') || msg.includes('status code 404')) {
      return res.status(400).json({
        error: 'URL invalida ou nao e um feed RSS.',
        hint: 'Cole o link do FEED RSS, nao do site. Ex: https://g1.globo.com/rss/g1/',
      });
    }
    return res.status(400).json({ error: 'Erro ao acessar o feed: ' + err.message });
  }

  const result = await runAsync(
    'INSERT INTO rss_sources (name, feed_url, active, created_at) VALUES (?, ?, 1, datetime("now","localtime"))',
    [name, feed_url]
  );
  res.json({ id: result.lastID });
});

app.put('/api/admin/rss/sources/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, feed_url, active } = req.body;
    await runAsync(
      'UPDATE rss_sources SET name = ?, feed_url = ?, active = ? WHERE id = ?',
      [name, feed_url, active ? 1 : 0, id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar fonte RSS: ' + err.message });
  }
});

app.delete('/api/admin/rss/sources/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM rss_fetched_articles WHERE source_id = ?', [id]);
    await runAsync('DELETE FROM rss_sources WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir fonte RSS: ' + err.message });
  }
});

app.get('/api/admin/rss/keywords', requireAdmin, async (req, res) => {
  const keywords = await allAsync('SELECT * FROM rss_keywords ORDER BY created_at DESC');
  res.json(keywords);
});

app.post('/api/admin/rss/keywords', requireAdmin, async (req, res) => {
  const { keyword } = req.body;
  if (!keyword) return res.status(400).json({ error: 'Palavra-chave é obrigatória' });
  const result = await runAsync(
    'INSERT INTO rss_keywords (keyword, active, created_at) VALUES (?, 1, datetime("now","localtime"))',
    [keyword.toLowerCase()]
  );
  res.json({ id: result.lastID });
});

app.put('/api/admin/rss/keywords/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { keyword, active } = req.body;
    await runAsync(
      'UPDATE rss_keywords SET keyword = ?, active = ? WHERE id = ?',
      [keyword.toLowerCase(), active ? 1 : 0, id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar palavra-chave: ' + err.message });
  }
});

app.delete('/api/admin/rss/keywords/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM rss_keywords WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir palavra-chave: ' + err.message });
  }
});

app.get('/api/admin/rss/config', requireAdmin, async (req, res) => {
  const config = await getAsync('SELECT * FROM rss_config WHERE id = 1');
  res.json(config || { check_interval_minutes: 10, whatsapp_active: 0 });
});

app.put('/api/admin/rss/config', requireAdmin, async (req, res) => {
  const { check_interval_minutes, whatsapp_active, whatsapp_phone } = req.body;
  await runAsync(
    `UPDATE rss_config SET check_interval_minutes = ?, whatsapp_active = ?, whatsapp_phone = ?, updated_at = datetime("now","localtime") WHERE id = 1`,
    [check_interval_minutes || 10, whatsapp_active ? 1 : 0, whatsapp_phone || '']
  );
  await rssMonitor.restart();
  res.json({ ok: true });
});

app.get('/api/admin/rss/articles', requireAdmin, async (req, res) => {
  const articles = await allAsync(`
    SELECT a.*, s.name AS source_name
    FROM rss_fetched_articles a
    LEFT JOIN rss_sources s ON a.source_id = s.id
    ORDER BY a.found_at DESC LIMIT 100
  `);
  res.json(articles);
});

app.delete('/api/admin/rss/articles', requireAdmin, async (req, res) => {
  await runAsync('DELETE FROM rss_fetched_articles');
  res.json({ ok: true, message: 'Todas as noticias limpas' });
});

app.post('/api/admin/rss/check', requireAdmin, async (req, res) => {
  try {
    const results = await rssMonitor.checkAll();
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.post('/api/admin/rss/test-whatsapp', requireAdmin, async (req, res) => {
  if (!whatsappBot.ready) {
    return res.status(400).json({ error: 'WhatsApp nao esta conectado. Escaneie o QR Code primeiro.' });
  }
  const config = await getAsync('SELECT * FROM rss_config WHERE id = 1');
  const phone = config?.whatsapp_phone;
  if (!phone) {
    return res.status(400).json({ error: 'Configure o telefone para receber alertas' });
  }
  try {
    await whatsappBot.sendMessage(phone, '🔔 TESTE - Monitor RSS\n\nSe voce recebeu esta mensagem, esta tudo funcionando!');
    res.json({ ok: true, message: 'Mensagem de teste enviada!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar: ' + err.message });
  }
});

// ===== AUTO-EXPIRACAO DE ANUNCIOS =====
async function expireAds() {
  try {
    const expired = await allAsync(
      "SELECT id, title FROM ads WHERE status = 'active' AND end_date IS NOT NULL AND end_date < date('now','localtime')"
    );
    if (expired.length > 0) {
      await runAsync(
        "UPDATE ads SET status = 'expired' WHERE status = 'active' AND end_date IS NOT NULL AND end_date < date('now','localtime')"
      );
      console.log(`[Auto-Expirar] ${expired.length} anuncio(s) expirado(s): ${expired.map(a => a.title).join(', ')}`);
    }
  } catch(e) {
    console.error('[Auto-Expirar] Erro:', e.message);
  }
}

async function activateScheduledAds() {
  try {
    const toActivate = await allAsync(
      "SELECT id, title FROM ads WHERE status = 'scheduled' AND start_date IS NOT NULL AND start_date <= date('now','localtime')"
    );
    if (toActivate.length > 0) {
      await runAsync(
        "UPDATE ads SET status = 'active' WHERE status = 'scheduled' AND start_date IS NOT NULL AND start_date <= date('now','localtime')"
      );
      console.log(`[Auto-Ativar] ${toActivate.length} anuncio(s) ativado(s): ${toActivate.map(a => a.title).join(', ')}`);
    }
  } catch(e) {
    console.error('[Auto-Ativar] Erro:', e.message);
  }
}

async function expireClientNews() {
  try {
    const expired = await allAsync(
      "SELECT id, title FROM news WHERE news_type = 'client' AND payment_status = 'paid' AND expires_at != '' AND expires_at < date('now','localtime')"
    );
    if (expired.length > 0) {
      await runAsync(
        "UPDATE news SET status = 'expired' WHERE news_type = 'client' AND payment_status = 'paid' AND expires_at != '' AND expires_at < date('now','localtime')"
      );
      console.log(`[Auto-Expirar] ${expired.length} noticia(s) do cliente expirada(s): ${expired.map(n => n.title).join(', ')}`);
    }
  } catch(e) {
    console.error('[Auto-Expirar Noticias] Erro:', e.message);
  }
}

async function expireReservations() {
  try {
    const expired = await allAsync(
      "SELECT id FROM reservations WHERE status = 'pending' AND created_at < datetime('now','localtime','-7 days')"
    );
    if (expired.length > 0) {
      await runAsync(
        "UPDATE reservations SET status = 'expired' WHERE status = 'pending' AND created_at < datetime('now','localtime','-7 days')"
      );
      console.log(`[Auto-Expirar] ${expired.length} reserva(s) pendente(s) expirada(s)`);
    }
  } catch(e) {
    console.error('[Auto-Expirar] Erro:', e.message);
  }
}

setInterval(() => {
  expireAds();
  activateScheduledAds();
  expireClientNews();
  expireReservations();
}, 3600000);

// ===== FORGOT PASSWORD =====
const crypto = require('crypto');
const resetTokens = {};

app.post('/api/forgot-password', resetLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obrigatorio' });
  const user = await getAsync('SELECT id, email FROM users WHERE email = ?', [email]);
  if (!user) return res.json({ ok: true, message: 'Se o email existir, voce recebera um link de redefinicao.' });
  const token = crypto.randomBytes(32).toString('hex');
  resetTokens[token] = { userId: user.id, expires: Date.now() + 3600000 };
  console.log(`[Reset] Token para ${email}: ${token}`);
  res.json({ ok: true, message: 'Link de redefinicao enviado! (Verifique o console do servidor)' });
});

app.post('/api/reset-password', resetLimiter, async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token e nova senha obrigatorios' });
  const data = resetTokens[token];
  if (!data || data.expires < Date.now()) return res.status(400).json({ error: 'Token invalido ou expirado' });
  const hash = bcrypt.hashSync(newPassword, 10);
  await runAsync('UPDATE users SET password_hash = ? WHERE id = ?', [hash, data.userId]);
  delete resetTokens[token];
  res.json({ ok: true, message: 'Senha redefinida com sucesso!' });
});

app.get('/api/admin/subscriptions/:id', requireAdmin, async (req, res) => {
  const sub = await getAsync(
    'SELECT s.*, u.name AS user_name, u.email FROM subscriptions s JOIN users u ON s.user_id = u.id WHERE s.id = ?',
    [req.params.id]
  );
  if (!sub) return res.status(404).json({ error: 'Assinatura nao encontrada' });
  res.json(sub);
});

app.put('/api/admin/subscriptions/:id', requireAdmin, async (req, res) => {
  const { status, expires_at } = req.body;
  await runAsync('UPDATE subscriptions SET status = ?, expires_at = ? WHERE id = ?', [status, expires_at, req.params.id]);
  res.json({ ok: true });
});

app.delete('/api/admin/subscriptions/:id', requireAdmin, async (req, res) => {
  await runAsync('DELETE FROM subscriptions WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.get('/api/client/subscription', requireClient, async (req, res) => {
  const sub = await getAsync(
    "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' AND expires_at >= date('now','localtime') ORDER BY expires_at DESC LIMIT 1",
    [req.session.userId]
  );
  res.json(sub || null);
});

app.post('/api/register-subscriber', async (req, res) => {
  const { name, city, phone, email, password } = req.body;
  if (!name || !city || !phone || !email || !password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
  }

  try {
    const existingUser = await getAsync('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const userResult = await runAsync(
      'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, datetime("now","localtime"))',
      [name, email, passwordHash, 'subscriber']
    );
    const userId = userResult.lastID;

    // Criar perfil em clients para que possamos enviar WhatsApp e salvar a cidade
    await runAsync(
      'INSERT INTO clients (user_id, company_name, phone, website, notes, city, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now","localtime"))',
      [userId, name, phone, '', 'Assinante cadastrado pelo site', city]
    );

    req.session.userId = userId;
    req.session.role = 'subscriber';

    res.json({ ok: true });
  } catch (err) {
    console.error('Error in register-subscriber:', err.message);
    res.status(500).json({ error: 'Erro no servidor ao cadastrar.' });
  }
});

app.post('/api/client/subscribe', requireAuth, async (req, res) => {
  const { payment_method, months, auto_renew } = req.body;
  const subMonths = Number(months) === 12 ? 12 : 1;
  const isAutoRenew = auto_renew ? 1 : 0;

  const cfg = await getAsync('SELECT subscription_price_cents, pix_key FROM payment_config WHERE id = 1');
  const monthly_cents = cfg?.subscription_price_cents !== undefined && cfg?.subscription_price_cents !== null ? cfg.subscription_price_cents : 399;
  const isFree = monthly_cents === 0;

  if (payment_method === 'pix' && !isFree) {
    if (!cfg || !cfg.pix_key || cfg.pix_key.trim() === '' || cfg.pix_key === 'Chave nao configurada') {
      return res.status(400).json({ error: 'O pagamento via PIX está indisponível (Chave PIX não configurada pelo administrador).' });
    }
  }

  // Plano anual (12 meses) tem desconto de 2 meses grátis (paga 10)
  let price_cents = monthly_cents;
  if (subMonths === 12) {
    price_cents = monthly_cents * 10;
  }

  const startedAt = new Date();
  const expiresAt = new Date(startedAt);
  expiresAt.setMonth(expiresAt.getMonth() + subMonths);

  await runAsync(
    "UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'",
    [req.session.userId]
  );
  const result = await runAsync(
    'INSERT INTO subscriptions (user_id, plan, price_cents, status, started_at, expires_at, payment_method, auto_renew, warning_sent, last_payment_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, datetime("now","localtime"))',
    [req.session.userId, subMonths === 12 ? 'yearly' : 'monthly', price_cents, 'active', startedAt.toISOString(), expiresAt.toISOString(), payment_method || 'pix', isAutoRenew, startedAt.toISOString()]
  );
  res.json({ id: result.lastID, expires_at: expiresAt.toISOString().split('T')[0] });
});

app.post('/api/client/subscription/cancel', requireAuth, async (req, res) => {
  await runAsync(
    "UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'",
    [req.session.userId]
  );
  res.json({ ok: true });
});

app.get('/api/client/is-subscriber', requireClient, async (req, res) => {
  const sub = await getAsync(
    "SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active' AND expires_at >= date('now','localtime')",
    [req.session.userId]
  );
  res.json({ isSubscriber: !!sub });
});

app.get('/api/is-subscriber', requireAuth, async (req, res) => {
  const sub = await getAsync(
    "SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active' AND expires_at >= date('now','localtime')",
    [req.session.userId]
  );
  res.json({ isSubscriber: !!sub });
});


// ===== USERS CRUD =====
app.get('/api/users', requireMaster, async (req, res) => {
  try {
    const users = await allAsync('SELECT id, name, email, role, created_at FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

app.post('/api/users', requireMaster, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Dados incompletos' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    await runAsync('INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, datetime("now","localtime"))', [name, email, hash, role]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar usuário. Email pode já existir.' });
  }
});

app.put('/api/users/:id', requireMaster, async (req, res) => {
  const { name, email, role, password } = req.body;
  try {
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      await runAsync('UPDATE users SET name=?, email=?, role=?, password_hash=? WHERE id=?', [name, email, role, hash, req.params.id]);
    } else {
      await runAsync('UPDATE users SET name=?, email=?, role=? WHERE id=?', [name, email, role, req.params.id]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

app.delete('/api/users/:id', requireMaster, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.session.userId) {
      return res.status(400).json({ error: 'Não pode apagar a si mesmo' });
    }
    await runAsync('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao apagar usuário' });
  }
});

// ===== SUBSCRIPTION EXPIRY WARNING JOB =====
async function checkExpiringSubscriptions() {
  try {
    // Buscar assinaturas ativas que vencem em 24h a 48h (amanhã), sem auto_renew, sem aviso enviado
    const expiringSoon = await allAsync(`
      SELECT s.id, s.user_id, s.expires_at, u.name AS user_name, c.phone 
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN clients c ON s.user_id = c.user_id
      WHERE s.status = 'active' 
        AND s.auto_renew = 0 
        AND s.warning_sent = 0
        AND date(s.expires_at) <= date('now', '+1 day', 'localtime')
    `);

    if (expiringSoon.length > 0) {
      console.log(`[SUBSCRIPTIONS WARNING] Encontradas ${expiringSoon.length} assinaturas vencendo amanhã.`);
      for (const sub of expiringSoon) {
        if (sub.phone) {
          const cleanNumber = sub.phone.replace(/\D/g, '');
          if (cleanNumber) {
            const formattedDate = new Date(sub.expires_at).toLocaleDateString('pt-BR');
            const message = `Olá, *${sub.user_name}*! Passando para lembrar que sua assinatura expira amanhã, dia *${formattedDate}*. Acesse o site do portal para efetuar a renovação e não perder o acesso!`;
            
            try {
              if (whatsappBot.clientReady) {
                await whatsappBot.sendMessage(cleanNumber, message);
                console.log(`[SUBSCRIPTIONS WARNING] Alerta de expiração enviado para ${sub.user_name} (${cleanNumber})`);
              } else {
                console.warn(`[SUBSCRIPTIONS WARNING] Bot do WhatsApp não está conectado. Alerta não enviado para ${sub.user_name}`);
              }
            } catch (sendErr) {
              console.error(`[SUBSCRIPTIONS WARNING] Falha ao enviar mensagem para ${cleanNumber}:`, sendErr.message);
            }
          }
        }
        await runAsync('UPDATE subscriptions SET warning_sent = 1 WHERE id = ?', [sub.id]);
      }
    }
  } catch (err) {
    console.error('[SUBSCRIPTIONS WARNING] Erro no job de alerta de expiração:', err.message);
  }
}

// ===== START =====
const PORT = process.env.PORT || 3002;

ensureAdminUser().then(async () => {
  await rssMonitor.start();
  await activateScheduledAds();
  await expireAds();
  await expireClientNews();
  
  // Iniciar job de alertas de vencimento de assinaturas
  checkExpiringSubscriptions();
  setInterval(checkExpiringSubscriptions, 12 * 60 * 60 * 1000); // Executar a cada 12 horas

  whatsappBot.start().catch(err => console.error('WhatsApp bot start error:', err.message));
  app.listen(PORT, () => {
    console.log(`Servidor iniciado em http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Erro ao iniciar servidor:', err);
  process.exit(1);
});
