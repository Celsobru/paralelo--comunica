const sectionTitles = {
  dashboard: 'Dashboard',
  news: 'Gerenciar Notícias',
  categories: 'Gerenciar Categorias',
  clients: 'Gerenciar Clientes',
  adspaces: 'Espaços de Anúncio',
  ads: 'Gerenciar Anúncios',
  analytics: 'Visitas & Métricas de Audiência',
  financial: 'Termômetro & Painel Financeiro',
  notifications: 'Notificações',
  rssmonitor: 'RSS Monitor',
  payments: 'Configuração de Pagamento',
  reservations: 'Reservas',
  newsconfig: 'Configuração de Notícias',
  siteconfig: 'Configurações do Site',
  pages: 'Páginas Institucionais',
  subscribers: 'Assinantes',
  users: 'Usuários',
};

const sections = {
  dashboard: document.getElementById('section-dashboard'),
  news: document.getElementById('section-news'),
  categories: document.getElementById('section-categories'),
  clients: document.getElementById('section-clients'),
  adspaces: document.getElementById('section-adspaces'),
  ads: document.getElementById('section-ads'),
  analytics: document.getElementById('section-analytics'),
  financial: document.getElementById('section-financial'),
  notifications: document.getElementById('section-notifications'),
  rssmonitor: document.getElementById('section-rssmonitor'),
  payments: document.getElementById('section-payments'),
  reservations: document.getElementById('section-reservations'),
  newsconfig: document.getElementById('section-newsconfig'),
  siteconfig: document.getElementById('section-siteconfig'),
  pages: document.getElementById('section-pages'),
  subscribers: document.getElementById('section-subscribers'),
  users: document.getElementById('section-users'),
};

const navItems = document.querySelectorAll('.sidebar-nav-item[data-section]');
const pageTitle = document.getElementById('page-title');
let currentUserRole = "admin";


function showSection(name) {
  Object.values(sections).forEach(s => {
    if (s) s.classList.add('hidden');
  });
  if (sections[name]) sections[name].classList.remove('hidden');
  navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.section === name);
  });
  pageTitle.textContent = sectionTitles[name] || name;
  if (name === 'pages') loadPagesSection();
  if (name === 'analytics') loadAnalyticsSection();
  if (name === 'financial') loadFinancialSection();
}

navItems.forEach(item => {
  item.addEventListener('click', () => showSection(item.dataset.section));
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Erro na requisição');
  }
  return response.json();
}

function badgeForStatus(status) {
  const map = {
    published: 'badge-active',
    active: 'badge-active',
    available: 'badge-active',
    draft: 'badge-draft',
    paused: 'badge-paused',
    inactive: 'badge-inactive',
    occupied: 'badge-occupied',
    sent: 'badge-active',
  };
  return `<span class="badge ${map[status] || 'badge-draft'}">${status === 'available' ? 'Disponível' : status === 'occupied' ? 'Ocupado' : status}</span>`;
}

const positionLabels = {
  'header': 'Banner Topo',
  'sidebar-top': 'Sidebar Superior',
  'sidebar-bottom': 'Sidebar Inferior',
  'in-feed': 'Entre Matérias',
  'article-top': 'Acima da Matéria',
  'article-bottom': 'Abaixo da Matéria',
  'footer': 'Rodapé',
};

const positionIcons = {
  'header': '&#9650;',
  'sidebar-top': '&#9654;',
  'sidebar-bottom': '&#9654;',
  'in-feed': '&#9644;',
  'footer': '&#9660;',
};

function renderSiteMap(spaces) {
  const mapEl = document.getElementById('site-map');
  if (!spaces.length) {
    mapEl.innerHTML = '<p class="empty-state">Nenhum espaco de anuncio configurado.</p>';
    return;
  }

  const byPosition = {};
  spaces.forEach(s => { byPosition[s.position] = s; });

  function slotBlock(space, num) {
    if (!space) return '<div class="wm-slot wm-empty"><span>Vazio</span></div>';
    const isAvail = space.availability === 'available';
    const cls = isAvail ? 'wm-available' : 'wm-occupied';
    return `
      <div class="wm-slot ${cls}" data-id="${space.id}">
        <div class="wm-slot-top">
          <span class="wm-num">${num}</span>
          <span class="wm-name">${space.name}</span>
        </div>
        <div class="wm-dims">${space.width} x ${space.height}</div>
        <div class="wm-price-row">
          <span class="wm-price" id="wm-price-${space.id}">R$ ${(space.price_cents / 100).toFixed(0)}</span>
          <span class="wm-period">/mes</span>
          <button class="wm-edit-price" data-id="${space.id}" data-price="${space.price_cents}" title="Editar preco">&#9998;</button>
        </div>
        <div class="wm-status ${isAvail ? 'wm-status-free' : 'wm-status-used'}">
          ${isAvail ? '&#10003; Disponivel' : '&#10007; Ocupado'}
        </div>
        ${!isAvail ? `<div class="wm-client">${space.occupied_by || ''} expira ${space.expires_at || 'N/I'}</div>` : ''}
      </div>`;
  }

  const s1 = byPosition['header'];
  const s2 = byPosition['sidebar-top'];
  const s3 = byPosition['sidebar-bottom'];
  const s4 = byPosition['in-feed'];
  const s5 = byPosition['footer'];

  const html = `
  <div class="wm-frame">

    <!-- LINHA 1: CABECALHO -->
    <div class="wm-row wm-header-row">
      <div class="wm-header-bar">
        <span class="wm-logo-mock">PC</span>
        <span class="wm-nav-mock">Inicio</span>
        <span class="wm-nav-mock">Politica</span>
        <span class="wm-nav-mock">Economia</span>
        <span class="wm-nav-mock">Esportes</span>
        <span class="wm-nav-mock">Mais</span>
      </div>
    </div>

    <!-- LINHA 2: CAMPO 1 (Banner Topo) - ocupa toda largura -->
    <div class="wm-row wm-row-full">
      <div class="wm-label-col">
        <span class="wm-row-label">CABECALHO DO SITE</span>
      </div>
      <div class="wm-slot-col wm-col-full">
        ${slotBlock(s1, 1)}
      </div>
    </div>

    <!-- LINHA 3: CONTEUDO PRINCIPAL -->
    <div class="wm-row wm-body-row">
      <div class="wm-label-col">
        <span class="wm-row-label">CONTEUDO</span>
      </div>

      <!-- COLUNA ESQUERDA: Noticias -->
      <div class="wm-main-col">
        <div class="wm-news-area">
          <div class="wm-news-placeholder">
            <div class="wm-news-img"></div>
            <div class="wm-news-title"></div>
            <div class="wm-news-text"></div>
          </div>
          <div class="wm-news-placeholder">
            <div class="wm-news-img"></div>
            <div class="wm-news-title"></div>
            <div class="wm-news-text"></div>
          </div>
        </div>

        <!-- CAMPO 4 (Entre Materias) -->
        <div class="wm-infeed-zone">
          <span class="wm-zone-label">ENTRE MATERIAS</span>
          ${slotBlock(s4, 4)}
        </div>

        <div class="wm-news-area">
          <div class="wm-news-placeholder">
            <div class="wm-news-img"></div>
            <div class="wm-news-title"></div>
            <div class="wm-news-text"></div>
          </div>
          <div class="wm-news-placeholder">
            <div class="wm-news-img"></div>
            <div class="wm-news-title"></div>
            <div class="wm-news-text"></div>
          </div>
        </div>
      </div>

      <!-- COLUNA DIREITA: Sidebar -->
      <div class="wm-sidebar-col">
        <span class="wm-zone-label">SIDEBAR</span>
        ${slotBlock(s2, 2)}
        ${slotBlock(s3, 3)}
      </div>
    </div>

    <!-- LINHA 4: CAMPO 5 (Rodape) -->
    <div class="wm-row wm-row-full">
      <div class="wm-label-col">
        <span class="wm-row-label">RODAPE</span>
      </div>
      <div class="wm-slot-col wm-col-full">
        ${slotBlock(s5, 5)}
      </div>
    </div>

    <!-- LINHA 5: Footer inferior -->
    <div class="wm-row wm-footer-row">
      <div class="wm-footer-bar">
        <span>&copy; 2026 Paralelo Comunica</span>
      </div>
    </div>

  </div>`;

  mapEl.innerHTML = html;

  // Bind edit price buttons
  mapEl.querySelectorAll('.wm-edit-price').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const currentCents = Number(btn.dataset.price);
      const currentBRL = (currentCents / 100).toFixed(0);
      const newBRL = prompt('Novo preco (R$/mes):', currentBRL);
      if (newBRL === null) return;
      const newCents = Math.round(Number(newBRL) * 100);
      if (isNaN(newCents) || newCents < 0) return alert('Valor invalido');
      saveSpacePrice(id, newCents);
    });
  });
}

async function saveSpacePrice(id, priceCents) {
  try {
    const space = await fetchJson(`/api/admin/ad-spaces/${id}`);
    await fetchJson(`/api/admin/ad-spaces/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: space.name,
        position: space.position,
        description: space.description,
        price_cents: priceCents,
        width: space.width,
        height: space.height,
        active: space.active,
      }),
    });
    await loadDashboard();
  } catch (e) {
    alert('Erro ao salvar: ' + e.message);
  }
}

function renderDashboardSpacesTable(spaces) {
  const table = document.getElementById('dashboard-spaces-table');
  const posNum = { 'header': 1, 'sidebar-top': 2, 'sidebar-bottom': 3, 'in-feed': 4, 'footer': 5 };
  if (!spaces.length) {
    table.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhum espaco cadastrado.</td></tr>';
    return;
  }
  table.innerHTML = spaces.map(s => `
    <tr>
      <td><strong><span class="wm-num" style="background:${s.availability === 'available' ? 'var(--success)' : 'var(--danger)'}; font-size:0.65rem; width:20px; height:20px; display:inline-flex;">${posNum[s.position] || '?'}</span> ${s.name}</strong></td>
      <td>${positionLabels[s.position] || s.position}</td>
      <td>${s.width} x ${s.height}</td>
      <td>R$ ${(s.price_cents / 100).toFixed(2)}/mes</td>
      <td>${badgeForStatus(s.availability)}</td>
      <td>${s.occupied_by || '-'}</td>
      <td>${s.expires_at || '-'}</td>
    </tr>
  `).join('');
}

async function loadDashboard() {
  const [analytics, spaces] = await Promise.all([
    fetchJson('/api/admin/dashboard-counts'),
    fetchJson('/api/admin/ad-spaces'),
  ]);

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon red">&#9998;</div>
      <span class="stat-value">${analytics.newsCount}</span>
      <span class="stat-label">Notícias</span>
    </div>
    <div class="stat-card">
      <div class="stat-icon blue">&#9823;</div>
      <span class="stat-value">${analytics.clientCount}</span>
      <span class="stat-label">Clientes</span>
    </div>
    <div class="stat-card">
      <div class="stat-icon yellow">&#9641;</div>
      <span class="stat-value">${analytics.adSpaceCount}</span>
      <span class="stat-label">Espaços Total</span>
    </div>
    <div class="stat-card">
      <div class="stat-icon green">&#9733;</div>
      <span class="stat-value">${analytics.activeAds}</span>
      <span class="stat-label">Anúncios Ativos</span>
    </div>
    <div class="stat-card">
      <div class="stat-icon purple">&#10003;</div>
      <span class="stat-value">${analytics.availableSpaces}</span>
      <span class="stat-label">Disponíveis</span>
    </div>
    <div class="stat-card">
      <div class="stat-icon red">&#10007;</div>
      <span class="stat-value">${analytics.occupiedSpaces}</span>
      <span class="stat-label">Ocupados</span>
    </div>
  `;

  renderSiteMap(spaces);
  renderDashboardSpacesTable(spaces);
}

async function loadNews() {
  const news = await fetchJson('/api/admin/news');
  const table = document.getElementById('news-table');
  if (!news.length) {
    table.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma notícia cadastrada.</td></tr>';
    return;
  }
  table.innerHTML = news.map(item => `
    <tr>
      <td><strong>${item.title}</strong></td>
      <td>${item.category} ${item.subcategory ? `<br><small style="color:var(--accent);font-weight:600;">(${item.subcategory})</small>` : ''}</td>
      <td>${badgeForStatus(item.status)}</td>
      <td>${item.created_at || '-'}</td>
      <td class="actions">
        <button data-id="${item.id}" class="btn btn-sm btn-edit edit-news">Editar</button>
        <button data-id="${item.id}" class="btn btn-sm btn-delete delete-news">Excluir</button>
      </td>
    </tr>
  `).join('');

  table.querySelectorAll('.delete-news').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir esta noticia?')) return;
      await fetchJson(`/api/admin/news/${btn.dataset.id}`, { method: 'DELETE' });
      await loadNews();
    });
  });

  table.querySelectorAll('.edit-news').forEach(btn => {
    btn.addEventListener('click', async () => {
      await editNews(btn.dataset.id);
    });
  });
}

