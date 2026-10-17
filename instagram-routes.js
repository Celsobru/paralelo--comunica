/* ============================================================
   INSTAGRAM ROUTES - API admin para publicacao no Instagram
   Montado em: /api/admin/instagram  (protegido por requireAdmin)
   ============================================================ */
const express = require('express');
const router = express.Router();
const ig = require('./instagram');
const { getAsync, allAsync } = require('./db');

function mask(t) { t = String(t || ''); return t ? (t.slice(0, 6) + '...' + t.slice(-4)) : ''; }

/* ---------- config ---------- */
router.get('/config', async (req, res) => {
  try {
    const c = await ig.getConfig();
    res.json({
      success: true,
      config: {
        ig_user_id: c.ig_user_id || '',
        access_token_set: !!c.access_token,
        access_token_masked: mask(c.access_token),
        api_base: c.api_base || 'https://graph.instagram.com',
        api_version: c.api_version || 'v21.0',
        enabled: !!c.enabled,
        auto_post: !!c.auto_post,
        include_link: !!c.include_link,
        default_hashtags: c.default_hashtags || '',
        public_url: c.public_url || '',
        token_expires_at: c.token_expires_at || '',
      },
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/config', async (req, res) => {
  try {
    const b = req.body || {};
    const patch = {};
    ['ig_user_id', 'api_base', 'api_version', 'enabled', 'auto_post', 'include_link', 'default_hashtags', 'public_url'].forEach((k) => {
      if (b[k] !== undefined) patch[k] = b[k];
    });
    // token: só troca se vier preenchido
    if (b.access_token !== undefined && b.access_token !== '') patch.access_token = b.access_token;
    await ig.saveConfig(patch);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

/* ---------- verificar conexao (nao publica nada) ---------- */
router.post('/verify', async (req, res) => {
  try {
    const me = await ig.getMe();
    res.json({ success: true, account: me });
  } catch (e) { res.status(400).json({ success: false, error: ig.igError(e) }); }
});

/* ---------- renovar token manualmente ---------- */
router.post('/refresh', async (req, res) => {
  try {
    const r = await ig.refreshToken();
    if (r && r.access_token) {
      await ig.saveConfig({ access_token: r.access_token, token_expires_at: new Date(Date.now() + (r.expires_in || 5184000) * 1000).toISOString() });
    }
    res.json({ success: true, expires_in: r && r.expires_in });
  } catch (e) { res.status(400).json({ success: false, error: ig.igError(e) }); }
});

/* ---------- log de publicacoes ---------- */
router.get('/posts', async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM instagram_posts ORDER BY id DESC LIMIT 100');
    res.json({ success: true, posts: rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

/* ---------- publicar uma noticia manualmente ---------- */
router.post('/news/:id/publish', async (req, res) => {
  try {
    const news = await getAsync('SELECT * FROM news WHERE id = ?', [req.params.id]);
    if (!news) return res.status(404).json({ success: false, error: 'Notícia não encontrada.' });
    const r = await ig.publishNews(news);
    res.json({ success: true, ...r });
  } catch (e) { res.status(400).json({ success: false, error: ig.igError(e) }); }
});

/* ---------- backfill: publicar noticias antigas em fila ---------- */
router.get('/backfill', async (req, res) => {
  try { res.json({ success: true, stats: await ig.backfillStats() }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/backfill/start', async (req, res) => {
  try {
    const added = await ig.enqueueBackfill();
    await ig.saveConfig({ backfill_enabled: 1 });
    const first = await ig.backfillTick();
    res.json({ success: true, added, first, stats: await ig.backfillStats() });
  } catch (e) { res.status(400).json({ success: false, error: ig.igError(e) }); }
});

router.post('/backfill/stop', async (req, res) => {
  try {
    await ig.saveConfig({ backfill_enabled: 0 });
    res.json({ success: true, stats: await ig.backfillStats() });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.post('/backfill/clear', async (req, res) => {
  try { await ig.clearBackfill(); res.json({ success: true }); }
  catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

module.exports = router;
