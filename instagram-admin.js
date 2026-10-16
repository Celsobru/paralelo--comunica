/* ============================================================
   INSTAGRAM - UI do admin
   Requer fetchJson() (de admin-v2.js) e a secao #section-instagram
   ============================================================ */
var _igInited = false;

function igMsg(id, text, type) {
  var m = document.getElementById(id);
  if (!m) return;
  m.textContent = text || '';
  m.style.color = type === 'error' ? '#e74c3c' : (type === 'ok' ? '#27ae60' : 'var(--text-muted,#888)');
}

function igGet(id) { var el = document.getElementById(id); return el ? el.value : ''; }
function igSet(id, v) { var el = document.getElementById(id); if (el) el.value = (v === undefined || v === null) ? '' : v; }
function igChk(id, v) { var el = document.getElementById(id); if (el) el.checked = !!v; }

async function loadInstagramConfig() {
  try {
    var r = await fetchJson('/api/admin/instagram/config');
    var c = r.config || {};
    igSet('ig-userid', c.ig_user_id);
    igSet('ig-hashtags', c.default_hashtags);
    igSet('ig-publicurl', c.public_url);
    igSet('ig-apibase', c.api_base);
    igSet('ig-apiversion', c.api_version);
    igChk('ig-enabled', c.enabled);
    igChk('ig-autopost', c.auto_post);
    igChk('ig-includelink', c.include_link);
    var t = document.getElementById('ig-token');
    if (t) t.placeholder = c.access_token_set ? ('configurado (' + c.access_token_masked + ') - deixe em branco p/ manter') : '(deixe em branco para manter)';
    if (c.token_expires_at) igMsg('ig-status', 'Token expira em: ' + c.token_expires_at.slice(0, 10), 'info');
  } catch (e) { igMsg('ig-status', e.message, 'error'); }
}

async function saveInstagramConfig(ev) {
  if (ev) ev.preventDefault();
  try {
    igMsg('ig-status', 'Salvando...', 'info');
    await fetchJson('/api/admin/instagram/config', {
      method: 'PUT',
      body: JSON.stringify({
        ig_user_id: igGet('ig-userid').trim(),
        access_token: igGet('ig-token').trim(),
        api_base: igGet('ig-apibase').trim() || 'https://graph.instagram.com',
        api_version: igGet('ig-apiversion').trim() || 'v21.0',
        enabled: document.getElementById('ig-enabled').checked,
        auto_post: document.getElementById('ig-autopost').checked,
        include_link: document.getElementById('ig-includelink').checked,
        default_hashtags: igGet('ig-hashtags').trim(),
        public_url: igGet('ig-publicurl').trim(),
      }),
    });
    var t = document.getElementById('ig-token');
    if (t) t.value = '';
    igMsg('ig-status', 'Configuração salva com sucesso.', 'ok');
    await loadInstagramConfig();
  } catch (e) { igMsg('ig-status', e.message, 'error'); }
}

async function verifyInstagram() {
  try {
    igMsg('ig-status', 'Testando conexão...', 'info');
    var r = await fetchJson('/api/admin/instagram/verify', { method: 'POST', body: JSON.stringify({}) });
    var a = r.account || {};
    igMsg('ig-status', 'OK! Conta conectada: @' + (a.username || '?') + ' (' + (a.account_type || '') + ')', 'ok');
  } catch (e) { igMsg('ig-status', 'Falha: ' + e.message, 'error'); }
}

async function fetchInstagramId() {
  try {
    igMsg('ig-status', 'Buscando ID da conta...', 'info');
    var r = await fetchJson('/api/admin/instagram/verify', { method: 'POST', body: JSON.stringify({}) });
    var a = r.account || {};
    var id = a.user_id || a.id || '';
    if (id) { igSet('ig-userid', id); igMsg('ig-status', 'ID encontrado: ' + id + ' (@' + (a.username || '') + '). Salve para aplicar.', 'ok'); }
    else igMsg('ig-status', 'Não consegui obter o ID. Verifique o token.', 'error');
  } catch (e) { igMsg('ig-status', 'Falha: ' + e.message, 'error'); }
}