let editingNewsId = null;
let editingClientId = null;
let editingAdspaceId = null;
let editingAdId = null;
let editingAdData = null;

async function editNews(id) {
  const news = await fetchJson(`/api/news/${id}`);
  editingNewsId = id;
  document.getElementById('title').value = news.title || '';
  document.getElementById('category').value = news.category || '';
  const subWrap = document.getElementById('subcategory-wrap');
  if (subWrap) {
    subWrap.style.display = (news.category === 'Economia') ? 'block' : 'none';
  }
  if (document.getElementById('subcategory')) {
    document.getElementById('subcategory').value = news.subcategory || '';
  }
  document.getElementById('description').value = news.description || '';
  document.getElementById('full-content').value = news.full_content || '';
  document.getElementById('source').value = news.source || '';
  document.getElementById('datetime').value = news.datetime || '';
  document.getElementById('status').value = news.status || 'published';
  if (document.getElementById('news-ad-space')) {
    document.getElementById('news-ad-space').value = news.ad_space_id || '';
  }
  const existingImage = news.image_url || news.image || '';
  const existingVideo = news.video_url || '';
  document.getElementById('news-form').dataset.existingImage = existingImage;
  document.getElementById('news-form').dataset.existingVideo = existingVideo;
  if (existingVideo && (existingVideo.startsWith('http://') || existingVideo.startsWith('https://'))) {
    document.getElementById('news-video-link').value = existingVideo;
  }
  document.getElementById('news-form').querySelector('button[type="submit"]').textContent = 'Atualizar Noticia';
  showSection('news');
}

async function loadClients() {
  const clients = await fetchJson('/api/admin/clients');
  const table = document.getElementById('clients-table');
  const select = document.getElementById('ad-client');
  if (!clients.length) {
    table.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum cliente cadastrado.</td></tr>';
    select.innerHTML = '';
    return;
  }
  table.innerHTML = clients.map(item => `
    <tr>
      <td><strong>${item.name}</strong></td>
      <td>${item.email}</td>
      <td>${item.company_name || '-'}</td>
      <td>${item.phone || '-'}</td>
      <td class="actions">
        <button data-id="${item.id}" class="btn btn-sm btn-edit edit-client">Editar</button>
      </td>
    </tr>
  `).join('');
  select.innerHTML = clients.map(item =>
    `<option value="${item.id}">${item.company_name || item.name}</option>`
  ).join('');

  table.querySelectorAll('.edit-client').forEach(btn => {
    btn.addEventListener('click', async () => {
      editingClientId = Number(btn.dataset.id);
      const c = await fetchJson(`/api/admin/clients/${btn.dataset.id}`);
      document.getElementById('client-name').value = c.name || '';
      document.getElementById('client-email').value = c.email || '';
      document.getElementById('client-company').value = c.company_name || '';
      document.getElementById('client-phone').value = c.phone || '';
      document.getElementById('client-website').value = c.website || '';
      document.getElementById('client-notes').value = c.notes || '';
      document.getElementById('client-password').value = '';
      document.getElementById('client-form').querySelector('button[type="submit"]').textContent = 'Atualizar Cliente';
      showSection('clients');
    });
  });
}

async function loadAdSpaces() {
  const spaces = await fetchJson('/api/admin/ad-spaces');
  const table = document.getElementById('adspaces-table');
  const select = document.getElementById('ad-space');
  const newsSpaceSelect = document.getElementById('news-ad-space');
  if (!spaces.length) {
    table.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum espaço cadastrado.</td></tr>';
    if (select) select.innerHTML = '';
    if (newsSpaceSelect) newsSpaceSelect.innerHTML = '<option value="">Nenhum espaço disponível</option>';
    return;
  }
  table.innerHTML = spaces.map(item => `
    <tr>
      <td><strong>${item.name}</strong></td>
      <td>${positionLabels[item.position] || item.position}</td>
      <td>R$ ${(item.price_cents / 100).toFixed(2)}</td>
      <td>${item.active ? badgeForStatus('active') : badgeForStatus('inactive')}</td>
      <td class="actions">
        <button data-id="${item.id}" class="btn btn-sm btn-edit edit-adspace">Editar</button>
      </td>
    </tr>
  `).join('');
  if (select) {
    select.innerHTML = spaces.map(item =>
      `<option value="${item.id}">${item.name} (${item.width}x${item.height})</option>`
    ).join('');
  }
  if (newsSpaceSelect) {
    const posOrder = ['header', 'sidebar-top', 'in-feed', 'sidebar-bottom', 'article-top', 'article-bottom', 'footer'];
  const posNum = { 'header': 1, 'sidebar-top': 2, 'sidebar-bottom': 3, 'in-feed': 4, 'article-top': 5, 'article-bottom': 6, 'footer': 7 };
    const sorted = spaces.slice().sort((a, b) => posOrder.indexOf(a.position) - posOrder.indexOf(b.position));
    newsSpaceSelect.innerHTML = '<option value="">Nenhum (Noticia normal)</option>' +
      sorted.map(item =>
        `<option value="${item.id}">Campo ${posNum[item.position] || '?'} - ${item.name} (${item.width}x${item.height}) - R$ ${(item.price_cents / 100).toFixed(0)}/mes</option>`
      ).join('');
  }

  table.querySelectorAll('.edit-adspace').forEach(btn => {
    btn.addEventListener('click', async () => {
      editingAdspaceId = Number(btn.dataset.id);
      const s = await fetchJson(`/api/admin/ad-spaces/${btn.dataset.id}`);
      document.getElementById('adspace-name').value = s.name || '';
      document.getElementById('adspace-position').value = s.position || '';
      document.getElementById('adspace-description').value = s.description || '';
      document.getElementById('adspace-price').value = s.price_cents || '';
      document.getElementById('adspace-width').value = s.width || '';
      document.getElementById('adspace-height').value = s.height || '';
      document.getElementById('adspace-active').value = s.active ? '1' : '0';
      document.getElementById('adspace-form').querySelector('button[type="submit"]').textContent = 'Atualizar Espaco';
      showSection('adspaces');
    });
  });
}

async function loadAds() {
  const ads = await fetchJson('/api/admin/ads');
  const table = document.getElementById('ads-table');
  if (!ads.length) {
    table.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum anúncio cadastrado.</td></tr>';
    return;
  }
  table.innerHTML = ads.map(item => `
    <tr>
      <td><strong>${item.title}</strong></td>
      <td>${item.client_name}</td>
      <td>${item.space_name}</td>
      <td>
        ${badgeForStatus(item.status)}
        ${item.is_bonus ? '<span class="badge" style="background:#8b5cf6;color:#fff;margin-left:4px;">🎁 Cortesia</span>' : '<span class="badge" style="background:#059669;color:#fff;margin-left:4px;">💵 Faturado</span>'}
      </td>
      <td class="actions">
        <button data-id="${item.id}" class="btn btn-sm btn-edit edit-ad">Editar</button>
        <button data-id="${item.id}" class="btn btn-sm btn-delete delete-ad">Excluir</button>
      </td>
    </tr>
  `).join('');

  table.querySelectorAll('.edit-ad').forEach(btn => {
    btn.addEventListener('click', async () => {
      editingAdId = Number(btn.dataset.id);
      const a = await fetchJson(`/api/admin/ads/${btn.dataset.id}`);
      editingAdData = a;
      document.getElementById('ad-client').value = a.client_id || '';
      document.getElementById('ad-space').value = a.ad_space_id || '';
      document.getElementById('ad-title').value = a.title || '';
      document.getElementById('ad-link').value = a.link || '';
      document.getElementById('ad-start').value = a.start_date || '';
      document.getElementById('ad-end').value = a.end_date || '';
      document.getElementById('ad-status').value = a.status || 'active';
      const bonusCb = document.getElementById('ad-is-bonus');
      if (bonusCb) bonusCb.checked = !!a.is_bonus;

      const imgPrev = document.getElementById('admin-ad-current-image-preview');
      if (imgPrev) {
        imgPrev.innerHTML = a.image_url ? `<span style="font-size:0.85rem;color:var(--text);">🖼 <strong>Imagem atual:</strong> <a href="${a.image_url}" target="_blank" style="color:var(--accent);">Ver imagem atual</a><br><img src="${a.image_url}" style="max-height:60px;border-radius:4px;margin-top:4px;border:1px solid var(--border);"><br><small style="color:var(--muted);">(Se não selecionar um novo arquivo, a imagem acima será mantida)</small></span>` : '';
      }
      const vidPrev = document.getElementById('admin-ad-current-video-preview');
      if (vidPrev) {
        vidPrev.innerHTML = a.video_url ? `<span style="font-size:0.85rem;color:var(--text);">🎥 <strong>Vídeo atual:</strong> <a href="${a.video_url}" target="_blank" style="color:var(--accent);">Ver vídeo atual</a><br><small style="color:var(--muted);">(Se não selecionar um novo arquivo, o vídeo acima será mantido)</small></span>` : '';
      }

      if (a.video_url) {
        document.querySelector('input[name="admin-ad-type"][value="video"]').checked = true;
      } else if (a.embed_code) {
        document.querySelector('input[name="admin-ad-type"][value="embed"]').checked = true;
        document.getElementById('ad-embed').value = a.embed_code || '';
      } else {
        document.querySelector('input[name="admin-ad-type"][value="image"]').checked = true;
      }
      document.querySelectorAll('input[name="admin-ad-type"]').forEach(r => r.dispatchEvent(new Event('change')));
      document.getElementById('ad-form').querySelector('button[type="submit"]').textContent = 'Atualizar Anuncio';
      showSection('ads');
    });
  });

  table.querySelectorAll('.delete-ad').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir este anuncio?')) return;
      await fetchJson(`/api/admin/ads/${btn.dataset.id}`, { method: 'DELETE' });
      await loadAds();
    });
  });
}

