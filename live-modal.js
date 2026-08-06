// ===== LIVE MODAL =====
(function () {
  function getYouTubeEmbedUrl(url, channelId) {
    if (url && url.trim()) {
      var v = url.trim(), vid = '';
      if (v.includes('v=')) vid = v.split('v=')[1].split('&')[0];
      else if (v.includes('youtu.be/')) vid = v.split('youtu.be/')[1].split('?')[0];
      else if (v.includes('youtube.com/live/')) vid = v.split('youtube.com/live/')[1].split('?')[0];
      if (vid) return { embed: 'https://www.youtube.com/embed/' + vid + '?autoplay=1', direct: 'https://www.youtube.com/watch?v=' + vid };
    }
    if (channelId && channelId.trim()) {
      var ch = channelId.trim();
      var chUrl = ch.startsWith('@') ? 'https://www.youtube.com/' + ch + '/live' : 'https://www.youtube.com/channel/' + ch + '/live';
      return { embed: 'https://www.youtube.com/embed/live_stream?channel=' + ch + '&autoplay=1', direct: chUrl };
    }
    return null;
  }

  window.openLiveModal = function () {
    var modal = document.getElementById('live-modal');
    var container = document.getElementById('live-player-container');
    var titleEl = document.getElementById('live-title-text');
    var openTabBtn = document.getElementById('live-open-tab-btn');
    if (!modal || !container) return;

    var cfg = window.siteConfig || {};
    var title = cfg.live_title || 'Transmissão Ao Vivo';
    if (titleEl) titleEl.textContent = title;

    if (cfg.live_status === 'off') {
      container.style.cssText = 'padding:48px 20px;';
      container.innerHTML = '<div style="text-align:center;color:#fff;"><div style="font-size:3rem;margin-bottom:12px;">📺</div><h3 style="margin:0 0 8px;font-size:1.1rem;">Sem Transmissão no Momento</h3><p style="color:rgba(255,255,255,0.6);font-size:0.9rem;margin:0;">Siga nossas redes sociais para acompanhar!</p></div>';
      if (openTabBtn) openTabBtn.style.display = 'none';
    } else {
      var result = getYouTubeEmbedUrl(cfg.live_video_url || '', cfg.live_youtube_channel_id || '');
      if (result) {
        container.style.cssText = 'position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;background:#000;';
        container.innerHTML = '<iframe src="' + result.embed + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:8px;"></iframe>';
        if (openTabBtn) {
          openTabBtn.style.display = 'inline-flex';
          openTabBtn.href = result.direct;
        }
      } else {
        container.style.cssText = 'padding:48px 20px;';
        container.innerHTML = '<div style="text-align:center;color:#fff;"><div style="font-size:3rem;margin-bottom:12px;">📡</div><h3 style="margin:0 0 8px;font-size:1.1rem;">Transmissão em Configuração</h3><p style="color:rgba(255,255,255,0.6);font-size:0.9rem;margin:0;">Insira o ID do Canal no Painel Admin (Aba Site) para ativar.</p></div>';
        if (openTabBtn) openTabBtn.style.display = 'none';
      }
    }

    modal.classList.remove('hidden');
  };

  window.closeLiveModal = function () {
    var m = document.getElementById('live-modal');
    var c = document.getElementById('live-player-container');
    if (m) m.classList.add('hidden');
    if (c) c.innerHTML = '';
  };

  document.addEventListener('DOMContentLoaded', function () {
    // delegação para funcionar mesmo se nav for substituído dinamicamente
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.live-indicator');
      if (btn) { e.preventDefault(); window.openLiveModal(); }
    });
    var closeBtn = document.getElementById('close-live-modal');
    var overlay = document.getElementById('live-modal-overlay');
    if (closeBtn) closeBtn.addEventListener('click', window.closeLiveModal);
    if (overlay) overlay.addEventListener('click', window.closeLiveModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') window.closeLiveModal();
    });
  });
})();
