/* ============================================================
   MAILER - Envio de e-mails em massa com fila e throttling
   ------------------------------------------------------------
   - Fila persistida no SQLite (email_campaigns / email_recipients)
   - Worker com limites: diario + por hora + intervalo entre envios
   - Descadastro (unsubscribe) + lista de supressao
   - SMTP configuravel (Brevo, Amazon SES, Zoho, etc.)
   ============================================================ */
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { runAsync, getAsync, allAsync } = require('./db');

const SECRET = process.env.EMAIL_SECRET || 'paralelo-email-secret-2026';

/* ---------------- config ---------------- */

async function getConfig() {
  try {
    const c = await getAsync('SELECT * FROM email_config WHERE id = 1');
    return c || { id: 1, smtp_host: '', smtp_port: 587, smtp_secure: 0, smtp_user: '', smtp_pass: '', from_name: '', from_email: '', reply_to: '', public_url: '', daily_limit: 300, hourly_limit: 100, gap_seconds: 20, enabled: 0 };
  } catch (e) {
    return { id: 1, smtp_host: '', smtp_port: 587, smtp_secure: 0, smtp_user: '', smtp_pass: '', from_name: '', from_email: '', reply_to: '', public_url: '', daily_limit: 300, hourly_limit: 100, gap_seconds: 20, enabled: 0 };
  }
}

async function saveConfig(patch) {
  const cur = await getConfig();
  const fields = ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'from_name', 'from_email', 'reply_to', 'public_url', 'daily_limit', 'hourly_limit', 'gap_seconds', 'enabled'];
  const next = {};
  fields.forEach(f => { next[f] = (patch[f] === undefined ? cur[f] : patch[f]); });
  // normaliza numeros
  next.smtp_port = parseInt(next.smtp_port) || 587;
  next.smtp_secure = next.smtp_secure ? 1 : 0;
  next.daily_limit = Math.max(1, parseInt(next.daily_limit) || 300);
  next.hourly_limit = Math.max(1, parseInt(next.hourly_limit) || 100);
  next.gap_seconds = Math.max(3, parseInt(next.gap_seconds) || 20);
  next.enabled = next.enabled ? 1 : 0;

  const exists = await getAsync('SELECT id FROM email_config WHERE id = 1');
  if (exists) {
    await runAsync(
      `UPDATE email_config SET smtp_host=?, smtp_port=?, smtp_secure=?, smtp_user=?, smtp_pass=?, from_name=?, from_email=?, reply_to=?, public_url=?, daily_limit=?, hourly_limit=?, gap_seconds=?, enabled=?, updated_at=datetime('now','localtime') WHERE id = 1`,
      [next.smtp_host, next.smtp_port, next.smtp_secure, next.smtp_user, next.smtp_pass, next.from_name, next.from_email, next.reply_to, next.public_url, next.daily_limit, next.hourly_limit, next.gap_seconds, next.enabled]
    );
  } else {
    await runAsync(
      `INSERT INTO email_config (id, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, from_name, from_email, reply_to, public_url, daily_limit, hourly_limit, gap_seconds, enabled, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))`,
      [next.smtp_host, next.smtp_port, next.smtp_secure, next.smtp_user, next.smtp_pass, next.from_name, next.from_email, next.reply_to, next.public_url, next.daily_limit, next.hourly_limit, next.gap_seconds, next.enabled]
    );
  }
  resetTransport();
  return next;
}

/* ---------------- transporte SMTP ---------------- */

let _transport = null;
let _transportKey = '';
function resetTransport() {
  if (_transport) { try { _transport.close(); } catch (e) {} }
  _transport = null; _transportKey = '';
}
function buildTransport(cfg) {
  const key = [cfg.smtp_host, cfg.smtp_port, cfg.smtp_secure, cfg.smtp_user].join('|');
  if (_transport && _transportKey === key) return _transport;
  resetTransport();
  _transport = nodemailer.createTransport({
    host: cfg.smtp_host,
    port: parseInt(cfg.smtp_port) || 587,
    secure: !!cfg.smtp_secure,
    auth: cfg.smtp_user ? { user: cfg.smtp_user, pass: cfg.smtp_pass } : undefined,
    pool: true,
    maxConnections: 2,
    maxMessages: 100,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 40000,
  });
  _transportKey = key;
  return _transport;
}

function fromHeader(cfg) {
  const email = cfg.from_email || cfg.smtp_user || '';
  return cfg.from_name ? `"${cfg.from_name}" <${email}>` : email;
}

