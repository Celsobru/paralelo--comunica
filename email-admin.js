/* ============================================================
   E-MAIL MARKETING - UI do admin
   Requer fetchJson() (de admin-v2.js) e a secao #section-emailmarketing
   ============================================================ */
var _emailInited = false;
var _emailAttachments = [];
var _emailHtmlMode = false;

function emailEsc(v) {
  return String(v === undefined || v === null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

var EMAIL_STATUS_LABEL = { draft: 'Rascunho', sending: 'Enviando', paused: 'Pausada', done: 'Concluida', failed: 'Falhou' };
var EMAIL_STATUS_CLASS = { draft: 'badge-draft', sending: 'badge-active', paused: 'badge-paused', done: 'badge-active', failed: 'badge-inactive' };
var EMAIL_AUD_LABEL = { all: 'Todos', subscribers: 'Assinantes', clients: 'Clientes', custom: 'Minha lista' };

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

/* ---------------- editor visual ---------------- */

function emEditor() { return document.getElementById('em-editor'); }
function emBody() { return document.getElementById('em-body'); }

function syncEditorToTextarea() {
  if (_emailHtmlMode) return;
  var ed = emEditor(), t = emBody();
  if (ed && t) t.value = ed.innerHTML;
}

function getEmailBody() {
  if (_emailHtmlMode) { var t = emBody(); return t ? t.value : ''; }
  var ed = emEditor(); return ed ? ed.innerHTML : '';
}

function setEmailBody(html) {
  var ed = emEditor(); if (ed) ed.innerHTML = html || '';
  var t = emBody(); if (t) t.value = html || '';
}

function toggleEmailHtmlMode() {
  _emailHtmlMode = !_emailHtmlMode;
  var ed = emEditor(), t = emBody(), tb = document.getElementById('em-toolbar'), btn = document.getElementById('em-html-toggle');
  if (_emailHtmlMode) {
    if (t) { t.value = ed ? ed.innerHTML : ''; t.style.display = 'block'; }
    if (ed) ed.style.display = 'none';
    if (tb) tb.style.display = 'none';
    if (btn) btn.textContent = 'Editor visual';
  } else {
    if (ed) { ed.innerHTML = t ? t.value : ''; ed.style.display = 'block'; }
    if (t) t.style.display = 'none';
    if (tb) tb.style.display = 'flex';
    if (btn) btn.textContent = 'Ver HTML';
  }
}

function initEmailEditor() {
  var toolbar = document.getElementById('em-toolbar');
  if (toolbar) toolbar.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest('button[data-cmd]') : null;
    if (!b) return;
    ev.preventDefault();
    var cmd = b.getAttribute('data-cmd');
    var ed = emEditor();
    if (ed) ed.focus();
    if (cmd === 'createLink') {
      var url = prompt('Endereco do link (https://...):', 'https://');
      if (url) document.execCommand('createLink', false, url);
    } else if (cmd === 'insertImage') {
      var img = prompt('URL da imagem (https://...):', 'https://');
      if (img) document.execCommand('insertImage', false, img);
    } else {
      document.execCommand(cmd, false, null);
    }
    syncEditorToTextarea();
  });

  var tn = document.getElementById('em-insert-name');
  if (tn) tn.addEventListener('click', function () {
    var ed = emEditor();
    if (!_emailHtmlMode && ed) { ed.focus(); try { document.execCommand('insertText', false, '{nome}'); } catch (e) { ed.innerHTML += '{nome}'; } syncEditorToTextarea(); }
    else { var t = emBody(); if (t) t.value += '{nome}'; }
  });

  var ht = document.getElementById('em-html-toggle');
  if (ht) ht.addEventListener('click', toggleEmailHtmlMode);

  var ed2 = emEditor();
  if (ed2) ed2.addEventListener('input', syncEditorToTextarea);

  var imp = document.getElementById('em-import');
  if (imp) imp.addEventListener('change', importEmailList);

  var att = document.getElementById('em-attachment');
  if (att) att.addEventListener('change', uploadEmailAttachment);

  renderEmailAttachments();
}

/* ---------------- importar lista (CSV / TXT) ---------------- */

function splitCsvLine(line, delim) {
  var out = [], cur = '', q = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === delim && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map(function (s) { return s.trim(); });
}