async function loadNotifications() {
  const notes = await fetchJson('/api/admin/notifications');
  const table = document.getElementById('notifications-table');
  if (!notes.length) {
    table.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma notificação enviada.</td></tr>';
    return;
  }
  table.innerHTML = notes.map(item => `
    <tr>
      <td><strong>${item.title}</strong></td>
      <td>${item.audience}</td>
      <td>${badgeForStatus(item.status)}</td>
      <td>${item.sent_at || '-'}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteNotification(${item.id})">Excluir</button>
      </td>
    </tr>
  `).join('');
}

async function deleteNotification(id) {
  if (!confirm('Deseja realmente excluir esta notificação do histórico?')) return;
  try {
    await fetchJson(`/api/admin/notifications/${id}`, { method: 'DELETE' });
    await loadNotifications();
  } catch (err) {
    alert('Erro ao excluir notificação: ' + err.message);
  }
}

async function clearNotificationHistory() {
  if (!confirm('Deseja realmente limpar todo o histórico de notificações?')) return;
  try {
    await fetchJson('/api/admin/notifications', { method: 'DELETE' });
    await loadNotifications();
  } catch (err) {
    alert('Erro ao limpar histórico: ' + err.message);
  }
}

async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const data = await fetchJson('/api/upload', { method: 'POST', body: formData });
  return data.url;
}

async function loadUserInfo() {
  try {
    const user = await fetchJson('/api/me');
    if (user) {
      document.getElementById('user-name').textContent = user.name;
      document.getElementById('user-avatar').textContent = user.name.charAt(0).toUpperCase();
      currentUserRole = user.role;
      
      if (currentUserRole !== 'admin') {
        document.querySelectorAll('[data-role="master"]').forEach(el => el.style.display = 'none');
      }
    }
  } catch (e) {
    window.location.href = '/login.html';
  }
}

document.getElementById('news-form').addEventListener('submit', async event => {
  event.preventDefault();
  const imageFile = document.getElementById('image-file').files[0];
  let imageUrl = document.getElementById('news-form').dataset.existingImage || '';
  if (imageFile) imageUrl = await uploadImage(imageFile);
  const videoLink = document.getElementById('news-video-link').value.trim();
  const videoFile = document.getElementById('news-video-file').files[0];
  let videoUrl = document.getElementById('news-form').dataset.existingVideo || '';
  if (videoLink) {
    videoUrl = videoLink;
  } else if (videoFile) {
    const fd = new FormData();
    fd.append('image', videoFile);
    const data = await fetchJson('/api/upload', { method: 'POST', body: fd });
    videoUrl = data.url;
  }
  const categoryVal = document.getElementById('category').value;
  const subcategoryVal = categoryVal === 'Economia' ? document.getElementById('subcategory').value : '';
  const adSpaceId = document.getElementById('news-ad-space').value;
  const body = {
    title: document.getElementById('title').value,
    category: categoryVal,
    subcategory: subcategoryVal,
    description: document.getElementById('description').value,
    full_content: document.getElementById('full-content').value,
    image_url: imageUrl,
    video_url: videoUrl,
    source: document.getElementById('source').value,
    datetime: document.getElementById('datetime').value,
    status: document.getElementById('status').value,
    ad_space_id: adSpaceId ? Number(adSpaceId) : null,
  };

  if (editingNewsId) {
    await fetchJson(`/api/admin/news/${editingNewsId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    editingNewsId = null;
  } else {
    await fetchJson('/api/admin/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  document.getElementById('news-form').reset();
  delete document.getElementById('news-form').dataset.existingImage;
  delete document.getElementById('news-form').dataset.existingVideo;
  if (document.getElementById('subcategory-wrap')) {
    document.getElementById('subcategory-wrap').style.display = 'none';
  }
  document.getElementById('news-form').querySelector('button[type="submit"]').textContent = 'Salvar Noticia';
  editingNewsId = null;
  await loadNews();
});

document.getElementById('news-form').addEventListener('reset', () => {
  editingNewsId = null;
  delete document.getElementById('news-form').dataset.existingImage;
  delete document.getElementById('news-form').dataset.existingVideo;
  if (document.getElementById('subcategory-wrap')) {
    document.getElementById('subcategory-wrap').style.display = 'none';
  }
  document.getElementById('news-form').querySelector('button[type="submit"]').textContent = 'Salvar Noticia';
});

if (document.getElementById('category')) {
  document.getElementById('category').addEventListener('change', e => {
    const subWrap = document.getElementById('subcategory-wrap');
    if (subWrap) subWrap.style.display = (e.target.value === 'Economia') ? 'block' : 'none';
  });
}

document.getElementById('client-form').addEventListener('submit', async event => {
  event.preventDefault();
  const body = {
    name: document.getElementById('client-name').value,
    email: document.getElementById('client-email').value,
    password: document.getElementById('client-password').value,
    company_name: document.getElementById('client-company').value,
    phone: document.getElementById('client-phone').value,
    website: document.getElementById('client-website').value,
    notes: document.getElementById('client-notes').value,
  };

  if (editingClientId) {
    await fetchJson(`/api/admin/clients/${editingClientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    editingClientId = null;
  } else {
    await fetchJson('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  document.getElementById('client-form').reset();
  document.getElementById('client-form').querySelector('button[type="submit"]').textContent = 'Salvar Cliente';
  await loadClients();
});

document.getElementById('adspace-form').addEventListener('submit', async event => {
  event.preventDefault();
  const body = {
    name: document.getElementById('adspace-name').value,
    position: document.getElementById('adspace-position').value,
    description: document.getElementById('adspace-description').value,
    price_cents: Number(document.getElementById('adspace-price').value),
    width: document.getElementById('adspace-width').value,
    height: document.getElementById('adspace-height').value,
    active: document.getElementById('adspace-active').value === '1',
  };

  if (editingAdspaceId) {
    await fetchJson(`/api/admin/ad-spaces/${editingAdspaceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    editingAdspaceId = null;
  } else {
    await fetchJson('/api/admin/ad-spaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  document.getElementById('adspace-form').reset();
  document.getElementById('adspace-form').querySelector('button[type="submit"]').textContent = 'Salvar Espaco';
  await loadAdSpaces();
});

document.getElementById('ad-form').addEventListener('submit', async event => {
  event.preventDefault();
  const adType = document.querySelector('input[name="admin-ad-type"]:checked').value;
  let imageUrl = '';
  let videoUrl = '';

  if (adType === 'image') {
    const file = document.getElementById('ad-image').files[0];
    if (file) {
      imageUrl = await uploadImage(file);
    } else if (editingAdId && editingAdData && editingAdData.image_url) {
      imageUrl = editingAdData.image_url;
    }
  } else if (adType === 'video') {
    const vFile = document.getElementById('ad-video').files[0];
    if (vFile) {
      const fd = new FormData();
      fd.append('image', vFile);
      const data = await fetchJson('/api/upload', { method: 'POST', body: fd });
      videoUrl = data.url;
    } else if (editingAdId && editingAdData && editingAdData.video_url) {
      videoUrl = editingAdData.video_url;
    }
  }

  const body = {
    client_id: Number(document.getElementById('ad-client').value),
    ad_space_id: Number(document.getElementById('ad-space').value),
    title: document.getElementById('ad-title').value,
    link: document.getElementById('ad-link').value,
    image_url: imageUrl,
    video_url: videoUrl,
    embed_code: adType === 'embed' ? document.getElementById('ad-embed').value : '',
    start_date: document.getElementById('ad-start').value,
    end_date: document.getElementById('ad-end').value,
    status: document.getElementById('ad-status').value,
    is_bonus: document.getElementById('ad-is-bonus')?.checked ? 1 : 0,
  };

  if (editingAdId) {
    await fetchJson(`/api/admin/ads/${editingAdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    editingAdId = null;
    editingAdData = null;
  } else {
    await fetchJson('/api/admin/ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  document.getElementById('ad-form').reset();
  document.getElementById('ad-form').querySelector('button[type="submit"]').textContent = 'Salvar Anuncio';
  const imgPrev = document.getElementById('admin-ad-current-image-preview');
  if (imgPrev) imgPrev.innerHTML = '';
  const vidPrev = document.getElementById('admin-ad-current-video-preview');
  if (vidPrev) vidPrev.innerHTML = '';
  await loadAds();
});

document.querySelectorAll('input[name="admin-ad-type"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const val = radio.value;
    const isImage = val === 'image';
    const isVideo = val === 'video';
    const isEmbed = val === 'embed';
    document.getElementById('admin-ad-image-fields').classList.toggle('hidden', !isImage);
    document.getElementById('admin-ad-video-fields').classList.toggle('hidden', !isVideo);
    document.getElementById('admin-ad-embed-fields').classList.toggle('hidden', !isEmbed);
  });
});

document.getElementById('ad-space').addEventListener('change', function() {
  const selected = this.options[this.selectedIndex];
  const text = selected.text;
  const dimsMatch = text.match(/\((\d+x\d+)\)/);
  const dimsInfo = document.getElementById('admin-ad-dims-info');
  const dimsHint = document.getElementById('admin-ad-dims-hint');
  if (dimsMatch) {
    dimsInfo.innerHTML = `<div class="ad-dims-box-inner"><span class="ad-dims-icon">&#9634;</span><div><strong>Tamanho recomendado:</strong> ${dimsMatch[1]} pixels</div></div>`;
    dimsHint.textContent = `Crie a imagem em ${dimsMatch[1]} pixels no Canva, Photoshop ou similar.`;
  } else {
    dimsInfo.innerHTML = '';
    dimsHint.textContent = '';
  }
});

document.getElementById('notification-form').addEventListener('submit', async event => {
  event.preventDefault();
  const sendNow = document.getElementById('notification-send-now').checked;
  
  try {
    await fetchJson('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: document.getElementById('notification-title').value,
        message: document.getElementById('notification-message').value,
        audience: document.getElementById('notification-audience').value,
        sendNow: sendNow,
      }),
    });
    
    if (sendNow) {
      alert('Notificação enviada para a fila de disparo com sucesso!');
    } else {
      alert('Notificação salva como rascunho com sucesso!');
    }
    
    document.getElementById('notification-form').reset();
    await loadNotifications();
  } catch (err) {
    alert('Erro ao enviar notificação: ' + err.message);
  }
});

// Eventos de Template de Mensagem Padrão
document.getElementById('btn-load-template').addEventListener('click', async () => {
  try {
    const data = await fetchJson('/api/admin/notifications/template');
    if (data && data.template) {
      document.getElementById('notification-message').value = data.template;
    } else {
      alert('Nenhuma mensagem padrão cadastrada.');
    }
  } catch (err) {
    alert('Erro ao carregar mensagem padrão: ' + err.message);
  }
});

document.getElementById('btn-save-template').addEventListener('click', async () => {
  const templateText = document.getElementById('notification-message').value.trim();
  if (!templateText) {
    return alert('Digite o texto na Mensagem que deseja salvar como padrão.');
  }
  try {
    await fetchJson('/api/admin/notifications/template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: templateText }),
    });
    alert('Mensagem padrão salva com sucesso!');
  } catch (err) {
    alert('Erro ao salvar mensagem padrão: ' + err.message);
  }
});

// Evento de Limpar Histórico de Notificações
document.getElementById('btn-clear-notifications').addEventListener('click', clearNotificationHistory);

async function loadSiteStats() {
  try {
    const stats = await fetchJson('/api/site-stats');
    document.getElementById('stats-visitors').value = stats.total_visitors || 0;
    document.getElementById('stats-online').value = stats.online_max || 0;
  } catch (e) {}
}

document.getElementById('stats-form').addEventListener('submit', async event => {
  event.preventDefault();
  await fetchJson('/api/admin/site-stats', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      total_visitors: Number(document.getElementById('stats-visitors').value),
      online_max: Number(document.getElementById('stats-online').value),
    }),
  });
  alert('Contadores atualizados!');
});