/* ---------------- descadastro ---------------- */

function normEmail(e) { return String(e || '').toLowerCase().trim(); }

let DEFAULT_BASE = '';
function setDefaultBase(u) { DEFAULT_BASE = String(u || '').replace(/\/+$/, ''); }

function unsubToken(email) {
  return crypto.createHmac('sha256', SECRET).update(normEmail(email)).digest('hex').slice(0, 40);
}

function unsubLink(cfg, email) {
  const base = ((cfg && cfg.public_url) || DEFAULT_BASE || '').replace(/\/+$/, '');
  const e = encodeURIComponent(normEmail(email));
  const t = unsubToken(email);
  return `${base}/api/unsubscribe?e=${e}&t=${t}`;
}

/* ---------------- publico (audience) ---------------- */

/* Aceita varias formas:
   - um e-mail por linha:            email@x.com
   - "Nome <email@x.com>"
   - "Nome,email@x.com"  ou  "email@x.com,Nome"
   - varios e-mails na mesma linha separados por virgula/ponto-e-virgula */
function parseCustomList(raw) {
  const text = String(raw || '').replace(/\u00a0/g, ' ');
  const chunks = [];
  const emailRe = /[^\s<>,;"']+@[^\s<>,;"']+\.[^\s<>,;"']+/g;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (line.includes('<')) { chunks.push(line); continue; }
    const emails = line.match(emailRe) || [];
    if (emails.length === 1 && line.includes(',')) { chunks.push(line); continue; }
    line.split(/[,;]+/).forEach(p => { if (p.trim()) chunks.push(p.trim()); });
  }
  const out = [];
  const seen = new Set();
  for (const c of chunks) {
    const m = c.match(/[^\s<>,;"']+@[^\s<>,;"']+\.[^\s<>,;"']+/);
    if (!m) continue;
    const email = m[0].toLowerCase();
    let name = c.replace(m[0], '').replace(/[<>,;"']/g, ' ').replace(/\s+/g, ' ').trim();
    if (seen.has(email)) continue;
    seen.add(email);
    out.push({ email, name });
  }
  return out;
}

async function resolveAudience(audience, customList) {
  let rows = [];
  const subscribers = () => allAsync("SELECT DISTINCT u.name AS name, u.email AS email FROM users u WHERE u.role = 'subscriber' AND u.email IS NOT NULL AND TRIM(u.email) <> ''");
  const clients = () => allAsync("SELECT DISTINCT u.name AS name, u.email AS email FROM clients c JOIN users u ON c.user_id = u.id WHERE u.email IS NOT NULL AND TRIM(u.email) <> ''");
  if (audience === 'subscribers') rows = await subscribers();
  else if (audience === 'clients') rows = await clients();
  else if (audience === 'all') rows = [...(await subscribers()), ...(await clients())];
  else if (audience === 'custom') rows = parseCustomList(customList);
  // dedupe + valida email
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const e = normEmail(r.email);
    if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) continue;
    if (seen.has(e)) continue;
    seen.add(e);
    out.push({ email: e, name: r.name || '' });
  }
  return out;
}

async function countAudience(audience, customList) {
  const list = await resolveAudience(audience, customList);
  const suppressed = await allAsync('SELECT email FROM email_suppressions');
  const supSet = new Set(suppressed.map(s => normEmail(s.email)));
  const valid = list.filter(x => !supSet.has(x.email));
  return { total: list.length, sendable: valid.length, suppressed: list.length - valid.length };
}

/* ---------------- supressao ---------------- */

async function suppress(email, reason) {
  const e = normEmail(email);
  if (!e) return;
  await runAsync("INSERT INTO email_suppressions (email, reason, created_at) VALUES (?, ?, datetime('now','localtime')) ON CONFLICT(email) DO UPDATE SET reason = excluded.reason", [e, reason || 'unsubscribe']);
}

async function isSuppressed(email) {
  const r = await getAsync('SELECT email FROM email_suppressions WHERE email = ?', [normEmail(email)]);
  return !!r;
}

/* ---------------- anexos ---------------- */

const path = require('path');
const ATT_DIR = path.join(__dirname, 'data', 'email-attachments');

function normalizeAttachments(list) {
  const out = [];
  (Array.isArray(list) ? list : []).forEach(a => {
    if (!a || !a.path) return;
    const p = String(a.path);
    // seguranca: so anexa arquivos enviados por nos (dentro da pasta de anexos)
    if (!p.startsWith(ATT_DIR)) return;
    out.push({ filename: String(a.filename || 'anexo').slice(0, 200), path: p });
  });
  return out;
}