function parseCsvToContacts(text) {
  var lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(function (l) { return l.trim(); });
  if (!lines.length) return [];
  var first = lines[0];
  var delim = ',';
  if ((first.match(/;/g) || []).length > (first.match(/,/g) || []).length) delim = ';';
  if ((first.match(/\t/g) || []).length > (first.match(/[,;]/g) || []).length) delim = '\t';
  var cells = splitCsvLine(first, delim);
  var emailIdx = -1, nameIdx = -1;
  var hasHeader = cells.some(function (c) { return /e-?mail/i.test(c); });
  if (hasHeader) cells.forEach(function (c, i) {
    if (emailIdx === -1 && /e-?mail/i.test(c)) emailIdx = i;
    else if (nameIdx === -1 && /nome|name|contato|cliente|razao|empresa/i.test(c)) nameIdx = i;
  });
  var out = [], seen = {}, re = /[^\s<>,;"']+@[^\s<>,;"']+\.[^\s<>,;"']+/;
  var dataLines = hasHeader ? lines.slice(1) : lines;
  dataLines.forEach(function (line) {
    var parts = splitCsvLine(line, delim);
    var email = '';
    if (emailIdx >= 0 && parts[emailIdx]) { var m = parts[emailIdx].match(re); email = m ? m[0] : ''; }
    if (!email) { var m2 = line.match(re); email = m2 ? m2[0] : ''; }
    if (!email) return;
    email = email.toLowerCase();
    if (seen[email]) return; seen[email] = 1;
    var name = '';
    if (nameIdx >= 0 && parts[nameIdx]) name = parts[nameIdx];
    else for (var k = 0; k < parts.length; k++) {
      if (parts[k] && !re.test(parts[k]) && !/^[+\d()\-\s.]+$/.test(parts[k])) { name = parts[k]; break; }
    }
    name = String(name || '').replace(/[<>,;"']/g, ' ').replace(/\s+/g, ' ').trim();
    out.push(name ? (name + ',' + email) : email);
  });
  return out;
}

function importEmailList(ev) {
  var f = ev.target.files && ev.target.files[0];
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function () {
    var rows = parseCsvToContacts(reader.result);
    var ta = document.getElementById('em-custom');
    if (ta && rows.length) {
      var cur = ta.value.trim();
      ta.value = (cur ? cur + '\n' : '') + rows.join('\n');
    }
    emailMsg('em-msg', rows.length ? ('Importados ' + rows.length + ' contatos.') : 'Nenhum e-mail encontrado no arquivo.', rows.length ? 'ok' : 'error');
    updateEmailCount();
  };
  reader.onerror = function () { emailMsg('em-msg', 'Falha ao ler o arquivo.', 'error'); };
  reader.readAsText(f);
  ev.target.value = '';
}

/* ---------------- anexos ---------------- */

function renderEmailAttachments() {
  var box = document.getElementById('em-attachments');
  if (!box) return;
  if (!_emailAttachments.length) { box.innerHTML = '<span style="color:#888;">Nenhum anexo.</span>'; return; }
  box.innerHTML = _emailAttachments.map(function (a, i) {
    var kb = Math.round((a.size || 0) / 1024);
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">&#128206; ' + emailEsc(a.filename) +
      ' <small style="color:#888;">(' + kb + ' KB)</small> ' +
      '<button type="button" class="btn btn-secondary" style="padding:2px 8px;font-size:.75rem;color:#e74c3c;" onclick="removeEmailAttachment(' + i + ')">remover</button></div>';
  }).join('');
}

function removeEmailAttachment(i) { _emailAttachments.splice(i, 1); renderEmailAttachments(); }

async function uploadEmailAttachment(ev) {
  var f = ev.target.files && ev.target.files[0];
  if (!f) return;
  emailMsg('em-msg', 'Enviando anexo...');
  try {
    var fd = new FormData();
    fd.append('file', f);
    var res = await fetch('/api/admin/email/upload', { method: 'POST', credentials: 'same-origin', body: fd });
    var r = await res.json().catch(function () { return {}; });
    if (!res.ok || !r.attachment) throw new Error(r.error || 'Falha no envio do anexo.');
    _emailAttachments.push(r.attachment);
    emailMsg('em-msg', 'Anexo adicionado.', 'ok');
    renderEmailAttachments();
  } catch (e) { emailMsg('em-msg', e.message, 'error'); }
  ev.target.value = '';
}

/* ---------------- inicializacao ---------------- */

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

  initEmailEditor();

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
  var body = getEmailBody();
  var audience = (document.getElementById('em-audience') || {}).value || 'all';
  var customList = (document.getElementById('em-custom') || {}).value || '';
  var stripped = String(body).replace(/<(br|hr|\/p|\/div|\/h[1-6]|\/li|\/table)[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
  var hasMedia = /<img|<a\s|<video|<iframe/i.test(String(body));
  if (!subject.trim() || (!stripped && !hasMedia)) {
    emailMsg('em-msg', 'Preencha assunto e mensagem.', 'error'); return;
  }
  emailMsg('em-msg', 'Criando campanha...');
  try {
    var r = await fetchJson('/api/admin/email/campaigns', {
      method: 'POST',
      body: JSON.stringify({ subject: subject.trim(), body_html: body, audience: audience, customList: customList, attachments: _emailAttachments })
    });
    emailMsg('em-msg', 'Campanha criada com ' + r.total + ' destinatarios. Clique em Iniciar para comecar o envio.', 'ok');
    var f = document.getElementById('email-campaign-form'); if (f) f.reset();
    var w = document.getElementById('em-custom-wrap'); if (w) w.classList.add('hidden');
    if (_emailHtmlMode) toggleEmailHtmlMode();
    setEmailBody('');
    _emailAttachments = [];
    renderEmailAttachments();
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