// ===== RSS MONITOR =====
let rssSourceEditId = null;

async function loadRssSources() {
  const sources = await fetchJson('/api/admin/rss/sources');
  const table = document.getElementById('rss-sources-table');
  if (!sources.length) {
    table.innerHTML = '<tr><td colspan="4" class="empty-state">Nenhuma fonte RSS cadastrada.</td></tr>';
    return;
  }
  table.innerHTML = sources.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td><a href="${s.feed_url}" target="_blank" style="color:var(--accent);font-size:0.8rem;">${s.feed_url}</a></td>
      <td>${s.active ? badgeForStatus('active') : badgeForStatus('inactive')}</td>
      <td class="actions">
        <button data-id="${s.id}" data-name="${s.name}" data-url="${s.feed_url}" data-active="${s.active}" class="btn btn-sm btn-edit edit-rss-source">Editar</button>
        <button data-id="${s.id}" class="btn btn-sm btn-delete delete-rss-source">Excluir</button>
      </td>
    </tr>
  `).join('');

  table.querySelectorAll('.delete-rss-source').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir fonte RSS?')) return;
      try {
        await fetchJson(`/api/admin/rss/sources/${btn.dataset.id}`, { method: 'DELETE' });
        await loadRssSources();
      } catch (e) {
        alert('Erro ao excluir: ' + e.message);
      }
    });
  });

  table.querySelectorAll('.edit-rss-source').forEach(btn => {
    btn.addEventListener('click', () => {
      rssSourceEditId = Number(btn.dataset.id);
      document.getElementById('rss-source-name').value = btn.dataset.name;
      document.getElementById('rss-source-url').value = btn.dataset.url;
      document.getElementById('rss-source-form').querySelector('button[type="submit"]').textContent = 'Atualizar';
    });
  });
}

async function loadRssKeywords() {
  const keywords = await fetchJson('/api/admin/rss/keywords');
  const table = document.getElementById('rss-keywords-table');
  if (!keywords.length) {
    table.innerHTML = '<tr><td colspan="3" class="empty-state">Nenhuma palavra-chave cadastrada.</td></tr>';
    return;
  }
  table.innerHTML = keywords.map(k => `
    <tr>
      <td><strong>${k.keyword}</strong></td>
      <td>${k.active ? badgeForStatus('active') : badgeForStatus('inactive')}</td>
      <td class="actions">
        <button data-id="${k.id}" class="btn btn-sm btn-delete delete-rss-keyword">Excluir</button>
        <button data-id="${k.id}" data-active="${k.active}" class="btn btn-sm btn-edit toggle-rss-keyword">${k.active ? 'Desativar' : 'Ativar'}</button>
      </td>
    </tr>
  `).join('');

  table.querySelectorAll('.delete-rss-keyword').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir palavra-chave?')) return;
      await fetchJson(`/api/admin/rss/keywords/${btn.dataset.id}`, { method: 'DELETE' });
      await loadRssKeywords();
    });
  });

  table.querySelectorAll('.toggle-rss-keyword').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const currentActive = btn.dataset.active === '1';
      const kw = keywords.find(k => k.id === Number(id));
      if (!kw) return;
      await fetchJson(`/api/admin/rss/keywords/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw.keyword, active: !currentActive }),
      });
      await loadRssKeywords();
    });
  });
}

async function loadRssArticles() {
  const articles = await fetchJson('/api/admin/rss/articles');
  const table = document.getElementById('rss-articles-table');
  if (!articles.length) {
    table.innerHTML = '<tr><td colspan="4" class="empty-state">Nenhuma noticia encontrada ainda.</td></tr>';
    return;
  }
  table.innerHTML = articles.map(a => `
    <tr>
      <td>${a.source_name || '-'}</td>
      <td><a href="${a.link}" target="_blank" style="color:var(--accent);">${a.title}</a></td>
      <td><span style="font-size:0.75rem;">${a.matched_keywords || '-'}</span></td>
      <td style="font-size:0.75rem;">${a.found_at || ''}</td>
    </tr>
  `).join('');
}

async function loadRssConfig() {
  const config = await fetchJson('/api/admin/rss/config');
  document.getElementById('rss-interval').value = config.check_interval_minutes || 10;
  document.getElementById('rss-whatsapp-active').checked = !!config.whatsapp_active;
  document.getElementById('rss-whatsapp-phone').value = config.whatsapp_phone || '';
}

async function pollWhatsAppStatus() {
  try {
    const status = await fetchJson('/api/admin/whatsapp/status');
    const statusText = document.getElementById('whatsapp-status-text');
    const qrContainer = document.getElementById('whatsapp-qr-container');
    const qrImg = document.getElementById('whatsapp-qr-img');
    const connectedInfo = document.getElementById('whatsapp-connected-info');
    const phoneDisplay = document.getElementById('whatsapp-phone-display');
    const disconnectBtn = document.getElementById('btn-whatsapp-disconnect');

    qrContainer.style.display = 'none';
    connectedInfo.style.display = 'none';
    disconnectBtn.style.display = 'none';

    switch (status.status) {
      case 'initializing':
        statusText.textContent = 'Inicializando WhatsApp...';
        statusText.style.color = 'var(--muted)';
        break;
      case 'qr':
        statusText.textContent = 'Escaneie o QR Code com seu WhatsApp';
        statusText.style.color = 'var(--accent)';
        qrContainer.style.display = 'block';
        qrImg.src = status.qrCode;
        break;
      case 'connected':
        statusText.textContent = '';
        connectedInfo.style.display = 'block';
        phoneDisplay.textContent = status.phoneNumber ? `+${status.phoneNumber}` : '';
        disconnectBtn.style.display = 'inline-block';
        break;
      case 'disconnected':
        statusText.textContent = 'Desconectado. Reconectando...';
        statusText.style.color = 'var(--danger)';
        break;
      case 'auth_failure':
        statusText.textContent = 'Falha na autenticacao. Clique em "Desconectar" para tentar novamente.';
        statusText.style.color = 'var(--danger)';
        disconnectBtn.style.display = 'inline-block';
        break;
      default:
        statusText.textContent = 'Status: ' + status.status;
        statusText.style.color = 'var(--muted)';
    }
  } catch (e) {}
}

document.getElementById('btn-whatsapp-disconnect').addEventListener('click', async () => {
  await fetchJson('/api/admin/whatsapp/disconnect', { method: 'POST' });
});

document.getElementById('rss-source-form').addEventListener('submit', async event => {
  event.preventDefault();
  const name = document.getElementById('rss-source-name').value;
  const feed_url = document.getElementById('rss-source-url').value;

  try {
    if (rssSourceEditId) {
      await fetchJson(`/api/admin/rss/sources/${rssSourceEditId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, feed_url, active: true }),
      });
      rssSourceEditId = null;
      document.getElementById('rss-source-form').querySelector('button[type="submit"]').textContent = 'Adicionar';
    } else {
      await fetchJson('/api/admin/rss/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, feed_url }),
      });
    }
  } catch (e) {
    alert('Erro ao salvar fonte RSS: ' + e.message);
  }

  document.getElementById('rss-source-form').reset();
  await loadRssSources();
});

document.getElementById('rss-keyword-form').addEventListener('submit', async event => {
  event.preventDefault();
  const keyword = document.getElementById('rss-keyword-input').value;
  await fetchJson('/api/admin/rss/keywords', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword }),
  });
  document.getElementById('rss-keyword-form').reset();
  await loadRssKeywords();
});

document.getElementById('rss-config-form').addEventListener('submit', async event => {
  event.preventDefault();
  await fetchJson('/api/admin/rss/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      check_interval_minutes: Number(document.getElementById('rss-interval').value),
      whatsapp_active: document.getElementById('rss-whatsapp-active').checked,
      whatsapp_phone: document.getElementById('rss-whatsapp-phone').value,
    }),
  });
  alert('Configuracao salva!');
});

document.getElementById('btn-test-whatsapp').addEventListener('click', async () => {
  try {
    const data = await fetchJson('/api/admin/rss/test-whatsapp', { method: 'POST' });
    alert(data.message || 'Teste enviado!');
  } catch (e) {
    alert('Erro: ' + e.message);
  }
});

document.getElementById('btn-check-now').addEventListener('click', async () => {
  const btn = document.getElementById('btn-check-now');
  btn.disabled = true;
  btn.textContent = 'Verificando...';
  try {
    const data = await fetchJson('/api/admin/rss/check', { method: 'POST' });
    const msgs = data.results.map(r => r.error ? `${r.source}: ERRO ${r.error}` : `${r.source}: ${r.count} noticia(s)`);
    alert('Resultado:\n' + msgs.join('\n'));
    await loadRssArticles();
  } catch (e) {
    alert('Erro: ' + e.message);
  }
  btn.disabled = false;
  btn.textContent = 'Verificar Agora';
});

document.getElementById('btn-clear-articles').addEventListener('click', async () => {
  if (!confirm('Limpar todas as noticias encontradas?')) return;
  await fetchJson('/api/admin/rss/articles', { method: 'DELETE' });
  await loadRssArticles();
});

// Inicia polling do status do WhatsApp
let whatsappPollInterval = null;

function startWhatsappPoll() {
  pollWhatsAppStatus();
  if (whatsappPollInterval) clearInterval(whatsappPollInterval);
  whatsappPollInterval = setInterval(pollWhatsAppStatus, 3000);
}

// ===== PAGAMENTO =====
async function loadPaymentConfig() {
  try {
    const cfg = await fetchJson('/api/admin/payment-config');
    document.getElementById('cfg-pix-key').value = cfg.pix_key || '';
    document.getElementById('cfg-pix-name').value = cfg.pix_name || '';
    document.getElementById('cfg-pix-city').value = cfg.pix_city || '';
    document.getElementById('cfg-bank-name').value = cfg.bank_name || '';
    document.getElementById('cfg-bank-agency').value = cfg.bank_agency || '';
    document.getElementById('cfg-bank-account').value = cfg.bank_account || '';
    document.getElementById('cfg-bank-cpf').value = cfg.bank_cpf || '';
    document.getElementById('cfg-company-name').value = cfg.company_name || '';
    const subPrice = cfg.subscription_price_cents != null ? (cfg.subscription_price_cents / 100).toFixed(2) : '3.99';
    document.getElementById('cfg-subscription-price').value = subPrice;
    document.getElementById('cfg-subscription-price-preview').textContent = `Assinatura: R$ ${subPrice}/mês`;
  } catch(e) {
    console.error('Erro ao carregar config pagamento:', e);
  }
}

document.getElementById('cfg-subscription-price').addEventListener('input', function() {
  const val = parseFloat(this.value) || 0;
  document.getElementById('cfg-subscription-price-preview').textContent = `Assinatura: R$ ${val.toFixed(2)}/mês`;
});

document.getElementById('payment-config-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const priceInput = document.getElementById('cfg-subscription-price').value;
    const subPriceVal = priceInput !== '' ? parseFloat(priceInput) : 3.99;
    await fetchJson('/api/admin/payment-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pix_key: document.getElementById('cfg-pix-key').value,
        pix_name: document.getElementById('cfg-pix-name').value,
        pix_city: document.getElementById('cfg-pix-city').value,
        bank_name: document.getElementById('cfg-bank-name').value,
        bank_agency: document.getElementById('cfg-bank-agency').value,
        bank_account: document.getElementById('cfg-bank-account').value,
        bank_cpf: document.getElementById('cfg-bank-cpf').value,
        company_name: document.getElementById('cfg-company-name').value,
        subscription_price_cents: Math.round(subPriceVal * 100),
      }),
    });
    alert('Configuracao salva com sucesso!');
  } catch(e) {
    alert('Erro: ' + e.message);
  }
});

// ===== RESERVAS =====
async function loadReservations() {
  try {
    const reservations = await fetchJson('/api/admin/reservations');
    const tbody = document.getElementById('reservations-table');
    if (!reservations.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Nenhuma reserva encontrada.</td></tr>';
      return;
    }
    const statusBadge = s => {
      const map = { pending: 'badge-draft', approved: 'badge-active', paid: 'badge-active', rejected: 'badge-occupied', expired: 'badge-inactive' };
      const labels = { pending: 'Pendente', approved: 'Aprovada', paid: 'Paga', rejected: 'Rejeitada', expired: 'Expirada' };
      return `<span class="badge ${map[s] || 'badge-draft'}">${labels[s] || s}</span>`;
    };
    tbody.innerHTML = reservations.map(r => `
      <tr>
        <td>#${r.id}</td>
        <td>${r.client_name || r.client_email}</td>
        <td>${r.space_name || r.ad_space_id}</td>
        <td>${r.start_date}</td>
        <td>${r.end_date}</td>
        <td>${r.total_days}</td>
        <td>R$ ${(r.price_cents/100).toFixed(2)}</td>
        <td>${statusBadge(r.status)}</td>
        <td>
          ${r.status === 'pending' ? `
            <button class="btn btn-sm btn-primary res-approve" data-id="${r.id}">Aprovar</button>
            <button class="btn btn-sm btn-secondary res-reject" data-id="${r.id}">Rejeitar</button>
          ` : ''}
          <button class="btn btn-sm btn-secondary res-delete" data-id="${r.id}">Excluir</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.res-approve').forEach(btn => {
      btn.addEventListener('click', async () => {
        await fetchJson(`/api/admin/reservations/${btn.dataset.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' }),
        });
        loadReservations();
      });
    });
    tbody.querySelectorAll('.res-reject').forEach(btn => {
      btn.addEventListener('click', async () => {
        await fetchJson(`/api/admin/reservations/${btn.dataset.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'rejected' }),
        });
        loadReservations();
      });
    });
    tbody.querySelectorAll('.res-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir esta reserva?')) return;
        await fetchJson(`/api/admin/reservations/${btn.dataset.id}`, { method: 'DELETE' });
        loadReservations();
      });
    });
  } catch(e) {
    console.error('Erro ao carregar reservas:', e);
  }
}

