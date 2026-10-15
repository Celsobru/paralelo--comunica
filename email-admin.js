/* ============================================================
   E-MAIL MARKETING - UI do admin
   Requer fetchJson() (de admin-v2.js) e a secao #section-emailmarketing
   ============================================================ */
var _emailInited = false;

function emailEsc(v) {
  return String(v === undefined || v === null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

var EMAIL_STATUS_LABEL = { draft: 'Rascunho', sending: 'Enviando', paused: 'Pausada', done: 'Concluida', failed: 'Falhou' };
var EMAIL_STATUS_CLASS = { draft: 'badge-draft', sending: 'badge-active', paused: 'badge-paused', done: 'badge-active', failed: 'badge-inactive' };
var EMAIL_AUD_LABEL = { all: 'Todos', subscribers: 'Assinantes', clients: 'Clientes', custom: 'Lista colada' };

function emailMsg(id, text, type) {
  var m = document.getElementById(id);
  if (!m) return;
  m.textContent = text || '';
  m.style.color = type === 'error' ? '#e74c3c' : (type === 'ok' ? '#27ae60' : 'var(--text-muted,#888)');
}

function emailCard(label, value) {
  return '<div style="background:var(--bg-card,#fff);border:1px solid var(--border,#eee);border-radius:10px;padding:14px 16px;">' +
    '<div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted,#888);">' + emailEsc(label) + '</div>' +
    '<div style="font-size:1.3rem;font-weight:700;margin-top:5px;">' + emailEsc(value) + '</div></div>';
}

function initEmailSection() {
  if (_emailInited) { loadEmailStats(); loadEmailCampaigns(); loadEmailSuppressions(); return; }
  _emailInited = true;

  var settingsBtn = document.getElementById('btn-email-settings');
  if (settingsBtn) settingsBtn.addEventListener('click', function () {
    var p = document.getElementById('email-config-panel');
    if (p) p.classList.toggle('hidden');
  });

  var cfgForm = document.getElementById('email-config-form');
  if (cfgForm) cfgForm.addEventListener('submit', saveEmailConfig);

  var testBtn = document.getElementById('btn-email-test');
  if (testBtn) testBtn.addEventListener('click', sendEmailTest);

  var aud = document.getElementById('em-audience');
  if (aud) aud.addEventListener('change', function () {
    var wrap = document.getElementById('em-custom-wrap');
    if (wrap) wrap.classList.toggle('hidden', aud.value !== 'custom');
    updateEmailCount();
  });
  var custom = document.getElementById('em-custom');
  if (custom) {
    var tt;
    custom.addEventListener('input', function () { clearTimeout(tt); tt = setTimeout(updateEmailCount, 500); });
  }

  var campForm = document.getElementById('email-campaign-form');
  if (campForm) campForm.addEventListener('submit', submitEmailCampaign);

  var refresh = document.getElementById('btn-email-refresh');
  if (refresh) refresh.addEventListener('click', function () { loadEmailSuppressions(); loadEmailCampaigns(); loadEmailStats(); });

  loadEmailConfig();
  loadEmailStats();
  loadEmailCampaigns();
  loadEmailSuppressions();
  updateEmailCount();
}

async function loadEmailConfig() {
  try {
    var r = await fetchJson('/api/admin/email/config');
    var c = r.config || {};
    var set = function (id, v) { var e = document.getElementById(id); if (e) e.value = (v === undefined || v === null) ? '' : v; };
    var chk = function (id, v) { var e = document.getElementById(id); if (e) e.checked = !!v; };
    set('ec-host', c.smtp_host); set('ec-port', c.smtp_port); chk('ec-secure', c.smtp_secure);
    set('ec-user', c.smtp_user); set('ec-fromname', c.from_name); set('ec-fromemail', c.from_email);
    set('ec-replyto', c.reply_to); set('ec-publicurl', c.public_url);
    set('ec-dailylimit', c.daily_limit); set('ec-hourlylimit', c.hourly_limit); set('ec-gap', c.gap_seconds);
    chk('ec-enabled', c.enabled);
    var p = document.getElementById('ec-pass');
    if (p) p.placeholder = c.smtp_pass_set ? ('configurada (' + c.smtp_pass_masked + ') - deixe em branco p/ manter') : 'senha do provedor';
  } catch (e) { emailMsg('ec-msg', e.message, 'error'); }
}

async function saveEmailConfig(ev) {
  ev.preventDefault();
  emailMsg('ec-msg', 'Salvando...');
  var g = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; };
  var body = {
    smtp_host: g('ec-host'), smtp_port: parseInt(g('ec-port')) || 587,
    smtp_secure: document.getElementById('ec-secure').checked,
    smtp_user: g('ec-user'), from_name: g('ec-fromname'), from_email: g('ec-fromemail'),
    reply_to: g('ec-replyto'), public_url: g('ec-publicurl'),
    daily_limit: parseInt(g('ec-dailylimit')) || 300, hourly_limit: parseInt(g('ec-hourlylimit')) || 100,
    gap_seconds: parseInt(g('ec-gap')) || 20, enabled: document.getElementById('ec-enabled').checked
  };
  var pass = g('ec-pass'); if (pass) body.smtp_pass = pass;
  try {
    await fetchJson('/api/admin/email/config', { method: 'PUT', body: JSON.stringify(body) });
    emailMsg('ec-msg', 'Configuracao salva!', 'ok');
    var p = document.getElementById('ec-pass'); if (p) p.value = '';
    loadEmailConfig(); loadEmailStats();
  } catch (e) { emailMsg('ec-msg', e.message, 'error'); }
}

async function sendEmailTest() {
  var to = (document.getElementById('ec-testto') || {}).value || '';
  if (!to) { emailMsg('ec-msg', 'Informe um e-mail para teste.', 'error'); return; }
  emailMsg('ec-msg', 'Enviando teste...');
  try {
    await fetchJson('/api/admin/email/test', { method: 'POST', body: JSON.stringify({ to: to.trim() }) });
    emailMsg('ec-msg', 'Teste enviado! Verifique a caixa de entrada e o spam.', 'ok');
  } catch (e) { emailMsg('ec-msg', e.message, 'error'); }
}

async function updateEmailCount() {
  var elc = document.getElementById('em-count');
  if (!elc) return;
  var audience = (document.getElementById('em-audience') || {}).value || 'all';
  var list = (document.getElementById('em-custom') || {}).value || '';
  try {
    var q = '/api/admin/email/audience?audience=' + encodeURIComponent(audience) + '&list=' + encodeURIComponent(list);
    var r = await fetchJson(q);
    elc.textContent = 'Destinatarios validos: ' + r.sendable + (r.suppressed ? (' (descadastrados ignorados: ' + r.suppressed + ')') : '');
  } catch (e) { elc.textContent = '-'; }
}

async function submitEmailCampaign(ev) {
  ev.preventDefault();
  var subject = (document.getElementById('em-subject') || {}).value || '';
  var body = (document.getElementById('em-body') || {}).value || '';
  var audience = (document.getElementById('em-audience') || {}).value || 'all';
  var customList = (document.getElementById('em-custom') || {}).value || '';
  if (!subject.trim() || !body.trim()) { emailMsg('em-msg', 'Preencha assunto e conteudo.', 'error'); return; }
  emailMsg('em-msg', 'Criando campanha...');
  try {
    var r = await fetchJson('/api/admin/email/campaigns', { method: 'POST', body: JSON.stringify({ subject: subject.trim(), body_html: body, audience: audience, customList: customList }) });
    emailMsg('em-msg', 'Campanha criada com ' + r.total + ' destinatarios. Clique em Iniciar para comecar o envio.', 'ok');
    document.getElementById('email-campaign-form').reset();
    var w = document.getElementById('em-custom-wrap'); if (w) w.classList.add('hidden');
    loadEmailCampaigns(); loadEmailStats(); updateEmailCount();
  } catch (e) { emailMsg('em-msg', e.message, 'error'); }
}

async function loadEmailStats() {
  var box = document.getElementById('email-stats');
  if (!box) return;
  try {
    var r = await fetchJson('/api/admin/email/stats');
    var s = r.stats || {};
    box.innerHTML = [
      emailCard('Status', s.configured ? (s.enabled ? 'Ativo' : 'Pausado') : 'Nao configurado'),
      emailCard('Enviados hoje', s.sentToday + ' / ' + s.dailyLimit),
      emailCard('Ultima hora', s.sentHour + ' / ' + s.hourlyLimit),
      emailCard('Na fila', s.queued),
      emailCard('Intervalo', s.gapSeconds + 's entre envios')
    ].join('');
  } catch (e) { /* silencioso */ }
}

async function loadEmailCampaigns() {
  var tb = document.getElementById('email-campaigns-table');
  if (!tb) return;
  try {
    var r = await fetchJson('/api/admin/email/campaigns');
    var rows = r.campaigns || [];
    if (!rows.length) { tb.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;">Nenhuma campanha ainda.</td></tr>'; return; }
    tb.innerHTML = rows.map(function (c) {
      var total = c.total || 0, sent = c.sent_count || 0, failed = c.failed_count || 0;
      var pct = total ? Math.round((sent + failed) / total * 100) : 0;
      var cls = EMAIL_STATUS_CLASS[c.status] || 'badge-draft';
      var label = EMAIL_STATUS_LABEL[c.status] || c.status;
      var actions = '';
      if (c.status === 'draft' || c.status === 'paused') actions += '<button class="btn btn-secondary" style="padding:4px 8px;font-size:.8rem;" onclick="emailStart(' + c.id + ')">Iniciar</button> ';
      if (c.status === 'sending') actions += '<button class="btn btn-secondary" style="padding:4px 8px;font-size:.8rem;" onclick="emailPause(' + c.id + ')">Pausar</button> ';
      actions += '<button class="btn btn-secondary" style="padding:4px 8px;font-size:.8rem;" onclick="emailViewLog(' + c.id + ')">Log</button> ';
      actions += '<button class="btn btn-secondary" style="padding:4px 8px;font-size:.8rem;color:#e74c3c;" onclick="emailDelete(' + c.id + ')">Excluir</button>';
      return '<tr>' +
        '<td>' + c.id + '</td>' +
        '<td>' + emailEsc(c.subject) + '</td>' +
        '<td>' + (EMAIL_AUD_LABEL[c.audience] || c.audience) + '</td>' +
        '<td><span class="badge ' + cls + '">' + label + '</span></td>' +
        '<td>' + sent + '/' + total + (failed ? (' <span style="color:#e74c3c;">(' + failed + ' falhas)</span>') : '') + ' <small>(' + pct + '%)</small></td>' +
        '<td>' + emailEsc(c.created_at || '') + '</td>' +
        '<td style="white-space:nowrap;">' + actions + '</td>' +
      '</tr>';
    }).join('');
  } catch (e) { tb.innerHTML = '<tr><td colspan="7" style="color:#e74c3c;">' + emailEsc(e.message) + '</td></tr>'; }
}

async function emailStart(id) {
  try { await fetchJson('/api/admin/email/campaigns/' + id + '/start', { method: 'POST' }); loadEmailCampaigns(); loadEmailStats(); } catch (e) { alert(e.message); }
}
async function emailPause(id) {
  try { await fetchJson('/api/admin/email/campaigns/' + id + '/pause', { method: 'POST' }); loadEmailCampaigns(); } catch (e) { alert(e.message); }
}
async function emailDelete(id) {
  if (!confirm('Excluir a campanha #' + id + ' e seu log?')) return;
  try { await fetchJson('/api/admin/email/campaigns/' + id, { method: 'DELETE' }); loadEmailCampaigns(); loadEmailStats(); } catch (e) { alert(e.message); }
}

async function emailViewLog(id) {
  var panel = document.getElementById('email-log-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'email-log-panel';
    panel.className = 'admin-panel';
    panel.style.marginTop = '20px';
    var section = document.getElementById('section-emailmarketing');
    if (section) section.appendChild(panel);
  }
  panel.classList.remove('hidden');
  panel.innerHTML = '<div class="admin-panel-header"><h2>Log da campanha #' + id + '</h2></div><div class="admin-panel-body"><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>E-mail</th><th>Nome</th><th>Status</th><th>Enviado em</th><th>Erro</th></tr></thead><tbody id="email-log-body"><tr><td colspan="5">Carregando...</td></tr></tbody></table></div></div>';
  try {
    var r = await fetchJson('/api/admin/email/campaigns/' + id + '/recipients');
    var rows = r.recipients || [];
    var map = { sent: ['Enviado', 'badge-active'], failed: ['Falhou', 'badge-inactive'], queued: ['Na fila', 'badge-draft'], skipped: ['Ignorado', 'badge-paused'] };
    document.getElementById('email-log-body').innerHTML = rows.length ? rows.map(function (x) {
      var m = map[x.status] || [x.status, 'badge-draft'];
      return '<tr><td>' + emailEsc(x.email) + '</td><td>' + emailEsc(x.name) + '</td><td><span class="badge ' + m[1] + '">' + m[0] + '</span></td><td>' + emailEsc(x.sent_at || '') + '</td><td style="max-width:260px;font-size:.8rem;color:#e74c3c;">' + emailEsc(x.error || '') + '</td></tr>';
    }).join('') : '<tr><td colspan="5" style="text-align:center;color:#999;">Sem registros.</td></tr>';
  } catch (e) {
    document.getElementById('email-log-body').innerHTML = '<tr><td colspan="5" style="color:#e74c3c;">' + emailEsc(e.message) + '</td></tr>';
  }
}

async function loadEmailSuppressions() {
  var tb = document.getElementById('email-sup-table');
  if (!tb) return;
  try {
    var r = await fetchJson('/api/admin/email/suppressions');
    var rows = r.suppressions || [];
    tb.innerHTML = rows.length ? rows.map(function (x) {
      var e = emailEsc(x.email);
      return '<tr><td>' + e + '</td><td>' + emailEsc(x.reason) + '</td><td>' + emailEsc(x.created_at) + '</td><td><button class="btn btn-secondary" style="padding:4px 8px;font-size:.8rem;" onclick="emailUnsup(this)" data-email="' + e + '">Remover</button></td></tr>';
    }).join('') : '<tr><td colspan="4" style="text-align:center;color:#999;">Nenhum descadastro.</td></tr>';
  } catch (e) { tb.innerHTML = '<tr><td colspan="4" style="color:#e74c3c;">' + emailEsc(e.message) + '</td></tr>'; }
}

async function emailUnsup(btn) {
  var email = (btn && btn.getAttribute) ? btn.getAttribute('data-email') : btn;
  if (!confirm('Reativar ' + email + ' para receber e-mails?')) return;
  try { await fetchJson('/api/admin/email/suppressions', { method: 'DELETE', body: JSON.stringify({ email: email }) }); loadEmailSuppressions(); } catch (e) { alert(e.message); }
}
