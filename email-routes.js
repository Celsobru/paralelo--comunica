/* ============================================================
   EMAIL ROUTES - E-mail marketing (admin) + descadastro (publico)
   ============================================================ */
const express = require('express');
const router = express.Router();
const mailer = require('./mailer');
const { runAsync, getAsync, allAsync } = require('./db');

function mask(p) { p = String(p || ''); return p ? (p.slice(0, 2) + '***' + p.slice(-2)) : ''; }

/* ---------- config ---------- */
router.get('/config', async (req, res) => {
  try {
    const c = await mailer.getConfig();
    res.json({
      success: true,
      config: {
        smtp_host: c.smtp_host || '',
        smtp_port: c.smtp_port || 587,
        smtp_secure: !!c.smtp_secure,
        smtp_user: c.smtp_user || '',
        smtp_pass_set: !!c.smtp_pass,
        smtp_pass_masked: mask(c.smtp_pass),
        from_name: c.from_name || '',
        from_email: c.from_email || '',
        reply_to: c.reply_to || '',
        public_url: c.public_url || '',
        daily_limit: c.daily_limit || 300,
        hourly_limit: c.hourly_limit || 100,
        gap_seconds: c.gap_seconds || 20,
        enabled: !!c.enabled,
      },
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/config', async (req, res) => {
  try {
    const b = req.body || {};
    const patch = {};
    ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'from_name', 'from_email', 'reply_to', 'public_url', 'daily_limit', 'hourly_limit', 'gap_seconds', 'enabled'].forEach(k => { if (b[k] !== undefined) patch[k] = b[k]; });
    // senha: só troca se vier preenchida
    if (b.smtp_pass !== undefined && b.smtp_pass !== '') patch.smtp_pass = b.smtp_pass;
    await mailer.saveConfig(patch);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.post('/test', async (req, res) => {
  try {
    const to = (req.body && req.body.to) || '';
    if (!to) return res.status(400).json({ success: false, error: 'Informe o e-mail de destino do teste.' });
    await mailer.sendTest(to);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

/* ---------- publico (audience) ---------- */
router.get('/audience', async (req, res) => {
  try {
    const audience = String(req.query.audience || 'all');
    const list = String(req.query.list || '');
    const r = await mailer.countAudience(audience, list);
    res.json({ success: true, ...r });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

/* ---------- campanhas ---------- */
router.get('/campaigns', async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM email_campaigns ORDER BY id DESC');
    res.json({ success: true, campaigns: rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/campaigns', async (req, res) => {
  try {
    const b = req.body || {};
    const out = await mailer.createCampaign({
      subject: (b.subject || '').trim(),
      body_html: b.body_html || '',
      audience: b.audience || 'all',
      customList: b.customList || '',
    });
    res.json({ success: true, ...out });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.get('/campaigns/:id/recipients', async (req, res) => {
  try {
    const rows = await allAsync('SELECT id, email, name, status, error, sent_at FROM email_recipients WHERE campaign_id = ? ORDER BY id ASC LIMIT 2000', [req.params.id]);
    res.json({ success: true, recipients: rows });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.post('/campaigns/:id/start', async (req, res) => {
  try { await mailer.startCampaign(parseInt(req.params.id)); res.json({ success: true }); }
  catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.post('/campaigns/:id/pause', async (req, res) => {
  try { await mailer.pauseCampaign(parseInt(req.params.id)); res.json({ success: true }); }
  catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/campaigns/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await runAsync('DELETE FROM email_recipients WHERE campaign_id = ?', [id]);
    await runAsync('DELETE FROM email_campaigns WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

/* ---------- supressoes ---------- */
router.get('/suppressions', async (req, res) => {
  try {
    const rows = await allAsync('SELECT email, reason, created_at FROM email_suppressions ORDER BY created_at DESC LIMIT 2000');
    res.json({ success: true, suppressions: rows });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.delete('/suppressions', async (req, res) => {
  try {
    const email = (req.body && req.body.email) || req.query.email;
    if (!email) return res.status(400).json({ success: false, error: 'Informe o e-mail.' });
    await runAsync('DELETE FROM email_suppressions WHERE email = ?', [mailer.normEmail(email)]);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

/* ---------- stats ---------- */
router.get('/stats', async (req, res) => {
  try { res.json({ success: true, stats: await mailer.stats() }); }
  catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

module.exports = router;
