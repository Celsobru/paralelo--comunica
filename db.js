const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    company_name TEXT,
    phone TEXT,
    website TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT DEFAULT '',
    description TEXT NOT NULL,
    full_content TEXT DEFAULT '',
    image_url TEXT,
    source TEXT,
    datetime TEXT,
    status TEXT NOT NULL DEFAULT 'published',
    author_id INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY(author_id) REFERENCES users(id)
  )`);

  db.all('PRAGMA table_info(news)', (err, cols) => {
    if (!err && cols && !cols.some(c => c.name === 'subcategory')) {
      db.run('ALTER TABLE news ADD COLUMN subcategory TEXT DEFAULT \'\'');
    }
  });

  db.all('PRAGMA table_info(clients)', (err, cols) => {
    if (!err && cols && !cols.some(c => c.name === 'city')) {
      db.run('ALTER TABLE clients ADD COLUMN city TEXT DEFAULT \'\'');
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS ad_spaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    width TEXT,
    height TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    ad_space_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    link TEXT,
    image_url TEXT,
    embed_code TEXT,
    video_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    start_date TEXT,
    end_date TEXT,
    reservation_id INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY(client_id) REFERENCES clients(id),
    FOREIGN KEY(ad_space_id) REFERENCES ad_spaces(id),
    FOREIGN KEY(reservation_id) REFERENCES reservations(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    payment_method TEXT,
    last_payment_date TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.all('PRAGMA table_info(subscriptions)', (err, cols) => {
    if (!err && cols) {
      if (!cols.some(c => c.name === 'auto_renew')) {
        db.run("ALTER TABLE subscriptions ADD COLUMN auto_renew INTEGER DEFAULT 0");
      }
      if (!cols.some(c => c.name === 'warning_sent')) {
        db.run("ALTER TABLE subscriptions ADD COLUMN warning_sent INTEGER DEFAULT 0");
      }
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    audience TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    sent_at TEXT,
    created_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS site_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_visitors INTEGER NOT NULL DEFAULT 0,
    online_max INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT
  )`);

  db.run(`ALTER TABLE news ADD COLUMN full_content TEXT DEFAULT ''`, () => {});
  db.run(`ALTER TABLE news ADD COLUMN ad_space_id INTEGER DEFAULT NULL`, () => {});
  db.run(`ALTER TABLE news ADD COLUMN video_url TEXT DEFAULT ''`, () => {});
  db.run(`ALTER TABLE news ADD COLUMN news_type TEXT DEFAULT 'admin'`, () => {});
  db.run(`ALTER TABLE news ADD COLUMN price_cents INTEGER DEFAULT 0`, () => {});
  db.run(`ALTER TABLE news ADD COLUMN payment_status TEXT DEFAULT 'paid'`, () => {});
  db.run(`ALTER TABLE news ADD COLUMN duration_days INTEGER DEFAULT 0`, () => {});
  db.run(`ALTER TABLE news ADD COLUMN expires_at TEXT DEFAULT ''`, () => {});
  db.run(`ALTER TABLE ads ADD COLUMN video_url TEXT DEFAULT ''`, () => {});

  db.run(`CREATE TABLE IF NOT EXISTS rss_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    feed_url TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS rss_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS rss_fetched_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER,
    guid TEXT UNIQUE,
    title TEXT,
    link TEXT,
    published_at TEXT,
    matched_keywords TEXT,
    alert_sent INTEGER NOT NULL DEFAULT 0,
    found_at TEXT NOT NULL,
    FOREIGN KEY(source_id) REFERENCES rss_sources(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS rss_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    check_interval_minutes INTEGER NOT NULL DEFAULT 10,
    whatsapp_active INTEGER NOT NULL DEFAULT 0,
    whatsapp_phone TEXT,
    updated_at TEXT
  )`);

  db.get('SELECT id FROM rss_config WHERE id = 1', (err, row) => {
    if (!err && !row) {
      db.run('INSERT INTO rss_config (id, check_interval_minutes, whatsapp_active, updated_at) VALUES (1, 10, 0, datetime("now","localtime"))');
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS payment_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    pix_key TEXT DEFAULT '',
    pix_name TEXT DEFAULT '',
    pix_city TEXT DEFAULT '',
    bank_name TEXT DEFAULT '',
    bank_agency TEXT DEFAULT '',
    bank_account TEXT DEFAULT '',
    bank_cpf TEXT DEFAULT '',
    company_name TEXT DEFAULT '',
    subscription_price_cents INTEGER DEFAULT 399,
    updated_at TEXT
  )`);

  db.get('SELECT id FROM payment_config WHERE id = 1', (err, row) => {
    if (!err && !row) {
      db.run('INSERT INTO payment_config (id, pix_key, pix_name, subscription_price_cents, updated_at) VALUES (1, \'\', \'\', 399, datetime("now","localtime"))');
    }
  });

  db.all('PRAGMA table_info(payment_config)', (err, cols) => {
    if (!err && cols && !cols.some(c => c.name === 'subscription_price_cents')) {
      db.run('ALTER TABLE payment_config ADD COLUMN subscription_price_cents INTEGER DEFAULT 399');
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS site_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    site_name TEXT DEFAULT 'Paralelo Comunica',
    site_slogan TEXT DEFAULT 'O seu portal de notícias',
    site_description TEXT DEFAULT 'O seu portal de notícias com conteúdo atualizado e reportagem 24 horas do Brasil e do Mundo.',
    footer_categories TEXT DEFAULT 'Politica,Economia,Esportes,Tecnologia',
    inst_sobre TEXT DEFAULT '#',
    inst_contato TEXT DEFAULT '#',
    inst_anuncie TEXT DEFAULT '#',
    inst_privacidade TEXT DEFAULT '#',
    social_instagram TEXT DEFAULT '#',
    social_twitter TEXT DEFAULT '#',
    social_facebook TEXT DEFAULT '#',
    social_youtube TEXT DEFAULT '#',
    copyright TEXT DEFAULT '2026 Paralelo Comunica. Todos os direitos reservados.',
    updated_at TEXT
  )`);

  db.get('SELECT id FROM site_config WHERE id = 1', (err, row) => {
    if (!err && !row) {
      db.run(`INSERT INTO site_config (id, updated_at) VALUES (1, datetime("now","localtime"))`);
    }
  });

  db.all('PRAGMA table_info(site_config)', (err, cols) => {
    if (!err && cols) {
      if (!cols.some(c => c.name === 'site_slogan')) {
        db.run('ALTER TABLE site_config ADD COLUMN site_slogan TEXT DEFAULT \'O seu portal de notícias\'');
      }
      if (!cols.some(c => c.name === 'live_status')) {
        db.run('ALTER TABLE site_config ADD COLUMN live_status TEXT DEFAULT \'auto\'');
      }
      if (!cols.some(c => c.name === 'live_youtube_channel_id')) {
        db.run('ALTER TABLE site_config ADD COLUMN live_youtube_channel_id TEXT DEFAULT \'\'');
      }
      if (!cols.some(c => c.name === 'live_video_url')) {
        db.run('ALTER TABLE site_config ADD COLUMN live_video_url TEXT DEFAULT \'\'');
      }
      if (!cols.some(c => c.name === 'live_title')) {
        db.run('ALTER TABLE site_config ADD COLUMN live_title TEXT DEFAULT \'Transmissão Ao Vivo\'');
      }
      if (!cols.some(c => c.name === 'nav_items')) {
        const defaultNav = JSON.stringify([
          { label: 'Politica', url: '/?category=Politica' },
          { label: 'Economia', url: '/?category=Economia' },
          { label: 'Nacional', url: '/?category=Nacional' },
          { label: 'Internacional', url: '/?category=Internacional' },
          { label: 'Esportes', url: '/?category=Esportes' },
          { label: 'Tecnologia', url: '/?category=Tecnologia' },
          { label: 'Saude', url: '/?category=Saude' },
          { label: 'Entretenimento', url: '/?category=Entretenimento' },
          { label: '', url: '' },
          { label: '', url: '' },
          { label: '', url: '' },
          { label: '', url: '' }
        ]);
        db.run(`ALTER TABLE site_config ADD COLUMN nav_items TEXT DEFAULT '${defaultNav}'`);
      }
      if (!cols.some(c => c.name === 'whatsapp_template')) {
        db.run("ALTER TABLE site_config ADD COLUMN whatsapp_template TEXT DEFAULT ''");
      }
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    updated_at TEXT
  )`);

  const defaultPages = ['sobre', 'contato', 'anuncie', 'privacidade'];
  defaultPages.forEach(slug => {
    db.get('SELECT id FROM pages WHERE slug = ?', [slug], (err, row) => {
      if (!err && !row) {
        db.run('INSERT INTO pages (slug, title, content, updated_at) VALUES (?, ?, ?, datetime("now","localtime"))', [slug, '', '']);
      }
    });
  });

  db.run(`CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    ad_space_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    total_days INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT DEFAULT '',
    payment_proof TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY(client_id) REFERENCES clients(id),
    FOREIGN KEY(ad_space_id) REFERENCES ad_spaces(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS news_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    price_per_day_cents INTEGER DEFAULT 1000,
    min_days INTEGER DEFAULT 2,
    max_days INTEGER DEFAULT 10,
    updated_at TEXT
  )`);

  db.get('SELECT id FROM news_config WHERE id = 1', (err, row) => {
    if (!err && !row) {
      db.run('INSERT INTO news_config (id, price_per_day_cents, min_days, max_days, updated_at) VALUES (1, 1000, 2, 10, datetime("now","localtime"))');
    }
  });

  db.get('SELECT id FROM site_stats WHERE id = 1', (err, row) => {
    if (!err && !row) {
      db.run('INSERT INTO site_stats (id, total_visitors, online_max, updated_at) VALUES (1, 12847, 340, datetime("now","localtime"))');
      console.log('site_stats inicializado com valores padrao.');
    }
  });

  db.get('SELECT COUNT(*) AS cnt FROM ad_spaces', (err, row) => {
    if (!err && row && row.cnt === 0) {
      const defaultSpaces = [
        ['Banner Topo', 'header', 'Banner principal entre a navegação e o conteúdo (728x90)', 50000, '728px', '90px'],
        ['Sidebar Superior', 'sidebar-top', 'Espaço lateral superior ao lado das notícias (300x250)', 35000, '300px', '250px'],
        ['Sidebar Inferior', 'sidebar-bottom', 'Espaço lateral inferior ao lado das notícias (300x250)', 30000, '300px', '250px'],
        ['Entre Matérias', 'in-feed', 'Banner entre as matérias da página principal (728x90)', 40000, '728px', '90px'],
        ['Rodapé', 'footer', 'Banner inferior antes do rodapé do site (728x90)', 25000, '728px', '90px'],
        ['Acima da Matéria', 'article-top', 'Anúncio acima do conteúdo da notícia completa (728x90)', 45000, '728px', '90px'],
        ['Abaixo da Matéria', 'article-bottom', 'Anúncio abaixo do conteúdo da notícia completa (728x90)', 35000, '728px', '90px'],
      ];
      const stmt = db.prepare(
        'INSERT INTO ad_spaces (name, position, description, price_cents, width, height, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, datetime("now","localtime"))'
      );
      defaultSpaces.forEach(s => stmt.run(...s));
      stmt.finalize();
      console.log('Espaços de anúncio padrão CNN criados.');
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  )`);

  db.get('SELECT COUNT(*) AS cnt FROM categories', (err, row) => {
    if (!err && row && row.cnt === 0) {
      const defaultCats = [
        'Política', 'Economia', 'Nacional', 'Internacional',
        'Esportes', 'Tecnologia', 'Saúde', 'Entretenimento'
      ];
      const stmt = db.prepare('INSERT INTO categories (name, sort_order, created_at) VALUES (?, ?, datetime("now","localtime"))');
      defaultCats.forEach((cat, idx) => stmt.run(cat, idx + 1));
      stmt.finalize();
      console.log('Categorias padrão do Paralelo semeadas.');
    }
  });

  db.get('SELECT COUNT(*) AS cnt FROM news', (err, row) => {
    if (!err && row && row.cnt === 0) {
      const defaultNews = [
        ['Novo pacote econômico é anunciado pelo governo federal', 'Política', 'Medidas visam ampliar investimentos em infraestrutura e reduzir juros para pessoas físicas e empresas do setor produtivo.', 'O governo federal anunciou nesta terça-feira um novo pacote econômico que promete transformar o cenário de investimentos do país. As medidas incluem a criação de um fundo de R$ 50 bilhões para infraestrutura, redução da taxa Selic para empresas do setor produtivo e incentivos fiscais para construção civil.\n\nSegundo o Ministério da Economia, as novas regras devem gerar mais de 2 milhões de empregos diretos nos próximos dois anos. "Estamos focados em devolver o Brasil ao crescimento sustentável", declarou o ministro.\n\nOs analistas de mercado reagiram com cautela, mas de forma positiva. Para o economista-chefe do Banco XP, as medidas são um passo importante, mas precisam ser acompanhadas de reformas estruturais.', 'https://images.unsplash.com/photo-1529400971008-f566de0e6dfc?auto=format&fit=crop&w=800&q=80', 'Paralelo Comunica', 'há 12 minutos'],
        ['Seleção amplia preparação para a Copa América com jogos-treino', 'Esportes', 'Treinos presenciais começam com foco em velocidade e finalização dentro da concentração em Teresópolis.', 'A seleção brasileira deu início aos treinos presenciais na concentração de Teresópolis com o foco total na Copa América. O técnico escalou os jogadores para sessões intensivas de tática e preparação física.\n\nDestaques para a presença de jogadores jovens que estão sendo testados pela primeira vez. O atacante do Palmeiras e o meia do Flamengo se destacaram nos primeiros treinos.\n\nA seleção disputará dois jogos-treino antes do início oficial do torneio, contra seleções sul-americanas.', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80', 'Paralelo Comunica', 'há 28 minutos'],
        ['Novas regulamentações para redes sociais entram em vigor no país', 'Tecnologia', 'Empresas precisarão oferecer transparência total sobre anúncios políticos e uso de dados pessoais dos usuários.', 'A partir de hoje, entram em vigor as novas regulamentações para plataformas de redes sociais no Brasil. As empresas terão 90 dias para se adequar às novas regras.\n\nEntre as principais exigências estão: transparência total sobre algoritmos de recomendação, obrigação de remover conteúdo falso em até 24 horas após denúncia, e prestação de contas sobre anúncios políticos.\n\nA multa para descumprimento pode chegar a 10% do faturamento da empresa no Brasil.', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80', 'Paralelo Comunica', 'há 45 minutos'],
        ['Banco Central mantém taxa Selic e sinaliza ajustes futuros', 'Economia', 'Comitê de Política Monetária decide por manter os juros em 10,75% ao ano e avalia cenário inflacionário.', 'O Comitê de Política Monetária (COPOM) do Banco Central decidiu, por unanimidade, manter a taxa Selic em 10,75% ao ano. A decisão vinha sendo esperada pelo mercado.\n\nNa ata da reunião, o COPOM sinalizou que pode iniciar um ciclo de cortes de juros já na próxima reunião, caso a inflação continue em trajetória de queda. O IPCA acumulado dos últimos 12 meses fechou em 4,2%, abaixo da meta de 4,5%.\n\nAnalistas veem a decisão como um sinal de cautela do banco central, que prefere aguardar mais dados antes de alterar os juros.', 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80', 'Paralelo Comunica', 'há 1 hora'],
        ['Operação policial desmonta esquema de desvio de verbas públicas', 'Nacional', 'Investigação durou 8 meses e envolveu órgãos federais e estaduais em cinco estados brasileiros.', 'Uma grande operação policial deflagrada nesta madrugada desmontou um esquema de desvio de verbas públicas que atingia cinco estados brasileiros. Foram cumpridos 45 mandados de busca e apreensão.\n\nA investigação, que durou 8 meses, revelou que empresas fantasmas recebiam contratos públicos de construção civil e emitiam notas fiscais frias para desviar recursos.\n\nO prejuízo estimado para os cofres públicos é de R$ 120 milhões. Dez pessoas foram presas, incluindo dois ex-prefeitos e um deputado estadual.', 'https://images.unsplash.com/photo-1589994965851-a8f479c573a9?auto=format&fit=crop&w=800&q=80', 'Paralelo Comunica', 'há 2 horas'],
        ['Cúpula global sobre clima aprova novas metas de redução de carbono', 'Internacional', 'Líderes de 190 países se comprometem a reduzir emissões em 40% até 2035 com investimentos verdes.', 'A cúpula global sobre clima, realizada em Genebra, aprovou na madrugada de hoje novas metas ambiciosas de redução de emissões de carbono. 190 países assinaram o acordo histórico.\n\nO compromisso é reduzir as emissões globais em 40% até 2035, com investimentos de US$ 2 trilhões em energias renováveis. O Brasil se comprometeu a eliminar o desmatamento ilegal até 2030.\n\nO acordo ainda prevê a criação de um fundo de US$ 500 bilhões para ajudar países em desenvolvimento na transição energética.', 'https://images.unsplash.com/photo-1569163139394-de4e4f43e4e3?auto=format&fit=crop&w=800&q=80', 'Paralelo Comunica', 'há 3 horas'],
        ['Campanha nacional de vacinação atinge recorde de adesão', 'Saúde', 'Mais de 80% da população-alvo já tomou a primeira dose da vacina contra a gripe em 2026.', 'O Ministério da Saúde informou que a campanha nacional de vacinação contra a gripe já atingiu 82% da população-alvo, um recorde histórico. São mais de 160 milhões de doses aplicadas.\n\nO sucesso da campanha é atribuído à ampliação da rede de postos de vacinação e à campanha de conscientização nas redes sociais. Pharmácias e supermercados também foram autorizados a aplicar a vacina.\n\nO pico de demanda é esperado nas próximas duas semanas, com a previsão de atingir 90% da meta até o final do mês.', 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=800&q=80', 'Paralelo Comunica', 'há 4 horas'],
        ['Festival de Cinema Brasileiro anuncia Seleção Oficial 2026', 'Entretenimento', 'Produções independentes de 12 estados competem pelo prêmio de melhor filme no evento que acontece em SP.', 'O Festival de Cinema Brasileiro de São Paulo anunciou a Seleção Oficial desta edição. 24 filmes de 12 estados competem pelo prêmio de melhor longa-metragem.\n\nEntre os favoritos estão produções independentes que já conquistaram prêmios em festivais internacionais. O destaque vai para um filme documentário sobre a cultura nordestina.\n\nO festival acontece entre os dias 10 e 20 de março, com sessões gratuitas em 5 cinemas da cidade. A premiação total ultrapassa R$ 500 mil.', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80', 'Paralelo Comunica', 'há 5 horas'],
      ];
      const stmt = db.prepare(
        'INSERT INTO news (title, category, description, full_content, image_url, source, datetime, status, author_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, \'published\', NULL, datetime("now","localtime"))'
      );
      defaultNews.forEach(n => stmt.run(...n));
      stmt.finalize();
      console.log('Notícias padrão semeadas no banco.');
    }
  });
});

module.exports = {
  db,
  runAsync,
  getAsync,
  allAsync,
};
