/* ============================================================
   INSTAGRAM - Publicacao automatica de noticias
   Usa a API OFICIAL do Instagram (Instagram Login)
   Host padrao: https://graph.instagram.com  (tambem funciona
   com graph.facebook.com se usar Facebook Login - basta trocar
   o api_base na configuracao).

   Fluxo de publicacao:
     1) cria "container" (POST /{ig-user-id}/media)
     2) publica o container (POST /{ig-user-id}/media_publish)

   Imagem: fica no NOSSO servidor; o Instagram apenas "puxa" a
   imagem pela URL publica (https). Carga minima no servidor.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { runAsync, getAsync } = require('./db');

const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

let _defaultBase = '';
function setDefaultBase(base) { _defaultBase = String(base || '').replace(/\/+$/, ''); }
function defaultBase() { return _defaultBase || process.env.PUBLIC_URL || ''; }

const FIELDS = ['ig_user_id', 'access_token', 'api_base', 'api_version', 'enabled', 'auto_post', 'include_link', 'default_hashtags', 'public_url', 'token_expires_at'];
const DEFAULTS = {
  id: 1, ig_user_id: '', access_token: '',
  api_base: 'https://graph.instagram.com', api_version: 'v21.0',
  enabled: 0, auto_post: 0, include_link: 1, default_hashtags: '',
  public_url: '', token_expires_at: '',
};

async function getConfig() {
  const c = await getAsync('SELECT * FROM instagram_config WHERE id = 1');
  return Object.assign({}, DEFAULTS, c || {});
}

async function saveConfig(patch) {
  const cur = await getConfig();
  const next = Object.assign({}, cur, patch || {});
  const vals = FIELDS.map(f => next[f]);
  const exists = await getAsync('SELECT id FROM instagram_config WHERE id = 1');
  if (exists) {
    await runAsync(`UPDATE instagram_config SET ${FIELDS.map(f => f + '=?').join(',')}, updated_at=datetime('now','localtime') WHERE id = 1`, vals);
  } else {
    await runAsync(`INSERT INTO instagram_config (id, ${FIELDS.join(',')}, updated_at) VALUES (1, ${FIELDS.map(() => '?').join(',')}, datetime('now','localtime'))`, vals);
  }
  return getConfig();
}

function publicBase(cfg) { return String((cfg && cfg.public_url) || defaultBase() || '').replace(/\/+$/, ''); }

function toPublicUrl(rel, cfg) {
  if (!rel) return '';
  if (/^https?:\/\//i.test(rel)) return rel;
  const base = publicBase(cfg);
  if (!base) return '';
  return base + (String(rel).charAt(0) === '/' ? rel : '/' + rel);
}

function relToLocal(rel) {
  if (!rel) return '';
  let p = String(rel);
  if (/^https?:\/\//i.test(p)) {
    try { p = new URL(p).pathname; } catch (e) { return ''; }
  }
  p = p.replace(/^\/+/, '');
  if (p.indexOf('uploads/') !== 0) return '';
  const name = p.slice('uploads/'.length);
  if (!name || name.indexOf('..') !== -1 || name.indexOf('/') !== -1) return '';
  return path.join(UPLOAD_DIR, name);
}

function normalizeTags(raw, category) {
  const set = new Set();
  const add = (t) => {
    t = String(t || '').trim().replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '');
    if (t) set.add('#' + t);
  };
  String(raw || '').split(/[\s,;]+/).forEach(add);
  if (category) add(category);
  return Array.from(set).join(' ');
}

function buildCaption(news, cfg) {
  const parts = [];
  const title = String(news.title || '').trim();
  const desc = String(news.description || '').trim();
  if (title) parts.push(title);
  if (desc) parts.push(desc);
  if (cfg.include_link && news.id) {
    const base = publicBase(cfg);
    if (base) parts.push('📰 Leia a matéria completa: ' + base + '/noticia.html?news=' + news.id);
  }
  const tags = normalizeTags(cfg.default_hashtags, news.category);
  if (tags) parts.push(tags);
  let cap = parts.join('\n\n').trim();
  if (cap.length > 2200) cap = cap.slice(0, 2197).trim() + '...';
  return cap;
}

/* ---------- conversao de imagem p/ JPG (Instagram exige JPEG) ---------- */
let _sharp = null, _sharpTried = false;
function getSharp() {
  if (_sharpTried) return _sharp;
  _sharpTried = true;
  try { _sharp = require('sharp'); } catch (e) { _sharp = null; }
  return _sharp;
}