// ===== CONFIG NOTICIAS =====
async function loadNewsConfig() {
  try {
    const cfg = await fetchJson('/api/admin/news-config');
    document.getElementById('nc-price-per-day').value = cfg.price_per_day_cents != null ? cfg.price_per_day_cents : 1000;
    document.getElementById('nc-min-days').value = cfg.min_days || 2;
    document.getElementById('nc-max-days').value = cfg.max_days || 10;
    updateNewsConfigPreview();
  } catch(e) {
    console.error('Erro ao carregar config noticias:', e);
  }
}

function updateNewsConfigPreview() {
  const price = Number(document.getElementById('nc-price-per-day').value) || 0;
  const min = Number(document.getElementById('nc-min-days').value) || 2;
  const max = Number(document.getElementById('nc-max-days').value) || 10;
  const minTotal = (price * min / 100).toFixed(2).replace('.', ',');
  const maxTotal = (price * max / 100).toFixed(2).replace('.', ',');
  document.getElementById('nc-price-preview').textContent = `Min: R$ ${minTotal} | Max: R$ ${maxTotal}`;
}

document.getElementById('nc-price-per-day').addEventListener('input', updateNewsConfigPreview);
document.getElementById('nc-min-days').addEventListener('input', updateNewsConfigPreview);
document.getElementById('nc-max-days').addEventListener('input', updateNewsConfigPreview);

document.getElementById('news-config-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await fetchJson('/api/admin/news-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price_per_day_cents: Number(document.getElementById('nc-price-per-day').value),
        min_days: Number(document.getElementById('nc-min-days').value),
        max_days: Number(document.getElementById('nc-max-days').value),
      }),
    });
    alert('Configuracao salva com sucesso!');
  } catch(e) {
    alert('Erro: ' + e.message);
  }
});

// ===== CONFIGURAÇÕES DO SITE =====
const DEFAULT_NAV = [
  { label: 'Politica', url: '/?category=Politica', subs: [] },
  { label: 'Economia', url: '/?category=Economia', subs: [
    { label: 'Finanças', url: '/?category=Economia&subcategory=Finanças' },
    { label: 'Meios de Pagamentos', url: '/?category=Economia&subcategory=Meios de Pagamentos' }
  ]},
  { label: 'Nacional', url: '/?category=Nacional', subs: [] },
  { label: 'Internacional', url: '/?category=Internacional', subs: [] },
  { label: 'Esportes', url: '/?category=Esportes', subs: [] },
  { label: 'Tecnologia', url: '/?category=Tecnologia', subs: [] },
  { label: 'Saude', url: '/?category=Saude', subs: [] },
  { label: 'Entretenimento', url: '/?category=Entretenimento', subs: [] },
  { label: '', url: '', subs: [] }, { label: '', url: '', subs: [] },
  { label: '', url: '', subs: [] }, { label: '', url: '', subs: [] }
];

function subsToText(subs) {
  if (!Array.isArray(subs) || !subs.length) return '';
  return subs.map(s => (s.label || '') + '|' + (s.url || '')).join('\n');
}

function textToSubs(text) {
  if (!text || !text.trim()) return [];
  return text.trim().split('\n').map(line => {
    const idx = line.indexOf('|');
    if (idx === -1) return null;
    const label = line.slice(0, idx).trim();
    const url = line.slice(idx + 1).trim();
    return label ? { label, url } : null;
  }).filter(Boolean);
}

function renderNavEditor(items) {
  const container = document.getElementById('nav-items-editor');
  if (!container) return;
  const arr = Array.isArray(items) ? items : DEFAULT_NAV;
  while (arr.length < 12) arr.push({ label: '', url: '', subs: [] });
  container.innerHTML = arr.slice(0, 12).map((item, i) => {
    const subsText = subsToText(item.subs || []);
    const hasSubs = subsText.trim().length > 0;
    return `
    <div style="background:var(--bg-secondary,#1a1a2e);border:1px solid var(--border);border-radius:8px;padding:10px;">
      <div style="font-size:0.7rem;color:var(--muted);margin-bottom:6px;font-weight:600;">BOTÃO ${i + 1}</div>
      <input type="text" id="nav-label-${i}" value="${(item.label || '').replace(/"/g, '&quot;')}" placeholder="Nome (vazio = oculto)" style="width:100%;margin-bottom:6px;">
      <input type="text" id="nav-url-${i}" value="${(item.url || '').replace(/"/g, '&quot;')}" placeholder="URL ex: /?category=Nome" style="width:100%;margin-bottom:6px;">
      <details${hasSubs ? ' open' : ''} style="font-size:0.75rem;">
        <summary style="cursor:pointer;color:var(--muted);margin-bottom:4px;">Subcategorias (opcional)</summary>
        <textarea id="nav-subs-${i}" rows="3" placeholder="Uma por linha:\nNome da Sub|/?category=X&subcategory=Y" style="width:100%;font-size:0.72rem;font-family:monospace;resize:vertical;">${subsText}</textarea>
      </details>
    </div>`;
  }).join('');
}

function getNavEditorValues() {
  const arr = [];
  for (let i = 0; i < 12; i++) {
    const labelEl = document.getElementById('nav-label-' + i);
    const urlEl = document.getElementById('nav-url-' + i);
    const subsEl = document.getElementById('nav-subs-' + i);
    arr.push({
      label: labelEl ? labelEl.value.trim() : '',
      url: urlEl ? urlEl.value.trim() : '',
      subs: subsEl ? textToSubs(subsEl.value) : []
    });
  }
  return arr;
}

async function loadSiteConfig() {
  try {
    const cfg = await fetchJson('/api/admin/site-config');
    document.getElementById('sc-site-name').value = cfg.site_name || '';
    document.getElementById('sc-site-slogan').value = cfg.site_slogan || '';
    document.getElementById('sc-site-description').value = cfg.site_description || '';
    document.getElementById('sc-footer-categories').value = cfg.footer_categories || '';
    document.getElementById('sc-social-instagram').value = cfg.social_instagram || '';
    document.getElementById('sc-social-twitter').value = cfg.social_twitter || '';
    document.getElementById('sc-social-facebook').value = cfg.social_facebook || '';
    document.getElementById('sc-social-youtube').value = cfg.social_youtube || '';
    document.getElementById('sc-inst-sobre').value = cfg.inst_sobre || '';
    document.getElementById('sc-inst-contato').value = cfg.inst_contato || '';
    document.getElementById('sc-inst-anuncie').value = cfg.inst_anuncie || '';
    document.getElementById('sc-inst-privacidade').value = cfg.inst_privacidade || '';
    document.getElementById('sc-copyright').value = cfg.copyright || '';
    if (document.getElementById('sc-live-status')) document.getElementById('sc-live-status').value = cfg.live_status || 'auto';
    if (document.getElementById('sc-live-title')) document.getElementById('sc-live-title').value = cfg.live_title || 'Transmissão Ao Vivo';
    if (document.getElementById('sc-live-youtube-channel-id')) document.getElementById('sc-live-youtube-channel-id').value = cfg.live_youtube_channel_id || '';
    if (document.getElementById('sc-live-video-url')) document.getElementById('sc-live-video-url').value = cfg.live_video_url || '';
    let navItems = DEFAULT_NAV;
    if (cfg.nav_items) {
      try { navItems = JSON.parse(cfg.nav_items); } catch(e) {}
    }
    renderNavEditor(navItems);
  } catch(e) {
    console.error('Erro ao carregar config do site:', e);
    renderNavEditor(DEFAULT_NAV);
  }
}