function safeParseAttachments(v) {
  try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}

/* ---------------- personalizacao ---------------- */

function personalize(text, rec) {
  return String(text || '')
    .replace(/\{nome\}/gi, rec.name || '')
    .replace(/\{email\}/gi, rec.email || '');
}

function unsubFooter(cfg, email) {
  const link = unsubLink(cfg, email);
  return `<div style="margin-top:28px;padding-top:14px;border-top:1px solid #e5e5e5;font-size:12px;color:#888;text-align:center;font-family:Arial,sans-serif;">
Você recebeu este e-mail porque está inscrito na nossa lista.<br>
Se não quiser mais receber, <a href="${link}" style="color:#888;">clique aqui para cancelar</a>.
</div>`;
}

/* ---------------- enviar 1 e-mail ---------------- */

async function sendMail(cfg, to, subject, html, opts) {
  const t = buildTransport(cfg);
  const email = normEmail(to);
  const link = unsubLink(cfg, email);
  const footer = unsubFooter(cfg, email);
  const fullHtml = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, footer + '</body>') : (html + footer);
  const msg = {
    from: fromHeader(cfg),
    to: to,
    replyTo: (opts && opts.replyTo) || cfg.reply_to || undefined,
    subject: subject,
    html: fullHtml,
    headers: {
      'List-Unsubscribe': `<mailto:${cfg.reply_to || cfg.from_email}?subject=unsubscribe>, <${link}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
  const atts = normalizeAttachments(opts && opts.attachments);
  if (atts.length) msg.attachments = atts.map(a => ({ filename: a.filename, path: a.path }));
  return t.sendMail(msg);
}

async function sendTest(to) {
  const cfg = await getConfig();
  if (!cfg.smtp_host) throw new Error('SMTP não configurado.');
  const subject = '[Teste] Configuração de e-mail — ' + (cfg.from_name || 'Painel');
  const html = `<h2>Teste de configuração ✅</h2><p>Se você recebeu este e-mail, o envio está funcionando corretamente.</p><p><small>Enviado em ${new Date().toLocaleString('pt-BR')}</p>`;
  await sendMail(cfg, to, subject, html, {});
  return true;
}

/* ---------------- criar campanha ---------------- */

async function createCampaign({ subject, body_html, audience, customList, attachments }) {
  if (!subject || !body_html) throw new Error('Assunto e conteúdo são obrigatórios.');
  const recipients = await resolveAudience(audience, customList);
  if (!recipients.length) throw new Error('Nenhum destinatário válido encontrado.');
  const atts = normalizeAttachments(attachments);
  const r = await runAsync(
    "INSERT INTO email_campaigns (subject, body_html, audience, status, total, sent_count, failed_count, attachments, created_at) VALUES (?, ?, ?, 'draft', ?, 0, 0, ?, datetime('now','localtime'))",
    [subject, body_html, audience, recipients.length, JSON.stringify(atts)]
  );
  const campaignId = r.lastID;
  for (const rec of recipients) {
    await runAsync(
      "INSERT INTO email_recipients (campaign_id, email, name, status, created_at) VALUES (?, ?, ?, 'queued', datetime('now','localtime'))",
      [campaignId, rec.email, rec.name]
    );
  }
  return { id: campaignId, total: recipients.length };
}

/* ---------------- worker ---------------- */

let lastSendAt = 0;
let working = false;

function todayCount() {
  return getAsync("SELECT COUNT(*) AS c FROM email_recipients WHERE status = 'sent' AND date(sent_at) = date('now','localtime')").then(r => (r && r.c) || 0);
}
function hourCount() {
  return getAsync("SELECT COUNT(*) AS c FROM email_recipients WHERE status = 'sent' AND sent_at >= datetime('now','localtime','-1 hour')").then(r => (r && r.c) || 0);
}

async function finalizeIfDone(campaignId) {
  const left = await getAsync("SELECT COUNT(*) AS c FROM email_recipients WHERE campaign_id = ? AND status = 'queued'", [campaignId]);
  if (left && left.c === 0) {
    const c = await getAsync('SELECT total, failed_count FROM email_campaigns WHERE id = ?', [campaignId]);
    const status = (c && c.failed_count >= c.total && c.total > 0) ? 'failed' : 'done';
    await runAsync("UPDATE email_campaigns SET status = ?, finished_at = datetime('now','localtime') WHERE id = ?", [status, campaignId]);
    console.log(`[mailer] campanha ${campaignId} finalizada (${status}).`);
  }
}

async function processOnce() {
  if (working) return;
  working = true;
  try {
    const cfg = await getConfig();
    if (!cfg.enabled || !cfg.smtp_host) return;

    const camp = await getAsync("SELECT * FROM email_campaigns WHERE status = 'sending' ORDER BY id ASC LIMIT 1");
    if (!camp) return;

    // limites
    const sentToday = await todayCount();
    const sentHour = await hourCount();
    if (sentToday >= (cfg.daily_limit || 300)) return; // aguarda virar o dia
    if (sentHour >= (cfg.hourly_limit || 100)) return; // aguarda a janela de 1h

    // intervalo entre envios
    const gapMs = Math.max(3, parseInt(cfg.gap_seconds) || 20) * 1000;
    if (Date.now() - lastSendAt < gapMs) return;

    const rec = await getAsync("SELECT * FROM email_recipients WHERE campaign_id = ? AND status = 'queued' ORDER BY id ASC LIMIT 1", [camp.id]);
    if (!rec) { await finalizeIfDone(camp.id); return; }

    if (await isSuppressed(rec.email)) {
      await runAsync("UPDATE email_recipients SET status = 'skipped', error = 'descadastrado', sent_at = datetime('now','localtime') WHERE id = ?", [rec.id]);
      await finalizeIfDone(camp.id);
      return;
    }

    lastSendAt = Date.now();
    try {
      const atts = safeParseAttachments(camp.attachments);
      await sendMail(cfg, rec.email, personalize(camp.subject, rec), personalize(camp.body_html, rec), { attachments: atts });
      await runAsync("UPDATE email_recipients SET status = 'sent', sent_at = datetime('now','localtime'), error = '' WHERE id = ?", [rec.id]);
      await runAsync('UPDATE email_campaigns SET sent_count = sent_count + 1 WHERE id = ?', [camp.id]);
    } catch (err) {
      const msg = String((err && err.message) || err).slice(0, 300);
      console.error('[mailer] falha ao enviar para ' + rec.email + ':', msg);
      await runAsync("UPDATE email_recipients SET status = 'failed', sent_at = datetime('now','localtime'), error = ? WHERE id = ?", [msg, rec.id]);
      await runAsync('UPDATE email_campaigns SET failed_count = failed_count + 1 WHERE id = ?', [camp.id]);
    }
    await finalizeIfDone(camp.id);
  } catch (e) {
    console.error('[mailer] erro no worker:', e.message);
  } finally {
    working = false;
  }
}

let _timer = null;
function startWorker() {
  if (_timer) return;
  _timer = setInterval(() => { processOnce().catch(() => {}); }, 5000);
  console.log('[mailer] worker de e-mail iniciado (verifica a cada 5s).');
}

async function startCampaign(id) {
  await runAsync("UPDATE email_campaigns SET status = 'sending', started_at = COALESCE(started_at, datetime('now','localtime')) WHERE id = ? AND status IN ('draft','paused')", [id]);
  setTimeout(() => processOnce().catch(() => {}), 200);
  return true;
}
async function pauseCampaign(id) {
  await runAsync("UPDATE email_campaigns SET status = 'paused' WHERE id = ? AND status = 'sending'", [id]);
  return true;
}

/* ---------------- stats ---------------- */

async function stats() {
  const cfg = await getConfig();
  const sentToday = await todayCount();
  const sentHour = await hourCount();
  const active = await getAsync("SELECT COUNT(*) AS c FROM email_campaigns WHERE status = 'sending'");
  const queued = await getAsync("SELECT COUNT(*) AS c FROM email_recipients WHERE status = 'queued'");
  const configured = !!(cfg.smtp_host && cfg.from_email);
  return {
    configured,
    enabled: !!cfg.enabled,
    sentToday,
    sentHour,
    dailyLimit: cfg.daily_limit,
    hourlyLimit: cfg.hourly_limit,
    gapSeconds: cfg.gap_seconds,
    activeCampaigns: active ? active.c : 0,
    queued: queued ? queued.c : 0,
  };
}

module.exports = {
  getConfig, saveConfig,
  resolveAudience, countAudience, parseCustomList,
  suppress, isSuppressed, unsubToken, normEmail, setDefaultBase,
  createCampaign, startCampaign, pauseCampaign,
  sendTest, processOnce, startWorker, stats,
  ATT_DIR, normalizeAttachments,
};