async function refreshInstagramToken() {
  try {
    igMsg('ig-status', 'Renovando token...', 'info');
    await fetchJson('/api/admin/instagram/refresh', { method: 'POST', body: JSON.stringify({}) });
    igMsg('ig-status', 'Token renovado por mais ~60 dias.', 'ok');
    await loadInstagramConfig();
  } catch (e) { igMsg('ig-status', 'Falha: ' + e.message, 'error'); }
}

var IG_STATUS_LABEL = { pending: 'Publicando...', published: 'Publicado', failed: 'Falhou' };

async function loadInstagramLog() {
  var tb = document.getElementById('ig-log-table');
  if (!tb) return;
  try {
    var r = await fetchJson('/api/admin/instagram/posts');
    var posts = r.posts || [];
    if (!posts.length) { tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted,#888);">Nenhuma publicação ainda.</td></tr>'; return; }
    tb.innerHTML = posts.map(function (p) {
      var label = IG_STATUS_LABEL[p.status] || p.status;
      var color = p.status === 'published' ? '#27ae60' : (p.status === 'failed' ? '#e74c3c' : '#f39c12');
      var when = (p.created_at || '').slice(0, 16);
      var link = p.permalink ? '<a href="' + p.permalink + '" target="_blank" rel="noopener">Ver no Insta</a>' : (p.error ? '<span title="' + String(p.error).replace(/"/g, '&quot;') + '" style="color:#e74c3c;">' + String(p.error).slice(0, 60) + '</span>' : '-');
      return '<tr><td>#' + (p.news_id || '-') + '</td><td>' + (p.media_type || '') + '</td>' +
        '<td style="color:' + color + ';font-weight:600;">' + label + '</td><td>' + when + '</td><td>' + link + '</td></tr>';
    }).join('');
  } catch (e) { tb.innerHTML = '<tr><td colspan="5" style="color:#e74c3c;">' + e.message + '</td></tr>'; }
}

async function loadInstagramNewsOptions() {
  var sel = document.getElementById('ig-news-select');
  if (!sel) return;
  try {
    var news = await fetchJson('/api/admin/news');
    var pub = (news || []).filter(function (n) { return (n.status || 'published') === 'published'; }).slice(0, 50);
    sel.innerHTML = '<option value="">Selecione uma notícia...</option>' + pub.map(function (n) {
      return '<option value="' + n.id + '">#' + n.id + ' - ' + String(n.title || '').slice(0, 70) + '</option>';
    }).join('');
  } catch (e) { sel.innerHTML = '<option value="">Erro ao carregar</option>'; }
}

async function publishInstagramNow() {
  var sel = document.getElementById('ig-news-select');
  var id = sel ? sel.value : '';
  if (!id) { igMsg('ig-publish-status', 'Selecione uma notícia primeiro.', 'error'); return; }
  try {
    igMsg('ig-publish-status', 'Publicando no Instagram... (pode levar alguns segundos)', 'info');
    var r = await fetchJson('/api/admin/instagram/news/' + id + '/publish', { method: 'POST', body: JSON.stringify({}) });
    var extra = r.permalink ? ' <a href="' + r.permalink + '" target="_blank" rel="noopener">Ver post</a>' : '';
    igMsg('ig-publish-status', 'Publicado com sucesso!', 'ok');
    document.getElementById('ig-publish-status').innerHTML += extra;
    await loadInstagramLog();
  } catch (e) { igMsg('ig-publish-status', 'Falha: ' + e.message, 'error'); await loadInstagramLog(); }
}

function initInstagramSection() {
  if (_igInited) { loadInstagramConfig(); loadInstagramLog(); loadInstagramNewsOptions(); return; }
  _igInited = true;

  var cfgForm = document.getElementById('ig-config-form');
  if (cfgForm) cfgForm.addEventListener('submit', saveInstagramConfig);
  var verifyBtn = document.getElementById('btn-ig-verify');
  if (verifyBtn) verifyBtn.addEventListener('click', verifyInstagram);
  var fetchBtn = document.getElementById('btn-ig-fetchid');
  if (fetchBtn) fetchBtn.addEventListener('click', fetchInstagramId);
  var refreshBtn = document.getElementById('btn-ig-refresh');
  if (refreshBtn) refreshBtn.addEventListener('click', refreshInstagramToken);
  var pubBtn = document.getElementById('btn-ig-publish');
  if (pubBtn) pubBtn.addEventListener('click', publishInstagramNow);

  loadInstagramConfig();
  loadInstagramLog();
  loadInstagramNewsOptions();
}