document.getElementById('site-config-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await fetchJson('/api/admin/site-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_name: document.getElementById('sc-site-name').value,
        site_slogan: document.getElementById('sc-site-slogan').value,
        site_description: document.getElementById('sc-site-description').value,
        footer_categories: document.getElementById('sc-footer-categories').value,
        social_instagram: document.getElementById('sc-social-instagram').value,
        social_twitter: document.getElementById('sc-social-twitter').value,
        social_facebook: document.getElementById('sc-social-facebook').value,
        social_youtube: document.getElementById('sc-social-youtube').value,
        inst_sobre: document.getElementById('sc-inst-sobre').value,
        inst_contato: document.getElementById('sc-inst-contato').value,
        inst_anuncie: document.getElementById('sc-inst-anuncie').value,
        inst_privacidade: document.getElementById('sc-inst-privacidade').value,
        copyright: document.getElementById('sc-copyright').value,
        live_status: document.getElementById('sc-live-status') ? document.getElementById('sc-live-status').value : 'auto',
        live_title: document.getElementById('sc-live-title') ? document.getElementById('sc-live-title').value : 'Transmissão Ao Vivo',
        live_youtube_channel_id: document.getElementById('sc-live-youtube-channel-id') ? document.getElementById('sc-live-youtube-channel-id').value : '',
        live_video_url: document.getElementById('sc-live-video-url') ? document.getElementById('sc-live-video-url').value : '',
        nav_items: JSON.stringify(getNavEditorValues()),
      }),
    });
    alert('Configurações do site salvas com sucesso!');
  } catch(e) {
    alert('Erro: ' + e.message);
  }
});

// ===== PÁGINAS INSTITUCIONAIS =====
// ===== PÁGINAS INSTITUCIONAIS E PERSONALIZADAS =====
let allPagesList = [];

async function loadPagesSection() {
  try {
    const pages = await fetchJson('/api/admin/pages');
    allPagesList = pages;
    renderPagesTabs(pages);
    const activeTab = document.querySelector('#pages-tab-container .btn-page-tab.active');
    const slugToLoad = activeTab ? activeTab.dataset.slug : 'sobre';
    loadPageData(slugToLoad);
  } catch(e) {
    console.error('Erro ao carregar lista de páginas:', e);
  }
}

function renderPagesTabs(pages) {
  const container = document.getElementById('pages-tab-container');
  if (!container) return;

  const defaultSlugs = ['sobre', 'contato', 'anuncie', 'privacidade'];
  const defaultMap = {
    sobre: 'Sobre Nós',
    contato: 'Contato',
    anuncie: 'Anuncie',
    privacidade: 'Privacidade'
  };

  let html = defaultSlugs.map(slug => {
    const p = pages.find(item => item.slug === slug);
    const title = (p && p.title) ? p.title : defaultMap[slug];
    return `<button type="button" class="btn btn-page-tab" data-slug="${slug}">${title}</button>`;
  }).join('');

  const customPages = pages.filter(item => !defaultSlugs.includes(item.slug));
  customPages.forEach(p => {
    html += `<button type="button" class="btn btn-page-tab" data-slug="${p.slug}">${p.title || p.slug}</button>`;
  });

  html += `<button type="button" class="btn btn-success" id="btn-create-new-page" style="margin-left:auto;background:#16a34a;color:#fff;font-weight:700;">+ Criar Nova Página</button>`;
  container.innerHTML = html;

  container.querySelectorAll('.btn-page-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.btn-page-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadPageData(btn.dataset.slug);
    });
  });

  document.getElementById('btn-create-new-page')?.addEventListener('click', prepareNewPageForm);
}

function prepareNewPageForm() {
  document.querySelectorAll('#pages-tab-container .btn-page-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('page-slug').value = '';
  document.getElementById('page-is-custom').value = '1';
  document.getElementById('page-title-input').value = '';
  document.getElementById('page-slug-custom-input').value = '';
  document.getElementById('page-content-input').value = '';
  document.getElementById('page-slug-label').style.display = 'block';
  document.getElementById('btn-delete-page').style.display = 'none';
  document.getElementById('page-url-preview').textContent = '/pagina.html?page=minha-nova-pagina';
  document.getElementById('page-preview-link').href = '#';
  document.getElementById('page-title-input').focus();
}

async function loadPageData(slug) {
  const defaultSlugs = ['sobre', 'contato', 'anuncie', 'privacidade'];
  const isDefault = defaultSlugs.includes(slug);
  try {
    const page = await fetchJson('/api/admin/pages/' + slug);
    document.getElementById('page-slug').value = slug;
    document.getElementById('page-is-custom').value = isDefault ? '0' : '1';
    document.getElementById('page-title-input').value = page.title || '';
    document.getElementById('page-content-input').value = page.content || '';
    document.getElementById('page-preview-link').href = '/pagina.html?page=' + slug;
    document.getElementById('page-url-preview').textContent = '/pagina.html?page=' + slug;

    if (!isDefault) {
      document.getElementById('page-slug-label').style.display = 'block';
      document.getElementById('page-slug-custom-input').value = slug;
      document.getElementById('btn-delete-page').style.display = 'inline-block';
    } else {
      document.getElementById('page-slug-label').style.display = 'none';
      document.getElementById('btn-delete-page').style.display = 'none';
    }

    const tabBtn = document.querySelector(`#pages-tab-container .btn-page-tab[data-slug="${slug}"]`);
    if (tabBtn) {
      document.querySelectorAll('#pages-tab-container .btn-page-tab').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');
    }
  } catch(e) {
    console.error('Erro ao carregar dados da página:', e);
  }
}

document.getElementById('page-slug-custom-input')?.addEventListener('input', e => {
  let val = e.target.value.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  document.getElementById('page-url-preview').textContent = '/pagina.html?page=' + (val || 'slug');
});

document.getElementById('page-title-input')?.addEventListener('input', e => {
  if (document.getElementById('page-is-custom')?.value === '1' && !document.getElementById('page-slug').value) {
    let slugVal = e.target.value.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    document.getElementById('page-slug-custom-input').value = slugVal;
    document.getElementById('page-url-preview').textContent = '/pagina.html?page=' + (slugVal || 'slug');
  }
});

document.getElementById('btn-copy-page-link')?.addEventListener('click', () => {
  let slug = document.getElementById('page-slug').value || document.getElementById('page-slug-custom-input').value;
  if (!slug) slug = document.getElementById('page-title-input').value.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  if (!slug) return alert('Por favor, informe um título ou identificador para a página.');
  const pageUrl = '/pagina.html?page=' + slug;
  navigator.clipboard.writeText(pageUrl).then(() => {
    alert('Link copiado com sucesso:\n' + pageUrl + '\n\nAgora você pode colar este link no Menu de Navegação!');
  }).catch(() => {
    prompt('Copie o link abaixo para colar no Menu de Navegação:', pageUrl);
  });
});

document.getElementById('btn-delete-page')?.addEventListener('click', async () => {
  const slug = document.getElementById('page-slug').value;
  if (!slug) return;
  if (!confirm(`Tem certeza que deseja excluir a página "${slug}"?`)) return;
  try {
    await fetchJson('/api/admin/pages/' + slug, { method: 'DELETE' });
    alert('Página excluída com sucesso!');
    await loadPagesSection();
  } catch(e) {
    alert('Erro ao excluir página: ' + e.message);
  }
});

document.getElementById('page-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    let slug = document.getElementById('page-slug').value;
    if (!slug || document.getElementById('page-is-custom').value === '1') {
      const customSlugInput = document.getElementById('page-slug-custom-input').value;
      slug = customSlugInput.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    }
    if (!slug) throw new Error('Por favor, informe um identificador único (slug) para a página.');

    await fetchJson('/api/admin/pages/' + slug, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: document.getElementById('page-title-input').value,
        content: document.getElementById('page-content-input').value,
      }),
    });
    alert('Página salva com sucesso!');
    await loadPagesSection();
    loadPageData(slug);
  } catch(e) {
    alert('Erro: ' + e.message);
  }
});

// ===== ASSINANTES =====
async function loadSubscribers() {
  try {
    const subs = await fetchJson('/api/admin/subscriptions');
    const tbody = document.getElementById('subscribers-table');
    if (!subs.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhum assinante encontrado.</td></tr>';
      return;
    }
    const statusBadge = s => {
      const map = { active: 'badge-active', expired: 'badge-inactive', cancelled: 'badge-occupied' };
      const labels = { active: 'Ativo', expired: 'Expirado', cancelled: 'Cancelado' };
      return `<span class="badge ${map[s] || 'badge-draft'}">${labels[s] || s}</span>`;
    };
    tbody.innerHTML = subs.map(s => `
      <tr>
        <td>${s.user_name}</td>
        <td>${s.email}</td>
        <td>${s.plan === 'monthly' ? 'Mensal' : s.plan}</td>
        <td>R$ ${(s.price_cents/100).toFixed(2)}</td>
        <td>${statusBadge(s.status)}</td>
        <td>${s.expires_at || '-'}</td>
        <td class="actions">
          ${s.status === 'active' ? `<button class="btn btn-sm btn-delete sub-cancel" data-id="${s.id}">Cancelar</button>` : ''}
          <button class="btn btn-sm btn-secondary sub-delete" data-id="${s.id}">Excluir</button>
        </td>
      </tr>
    `).join('');
    tbody.querySelectorAll('.sub-cancel').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Cancelar esta assinatura?')) return;
        await fetchJson(`/api/admin/subscriptions/${btn.dataset.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled', expires_at: new Date().toISOString().split('T')[0] }),
        });
        loadSubscribers();
      });
    });
    tbody.querySelectorAll('.sub-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir esta assinatura?')) return;
        await fetchJson(`/api/admin/subscriptions/${btn.dataset.id}`, { method: 'DELETE' });
        loadSubscribers();
      });
    });
  } catch(e) {
    console.error('Erro ao carregar assinantes:', e);
  }
}

// ===== INIT =====
async function init() {
  await loadUserInfo();
  await Promise.all([
    loadDashboard(),
    loadNews(),
    loadCategories(),
    loadClients(),
    loadAdSpaces(),
    loadAds(),
    loadNotifications(),
    loadSiteStats(),
    loadRssSources(),
    loadRssKeywords(),
    loadRssArticles(),
    loadRssConfig(),
    loadPaymentConfig(),
    loadReservations(),
    loadNewsConfig(),
    loadSiteConfig(),
    loadPage('sobre'),
    loadSubscribers(),
    (currentUserRole === "admin" ? loadUsers() : Promise.resolve())
  ]);
  startWhatsappPoll();
}

// ===== CATEGORIAS (CRUD) =====
let globalCategories = [];

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function escapeJsString(str) {
  if (!str) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) return;
    const cats = await res.json();
    globalCategories = cats;

    // Populate #category select dropdown in news form
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
      const currentVal = categorySelect.value;
      categorySelect.innerHTML = '<option value="">Selecione...</option>' + 
        cats.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
      if (currentVal) categorySelect.value = currentVal;
    }

    // Populate table in #section-categories
    const tableBody = document.getElementById('categories-table-body');
    if (tableBody) {
      if (cats.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">Nenhuma categoria cadastrada.</td></tr>';
      } else {
        tableBody.innerHTML = cats.map(c => `
          <tr>
            <td>${c.id}</td>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td>${c.sort_order || 0}</td>
            <td style="text-align:right;">
              <button class="btn btn-sm btn-outline" onclick="editCategory(${c.id}, '${escapeJsString(c.name)}', ${c.sort_order || 0})">Editar</button>
              <button class="btn btn-sm btn-danger" onclick="deleteCategory(${c.id}, '${escapeJsString(c.name)}')">Excluir</button>
            </td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Erro ao carregar categorias:', err);
  }
}

function editCategory(id, name, sortOrder) {
  document.getElementById('category-edit-id').value = id;
  document.getElementById('category-name').value = name;
  document.getElementById('category-sort-order').value = sortOrder || 0;
  document.getElementById('btn-save-category').textContent = 'Atualizar Categoria';
  document.getElementById('btn-cancel-category').classList.remove('hidden');
  document.getElementById('category-name').focus();
}

function resetCategoryForm() {
  document.getElementById('category-edit-id').value = '';
  document.getElementById('category-name').value = '';
  document.getElementById('category-sort-order').value = '0';
  document.getElementById('btn-save-category').textContent = 'Salvar Categoria';
  document.getElementById('btn-cancel-category').classList.add('hidden');
}

async function saveCategory(e) {
  e.preventDefault();
  const id = document.getElementById('category-edit-id').value;
  const name = document.getElementById('category-name').value.trim();
  const sort_order = parseInt(document.getElementById('category-sort-order').value, 10) || 0;

  if (!name) {
    alert('Informe o nome da categoria.');
    return;
  }

  const url = id ? `/api/admin/categories/${id}` : '/api/admin/categories';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sort_order })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao salvar categoria');
    resetCategoryForm();
    await loadCategories();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteCategory(id, name) {
  if (!confirm(`Deseja realmente excluir a categoria "${name}"?`)) return;
  try {
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao excluir categoria');
    await loadCategories();
  } catch (err) {
    alert(err.message);
  }
}