async function toInstagramJpeg(localPath) {
  const sharp = getSharp();
  if (!sharp) return '';
  // orienta pela EXIF e obtem dimensoes finais
  const oriented = await sharp(localPath).rotate().toBuffer({ resolveWithObject: true });
  const W = oriented.info.width, H = oriented.info.height;
  if (!W || !H) throw new Error('Nao consegui ler a imagem');
  // Instagram aceita proporcao entre 4:5 (0.8) e 1.91:1 -> corta o excedente
  let cw = W, ch = H, cx = 0, cy = 0;
  const ratio = W / H;
  if (ratio > 1.91) { cw = Math.round(H * 1.91); cx = Math.round((W - cw) / 2); }
  else if (ratio < 0.8) { ch = Math.round(W / 0.8); cy = Math.round((H - ch) / 2); }
  const outName = 'ig-' + Date.now() + '-' + Math.round(Math.random() * 1e6) + '.jpg';
  await sharp(oriented.data)
    .extract({ left: cx, top: cy, width: cw, height: ch })
    .resize({ width: 1440, withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toFile(path.join(UPLOAD_DIR, outName));
  return outName;
}

function cleanupTemp() {
  try {
    const now = Date.now();
    fs.readdirSync(UPLOAD_DIR).forEach((f) => {
      if (f.indexOf('ig-') === 0 && /\.jpg$/i.test(f)) {
        const p = path.join(UPLOAD_DIR, f);
        try { if (now - fs.statSync(p).mtimeMs > 2 * 24 * 3600 * 1000) fs.unlinkSync(p); } catch (e) {}
      }
    });
  } catch (e) {}
}

/* ---------- API ---------- */
function apiUrl(cfg, p) {
  const base = String(cfg.api_base || 'https://graph.instagram.com').replace(/\/+$/, '');
  const ver = cfg.api_version || 'v21.0';
  return base + '/' + ver + '/' + String(p).replace(/^\/+/, '');
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function createContainer(cfg, params) {
  const url = apiUrl(cfg, cfg.ig_user_id + '/media');
  const body = new URLSearchParams(Object.assign({ access_token: cfg.access_token }, params)).toString();
  const r = await axios.post(url, body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 120000 });
  if (!r.data || !r.data.id) throw new Error('Resposta inesperada do Instagram: ' + JSON.stringify(r.data));
  return r.data.id;
}

async function publishContainer(cfg, creationId) {
  const url = apiUrl(cfg, cfg.ig_user_id + '/media_publish');
  const body = new URLSearchParams({ creation_id: creationId, access_token: cfg.access_token }).toString();
  const r = await axios.post(url, body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 120000 });
  return r.data.id;
}

async function containerStatus(cfg, id) {
  const r = await axios.get(apiUrl(cfg, id), { params: { fields: 'status_code,status', access_token: cfg.access_token }, timeout: 60000 });
  return r.data || {};
}

async function getPermalink(cfg, id) {
  try {
    const r = await axios.get(apiUrl(cfg, id), { params: { fields: 'permalink', access_token: cfg.access_token }, timeout: 30000 });
    return (r.data && r.data.permalink) || '';
  } catch (e) { return ''; }
}

function igError(e) {
  const d = e && e.response && e.response.data;
  if (d && d.error) return d.error.message + (d.error.code ? ' (code ' + d.error.code + ')' : '');
  return (e && e.message) || String(e);
}

async function getMe(cfg) {
  const c = cfg || await getConfig();
  const r = await axios.get(apiUrl(c, 'me'), { params: { fields: 'user_id,username,name,account_type', access_token: c.access_token }, timeout: 30000 });
  return r.data;
}

async function publishImage(cfg, imageRel, caption) {
  let publicUrl = toPublicUrl(imageRel, cfg);
  if (!publicUrl) throw new Error('Imagem da notícia não encontrada ou URL pública não configurada.');
  const local = relToLocal(imageRel);
  if (local && fs.existsSync(local)) {
    try {
      const jpg = await toInstagramJpeg(local);
      if (jpg) publicUrl = toPublicUrl('/uploads/' + jpg, cfg);
    } catch (e) { console.error('[instagram] conversão p/ JPG falhou:', e.message); }
  }
  const creationId = await createContainer(cfg, { image_url: publicUrl, caption });
  await sleep(2000);
  return publishContainer(cfg, creationId);
}

async function publishReel(cfg, videoRel, caption) {
  const publicUrl = toPublicUrl(videoRel, cfg);
  if (!publicUrl) throw new Error('Vídeo da notícia não encontrado ou URL pública não configurada.');
  const creationId = await createContainer(cfg, { media_type: 'REELS', video_url: publicUrl, caption, share_to_feed: 'true' });
  for (let i = 0; i < 60; i++) {
    const st = await containerStatus(cfg, creationId);
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR') throw new Error('Instagram rejeitou o vídeo: ' + (st.status || 'erro'));
    if (i === 59) throw new Error('Tempo esgotado processando o vídeo no Instagram.');
    await sleep(10000);
  }
  return publishContainer(cfg, creationId);
}

async function publishNews(news, opts) {
  opts = opts || {};
  const cfg = await getConfig();
  if (!cfg.access_token || !cfg.ig_user_id) throw new Error('Configure o token e o ID da conta do Instagram.');
  const caption = opts.caption || buildCaption(news, cfg);
  const isVideoFile = news.video_url && /\.(mp4|mov)(\?|$)/i.test(news.video_url);
  const mediaType = isVideoFile ? 'REELS' : 'IMAGE';
  const ins = await runAsync(
    'INSERT INTO instagram_posts (news_id, media_type, status, caption, created_at) VALUES (?,?,?,?,datetime("now","localtime"))',
    [news.id || null, mediaType, 'pending', caption]
  );
  const logId = ins.lastID;
  try {
    let mediaId;
    if (mediaType === 'REELS') {
      mediaId = await publishReel(cfg, news.video_url, caption);
    } else {
      if (!news.image_url) throw new Error('A notícia não tem imagem. Adicione uma imagem (JPG) para postar no Instagram.');
      mediaId = await publishImage(cfg, news.image_url, caption);
    }
    const permalink = await getPermalink(cfg, mediaId);
    await runAsync('UPDATE instagram_posts SET status=?, ig_media_id=?, permalink=?, error=? WHERE id=?', ['published', String(mediaId), permalink, '', logId]);
    return { ok: true, id: mediaId, permalink, media_type: mediaType };
  } catch (e) {
    const msg = igError(e);
    await runAsync('UPDATE instagram_posts SET status=?, error=? WHERE id=?', ['failed', String(msg).slice(0, 500), logId]);
    throw new Error(msg);
  }
}

async function refreshToken() {
  const cfg = await getConfig();
  if (!cfg.access_token) return null;
  const r = await axios.get('https://graph.instagram.com/refresh_access_token', {
    params: { grant_type: 'ig_refresh_token', access_token: cfg.access_token }, timeout: 30000,
  });
  return r.data;
}

let _timer = null;
function startWorker() {
  const run = async () => {
    try {
      cleanupTemp();
      const cfg = await getConfig();
      if (cfg.enabled && cfg.access_token) {
        const r = await refreshToken();
        if (r && r.access_token) {
          const days = Math.round((r.expires_in || 5184000) / 86400);
          await saveConfig({ access_token: r.access_token, token_expires_at: new Date(Date.now() + (r.expires_in || 5184000) * 1000).toISOString() });
          console.log('[instagram] token renovado por mais ' + days + ' dias');
        }
      }
    } catch (e) { console.error('[instagram] renovação de token falhou:', igError(e)); }
  };
  run();
  if (_timer) clearInterval(_timer);
  _timer = setInterval(run, 30 * 24 * 60 * 60 * 1000);
  console.log('[instagram] worker iniciado');
}

module.exports = {
  getConfig, saveConfig, setDefaultBase, defaultBase,
  buildCaption, normalizeTags, toPublicUrl, relToLocal,
  publishNews, publishImage, publishReel, getMe, refreshToken, startWorker, igError,
};