function formatText(textareaId, action) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  let replacement = '';

  switch (action) {
    case 'b':
      replacement = selectedText ? `<b>${selectedText}</b>` : '<b>Texto em negrito</b>';
      break;
    case 'i':
      replacement = selectedText ? `<i>${selectedText}</i>` : '<i>Texto em itálico</i>';
      break;
    case 'u':
      replacement = selectedText ? `<u>${selectedText}</u>` : '<u>Texto sublinhado</u>';
      break;
    case 'link': {
      const url = prompt('Digite a URL, E-mail ou WhatsApp (ex: https://site.com ou contato@empresa.com ou 5511999999999):');
      if (!url) return;
      let finalUrl = url.trim();
      if (finalUrl.includes('@') && !finalUrl.startsWith('mailto:')) {
        finalUrl = 'mailto:' + finalUrl;
      } else if (/^\+?\d{8,15}$/.test(finalUrl.replace(/\s+/g, ''))) {
        const cleanPhone = finalUrl.replace(/\D/g, '');
        finalUrl = `https://wa.me/${cleanPhone}`;
      } else if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('mailto:') && !finalUrl.startsWith('tel:')) {
        finalUrl = 'https://' + finalUrl;
      }

      const label = selectedText || prompt('Digite o texto a ser exibido no link:') || finalUrl.replace(/^mailto:/, '');
      if (finalUrl.startsWith('mailto:') || finalUrl.startsWith('tel:')) {
        replacement = `<a href="${finalUrl}">${label}</a>`;
      } else {
        replacement = `<a href="${finalUrl}" target="_blank" rel="noopener">${label}</a>`;
      }
      break;
    }
    case 'h2':
      replacement = selectedText ? `\n<h2>${selectedText}</h2>\n` : '\n<h2>SUBTÍTULO DO ARTIGO</h2>\n';
      break;
    case 'h3':
      replacement = selectedText ? `\n<h3>${selectedText}</h3>\n` : '\n<h3>Subtítulo secundário</h3>\n';
      break;
    case 'uppercase':
      replacement = selectedText ? selectedText.toUpperCase() : '';
      break;
    case 'lowercase':
      replacement = selectedText ? selectedText.toLowerCase() : '';
      break;
    case 'quote':
      replacement = selectedText ? `\n<blockquote>${selectedText}</blockquote>\n` : '\n<blockquote>Texto em citação destacada</blockquote>\n';
      break;
    default:
      return;
  }

  textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
  textarea.focus();
  textarea.setSelectionRange(start + replacement.length, start + replacement.length);
}

document.getElementById('category-form')?.addEventListener('submit', saveCategory);
document.getElementById('btn-cancel-category')?.addEventListener('click', resetCategoryForm);

showSection('dashboard');
init().catch(err => console.error(err));


// ==========================================
// USUÁRIOS (CRUD)
// ==========================================
async function loadUsers() {
  if (currentUserRole !== 'admin') return;
  const users = await fetchJson('/api/users');
  const table = document.getElementById('users-table');
  table.innerHTML = users.map(u => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td><span class="badge ${u.role === 'admin' ? 'badge-info' : 'badge-default'}">${u.role === 'admin' ? 'Master' : 'Comum'}</span></td>
      <td>${u.created_at}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="editUser(${u.id}, '${u.name.replace(/'/g, "\'")}', '${u.email}', '${u.role}')">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function editUser(id, name, email, role) {
  document.getElementById('user-id').value = id;
  document.getElementById('user-name-input').value = name;
  document.getElementById('user-email-input').value = email;
  document.getElementById('user-role-input').value = role;
  document.getElementById('user-password-input').value = '';
  document.getElementById('user-password-input').placeholder = 'Deixe em branco para manter a atual';
}

document.getElementById('btn-user-cancel').addEventListener('click', () => {
  document.getElementById('user-id').value = '';
  document.getElementById('user-form').reset();
  document.getElementById('user-password-input').placeholder = 'Obrigatório para novo';
});

document.getElementById('user-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const id = document.getElementById('user-id').value;
  const name = document.getElementById('user-name-input').value;
  const email = document.getElementById('user-email-input').value;
  const password = document.getElementById('user-password-input').value;
  const role = document.getElementById('user-role-input').value;

  const payload = { name, email, role };
  if (password) payload.password = password;

  try {
    if (id) {
      await fetchJson(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      if (!password) { alert('Senha obrigatória para novo usuário'); return; }
      await fetchJson('/api/users', { method: 'POST', body: JSON.stringify(payload) });
    }
    document.getElementById('user-form').reset();
    document.getElementById('user-id').value = '';
    loadUsers();
  } catch (err) {
    alert(err.message || 'Erro ao salvar usuário');
  }
});

async function deleteUser(id) {
  if (confirm('Tem certeza que deseja excluir este usuário?')) {
    try {
      await fetchJson(`/api/users/${id}`, { method: 'DELETE' });
      loadUsers();
    } catch (err) {
      alert(err.message || 'Erro ao excluir');
    }
  }
}

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW Reg error:', err));
  });
}

// Mobile Sidebar Toggle Logic
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (toggleBtn && sidebar && backdrop) {
    const closeMenu = () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
    };
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      backdrop.classList.toggle('open');
    });
    backdrop.addEventListener('click', closeMenu);
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.addEventListener('click', closeMenu);
    });
  }
});

let dailyChartInstance = null;
let monthlyChartInstance = null;

function renderAnalyticsCharts(dailyData, monthlyData) {
  const dailyLabels = dailyData.map(d => parseInt(d.day, 10));
  const dailyValues = dailyData.map(d => d.views);

  const monthNamesShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthlyLabels = monthlyData.map(m => {
    const [year, mo] = m.year_month.split('-');
    return `${monthNamesShort[parseInt(mo, 10) - 1]} / ${year}`;
  });
  const monthlyValues = monthlyData.map(m => m.views);

  // Daily views chart (Line)
  const ctxDaily = document.getElementById('dailyChart');
  if (ctxDaily) {
    if (dailyChartInstance) dailyChartInstance.destroy();
    dailyChartInstance = new Chart(ctxDaily.getContext('2d'), {
      type: 'line',
      data: {
        labels: dailyLabels,
        datasets: [{
          label: 'Acessos por Dia',
          data: dailyValues,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          borderWidth: 2.5,
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#2563eb',
          pointRadius: 3,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    });
  }

  // Monthly comparison chart (Bar)
  const ctxMonthly = document.getElementById('monthlyChart');
  if (ctxMonthly) {
    if (monthlyChartInstance) monthlyChartInstance.destroy();
    monthlyChartInstance = new Chart(ctxMonthly.getContext('2d'), {
      type: 'bar',
      data: {
        labels: monthlyLabels,
        datasets: [{
          label: 'Acessos por Mês',
          data: monthlyValues,
          backgroundColor: '#16a34a',
          borderRadius: 4,
          maxBarThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    });
  }
}

async function loadAnalyticsSection(month) {
  try {
    const selectedMonth = month || document.getElementById('analytics-month-select').value || new Date().toISOString().substring(0, 7);
    const res = await fetch(`/api/admin/analytics?month=${selectedMonth}`);
    if (!res.ok) return;
    const data = await res.json();

    const monthSelect = document.getElementById('analytics-month-select');
    if (monthSelect && data.available_months) {
      monthSelect.innerHTML = data.available_months.map(m => {
        const [year, mo] = m.split('-');
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const label = `${monthNames[parseInt(mo, 10) - 1]} / ${year}`;
        return `<option value="${m}" ${m === data.selected_month ? 'selected' : ''}>${label}</option>`;
      }).join('');
    }

    document.getElementById('stat-total-views').textContent = Number(data.total_views || 0).toLocaleString('pt-BR');
    document.getElementById('stat-today-views').textContent = Number(data.today_views || 0).toLocaleString('pt-BR');
    document.getElementById('stat-month-views').textContent = Number(data.month_views || 0).toLocaleString('pt-BR');

    const trendVal = data.trend_percent || 0;
    const trendEl = document.getElementById('stat-trend-percent');
    const trendIcon = document.getElementById('stat-trend-icon');
    if (trendVal >= 0) {
      trendEl.textContent = `+${trendVal}%`;
      trendEl.style.color = '#16a34a';
      if (trendIcon) trendIcon.textContent = '📈';
    } else {
      trendEl.textContent = `${trendVal}%`;
      trendEl.style.color = '#dc2626';
      if (trendIcon) trendIcon.textContent = '📉';
    }

    const thermoText = document.getElementById('analytics-thermometer-text');
    const thermoBadge = document.getElementById('analytics-thermometer-badge');
    if (trendVal > 15) {
      thermoText.textContent = `Audiência em forte expansão! Cresceu +${trendVal}% em relação ao mês anterior.`;
      if (thermoBadge) thermoBadge.innerHTML = `<span style="background:#16a34a;color:#fff;padding:6px 16px;border-radius:20px;font-weight:700;font-size:0.9rem;">🚀 CRESCIMENTO ACELERADO (+${trendVal}%)</span>`;
    } else if (trendVal >= 0) {
      thermoText.textContent = `Audiência estável e saudável com alta de +${trendVal}%.`;
      if (thermoBadge) thermoBadge.innerHTML = `<span style="background:#2563eb;color:#fff;padding:6px 16px;border-radius:20px;font-weight:700;font-size:0.9rem;">🟢 TENDÊNCIA POSITIVA (+${trendVal}%)</span>`;
    } else {
      thermoText.textContent = `Queda de ${trendVal}% na audiência em relação ao mês anterior.`;
      if (thermoBadge) thermoBadge.innerHTML = `<span style="background:#dc2626;color:#fff;padding:6px 16px;border-radius:20px;font-weight:700;font-size:0.9rem;">🔴 QUEDA DE AUDIÊNCIA (${trendVal}%)</span>`;
    }

    // Render Charts
    if (data.daily_stats && data.monthly_stats) {
      renderAnalyticsCharts(data.daily_stats, data.monthly_stats);
    }

    const topNewsTbody = document.getElementById('top-news-table');
    if (!data.top_news || data.top_news.length === 0) {
      topNewsTbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhuma notícia acessada ainda no período.</td></tr>';
      return;
    }

    topNewsTbody.innerHTML = data.top_news.map((item, idx) => `
      <tr>
        <td><strong>#${idx + 1}</strong></td>
        <td><strong style="color:var(--text);">${escapeHtml(item.title)}</strong></td>
        <td><span class="badge" style="background:var(--bg-secondary);color:var(--text);">${escapeHtml(item.category || 'Geral')}</span></td>
        <td><strong style="color:#2563eb;">${Number(item.month_views || 0).toLocaleString('pt-BR')} visualizações</strong></td>
        <td>${Number(item.total_views || 0).toLocaleString('pt-BR')}</td>
        <td>${item.created_at ? item.created_at.substring(0, 10) : '-'}</td>
        <td>
          <a href="/noticia.html?news=${item.id}" target="_blank" class="btn-action primary" style="text-decoration:none;padding:4px 10px;font-size:0.8rem;">Ver Notícia</a>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar analytics:', err);
  }
}

async function loadFinancialSection(month) {
  try {
    const selectedMonth = month || document.getElementById('financial-month-select').value || new Date().toISOString().substring(0, 7);
    const res = await fetch(`/api/admin/financial-stats?month=${selectedMonth}`);
    if (!res.ok) return;
    const data = await res.json();

    const monthSelect = document.getElementById('financial-month-select');
    if (monthSelect) {
      const now = new Date();
      const monthsList = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const ym = d.toISOString().substring(0, 7);
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const label = `${monthNames[d.getMonth()]} / ${d.getFullYear()}`;
        monthsList.push(`<option value="${ym}" ${ym === data.selected_month ? 'selected' : ''}>${label}</option>`);
      }
      monthSelect.innerHTML = monthsList.join('');
    }

    const formatBrl = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    document.getElementById('fin-stat-current-revenue').textContent = formatBrl(data.current_month_revenue_cents || 0);
    document.getElementById('fin-stat-arr').textContent = formatBrl(data.annual_projected_revenue_cents || 0);

    const growth = data.revenue_growth_percent || 0;
    const growthEl = document.getElementById('fin-stat-growth');
    if (growth >= 0) {
      growthEl.textContent = `+${growth}%`;
      growthEl.style.color = '#16a34a';
    } else {
      growthEl.textContent = `${growth}%`;
      growthEl.style.color = '#dc2626';
    }

    const occRate = data.ad_spaces ? data.ad_spaces.occupancy_rate : 0;
    document.getElementById('fin-stat-occupancy').textContent = `${occRate}%`;

    const healthBadge = document.getElementById('fin-health-badge');
    const healthBar = document.getElementById('fin-health-bar');
    const healthDesc = document.getElementById('fin-health-description');

    healthBar.style.width = `${Math.min(100, Math.max(10, occRate))}%`;
    if (data.health_status === 'excellent') {
      healthBadge.innerHTML = 'Altamente Rentável 🟢';
      healthBadge.style.background = '#16a34a';
      healthBar.style.background = 'linear-gradient(90deg, #16a34a, #22c55e)';
      healthDesc.textContent = `Excelente taxa de ocupação dos banners (${occRate}%). O portal está gerando receita constante.`;
    } else if (data.health_status === 'moderate') {
      healthBadge.innerHTML = 'Estável / Moderado 🟡';
      healthBadge.style.background = '#eab308';
      healthBar.style.background = 'linear-gradient(90deg, #ca8a04, #eab308)';
      healthDesc.textContent = `Taxa de ocupação moderada (${occRate}%). Há espaço para novos anunciantes.`;
    } else {
      healthBadge.innerHTML = 'Atenção (Espaços Livres) 🔴';
      healthBadge.style.background = '#dc2626';
      healthBar.style.background = 'linear-gradient(90deg, #dc2626, #ef4444)';
      healthDesc.textContent = `Baixa ocupação dos banners (${occRate}%). Foco na captação de novos patrocinadores.`;
    }

    document.getElementById('fin-breakdown-ads').textContent = formatBrl(data.breakdown.ads_cents || 0);
    document.getElementById('fin-breakdown-subs').textContent = formatBrl(data.breakdown.subscriptions_cents || 0);
    document.getElementById('fin-breakdown-news').textContent = formatBrl(data.breakdown.news_paid_cents || 0);

    if (data.ad_spaces) {
      document.getElementById('fin-space-total').textContent = data.ad_spaces.total;
      document.getElementById('fin-space-occupied').textContent = data.ad_spaces.occupied;
      document.getElementById('fin-space-free').textContent = data.ad_spaces.free;
    }

  } catch (err) {
    console.error('Erro ao carregar dados financeiros:', err);
  }
}

document.getElementById('analytics-month-select')?.addEventListener('change', e => {
  loadAnalyticsSection(e.target.value);
});

document.getElementById('financial-month-select')?.addEventListener('change', e => {
  loadFinancialSection(e.target.value);
});

async function generateFinancialPDFReport() {
  try {
    const selectedMonth = document.getElementById('financial-month-select')?.value || new Date().toISOString().substring(0, 7);
    const res = await fetch(`/api/admin/financial-stats?month=${selectedMonth}`);
    if (!res.ok) throw new Error('Erro ao buscar dados do relatório.');
    const data = await res.json();

    const siteConfigRes = await fetch('/api/site-config').catch(() => null);
    const siteConfig = siteConfigRes && siteConfigRes.ok ? await siteConfigRes.json() : {};
    const siteName = siteConfig.site_name || 'Paralelo Comunica';

    const [year, monthNum] = selectedMonth.split('-');
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthLabel = `${monthNames[parseInt(monthNum, 10) - 1]} / ${year}`;
    const generatedAt = new Date().toLocaleString('pt-BR');

    const formatBrl = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const activeAdsHtml = (data.active_ads && data.active_ads.length) ? data.active_ads.map(ad => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:600;">${escapeHtml(ad.title)}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(ad.client_name)}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(ad.space_name)}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;">${ad.is_bonus ? 'R$ 0,00' : formatBrl(ad.price_cents)}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:center;">
          ${ad.is_bonus ? '<span style="background:#f3e8ff;color:#7e22ce;padding:4px 10px;border-radius:12px;font-weight:700;font-size:0.8rem;">🎁 Cortesia</span>' : '<span style="background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:12px;font-weight:700;font-size:0.8rem;">💵 Faturado</span>'}
        </td>
      </tr>
    `).join('') : '<tr><td colspan="5" style="padding:12px;text-align:center;color:#64748b;">Nenhum anúncio ativo no período.</td></tr>';

    const printHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório Financeiro - ${escapeHtml(siteName)} (${monthLabel})</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #fff; margin: 0; padding: 20px; font-size: 13px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px; }
          .header h1 { margin: 0; font-size: 22px; color: #0f172a; }
          .header p { margin: 4px 0 0 0; color: #64748b; font-size: 12px; }
          .badge-month { background: #2563eb; color: #fff; padding: 6px 14px; border-radius: 6px; font-size: 14px; font-weight: bold; text-align: right; }
          .cards-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px; }
          .card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; text-align: center; }
          .card-val { font-size: 18px; font-weight: bold; margin-top: 4px; color: #0f172a; }
          .card-lbl { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
          .section-title { font-size: 15px; font-weight: bold; margin: 25px 0 12px 0; color: #0f172a; border-left: 4px solid #2563eb; padding-left: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f1f5f9; color: #334155; padding: 10px; text-align: left; font-weight: bold; font-size: 12px; border-bottom: 2px solid #cbd5e1; }
          .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>📊 Relatório Financeiro & Comercial</h1>
            <p>Portal: <strong>${escapeHtml(siteName)}</strong> &middot; Gerado em: ${generatedAt}</p>
          </div>
          <div class="badge-month">
            ${monthLabel}
          </div>
        </div>

        <div class="cards-grid">
          <div class="card">
            <div class="card-lbl">Faturamento do Mês</div>
            <div class="card-val" style="color:#16a34a;">${formatBrl(data.current_month_revenue_cents || 0)}</div>
          </div>
          <div class="card">
            <div class="card-lbl">Variação Mensal</div>
            <div class="card-val" style="color:${(data.revenue_growth_percent || 0) >= 0 ? '#16a34a' : '#dc2626'};">
              ${(data.revenue_growth_percent || 0) >= 0 ? '+' : ''}${data.revenue_growth_percent || 0}%
            </div>
          </div>
          <div class="card">
            <div class="card-lbl">Ocupação de Banners</div>
            <div class="card-val" style="color:#2563eb;">${data.ad_spaces ? data.ad_spaces.occupancy_rate : 0}%</div>
          </div>
          <div class="card">
            <div class="card-lbl">Projeção Anual (ARR)</div>
            <div class="card-val" style="color:#7e22ce;">${formatBrl(data.annual_projected_revenue_cents || 0)}</div>
          </div>
        </div>

        <div class="section-title">💰 Origem da Receita Faturada no Mês</div>
        <table>
          <thead>
            <tr>
              <th>Fonte de Receita</th>
              <th style="text-align:right;">Valor Faturado (R$)</th>
              <th style="text-align:center;">Participação (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:600;">📢 Banners de Anúncios (Faturados)</td>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#16a34a;font-weight:bold;">${formatBrl(data.breakdown.ads_cents || 0)}</td>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:center;">
                ${data.current_month_revenue_cents > 0 ? Math.round((data.breakdown.ads_cents / data.current_month_revenue_cents) * 100) : 0}%
              </td>
            </tr>
            <tr>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:600;">⭐ Assinaturas de Leitores VIP</td>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#2563eb;font-weight:bold;">${formatBrl(data.breakdown.subscriptions_cents || 0)}</td>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:center;">
                ${data.current_month_revenue_cents > 0 ? Math.round((data.breakdown.subscriptions_cents / data.current_month_revenue_cents) * 100) : 0}%
              </td>
            </tr>
            <tr>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:600;">✍️ Publieditoriais & Notícias Pagas</td>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#7e22ce;font-weight:bold;">${formatBrl(data.breakdown.news_paid_cents || 0)}</td>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:center;">-</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">📌 Banners Ativos no Período (Faturados vs Bonificados)</div>
        <table>
          <thead>
            <tr>
              <th>Título do Anúncio</th>
              <th>Cliente / Anunciante</th>
              <th>Espaço / Posição</th>
              <th style="text-align:right;">Valor</th>
              <th style="text-align:center;">Tipo de Contrato</th>
            </tr>
          </thead>
          <tbody>
            ${activeAdsHtml}
          </tbody>
        </table>

        <div class="footer">
          Documento gerado automaticamente pelo Sistema Administrativo de ${escapeHtml(siteName)} &middot; ${generatedAt}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) {
      alert('Por favor, permita pop-ups para gerar o PDF.');
      return;
    }
    printWin.document.open();
    printWin.document.write(printHtml);
    printWin.document.close();

  } catch (err) {
    alert('Erro ao gerar relatório em PDF: ' + err.message);
  }
}
