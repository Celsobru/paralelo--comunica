const defaultNews = [
  {
    id: 1,
    category: "Política",
    title: "Novo pacote econômico é anunciado pelo governo federal",
    description: "Medidas visam ampliar investimentos em infraestrutura e reduzir juros para pessoas físicas e empresas do setor produtivo.",
    full_content: "O governo federal anunciou nesta terça-feira um novo pacote econômico que promete transformar o cenário de investimentos do país. As medidas incluem a criação de um fundo de R$ 50 bilhões para infraestrutura, redução da taxa Selic para empresas do setor produtivo e incentivos fiscais para construção civil.\n\nSegundo o Ministério da Economia, as novas regras devem gerar mais de 2 milhões de empregos diretos nos próximos dois anos. \"Estamos focados em devolver o Brasil ao crescimento sustentável\", declarou o ministro.\n\nOs analistas de mercado reagiram com cautela, mas de forma positiva. Para o economista-chefe do Banco XP, as medidas são um passo importante, mas precisam ser acompanhadas de reformas estruturais.",
    image: "https://images.unsplash.com/photo-1529400971008-f566de0e6dfc?auto=format&fit=crop&w=800&q=80",
    datetime: "há 12 minutos",
    source: "Paralelo Comunica"
  },
  {
    id: 2,
    category: "Esportes",
    title: "Seleção amplia preparação para a Copa América com jogos-treino",
    description: "Treinos presenciais começam com foco em velocidade e finalização dentro da concentração em Teresópolis.",
    full_content: "A seleção brasileira deu início aos treinos presenciais na concentração de Teresópolis com o foco total na Copa América. O técnico escalou os jogadores para sessões intensivas de tática e preparação física.\n\nDestaques para a presença de jogadores jovens que estão sendo testados pela primeira vez. O atacante do Palmeiras e o meia do Flamengo se destacaram nos primeiros treinos.\n\nA seleção disputará dois jogos-treino antes do início oficial do torneio, contra seleções sul-americanas.",
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80",
    datetime: "há 28 minutos",
    source: "Paralelo Comunica"
  },
  {
    id: 3,
    category: "Tecnologia",
    title: "Novas regulamentações para redes sociais entram em vigor no país",
    description: "Empresas precisarão oferecer transparência total sobre anúncios políticos e uso de dados pessoais dos usuários.",
    full_content: "A partir de hoje, entram em vigor as novas regulamentações para plataformas de redes sociais no Brasil. As empresas terão 90 dias para se adequar às novas regras.\n\nEntre as principais exigências estão: transparência total sobre algoritmos de recomendação, obrigação de remover conteúdo falso em até 24 horas após denúncia, e prestação de contas sobre anúncios políticos.\n\nA multa para descumprimento pode chegar a 10% do faturamento da empresa no Brasil.",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    datetime: "há 45 minutos",
    source: "Paralelo Comunica"
  },
  {
    id: 4,
    category: "Economia",
    title: "Banco Central mantém taxa Selic e sinaliza ajustes futuros",
    description: "Comitê de Política Monetária decide por manter os juros em 10,75% ao ano e avalia cenário inflacionário.",
    full_content: "O Comitê de Política Monetária (COPOM) do Banco Central decidiu, por unanimidade, manter a taxa Selic em 10,75% ao ano. A decisão vinha sendo esperada pelo mercado.\n\nNa ata da reunião, o COPOM sinalizou que pode iniciar um ciclo de cortes de juros já na próxima reunião, caso a inflação continue em trajetória de queda. O IPCA acumulado dos últimos 12 meses fechou em 4,2%, abaixo da meta de 4,5%.\n\nAnalistas veem a decisão como um sinal de cautela do banco central, que prefere aguardar mais dados antes de alterar os juros.",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80",
    datetime: "há 1 hora",
    source: "Paralelo Comunica"
  },
  {
    id: 5,
    category: "Nacional",
    title: "Operação policial desmonta esquema de desvio de verbas públicas",
    description: "Investigação durou 8 meses e envolveu órgãos federais e estaduais em cinco estados brasileiros.",
    full_content: "Uma grande operação policial deflagrada nesta madrugada desmontou um esquema de desvio de verbas públicas que atingia cinco estados brasileiros. Foram cumpridos 45 mandados de busca e apreensão.\n\nA investigação, que durou 8 meses, revelou que empresas fantasmas recebiam contratos públicos de construção civil e emitiam notas fiscais frias para desviar recursos.\n\nO prejuízo estimado para os cofres públicos é de R$ 120 milhões. Dez pessoas foram presas, incluindo dois ex-prefeitos e um deputado estadual.",
    image: "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?auto=format&fit=crop&w=800&q=80",
    datetime: "há 2 horas",
    source: "Paralelo Comunica"
  },
  {
    id: 6,
    category: "Internacional",
    title: "Cúpula global sobre clima aprova novas metas de redução de carbono",
    description: "Líderes de 190 países se comprometem a reduzir emissões em 40% até 2035 com investimentos verdes.",
    full_content: "A cúpula global sobre clima, realizada em Genebra, aprovou na madrugada de hoje novas metas ambiciosas de redução de emissões de carbono. 190 países assinaram o acordo histórico.\n\nO compromisso é reduzir as emissões globais em 40% até 2035, com investimentos de US$ 2 trilhões em energias renováveis. O Brasil se comprometeu a eliminar o desmatamento ilegal até 2030.\n\nO acordo ainda prevê a criação de um fundo de US$ 500 bilhões para ajudar países em desenvolvimento na transição energética.",
    image: "https://images.unsplash.com/photo-1569163139394-de4e4f43e4e3?auto=format&fit=crop&w=800&q=80",
    datetime: "há 3 horas",
    source: "Paralelo Comunica"
  },
  {
    id: 7,
    category: "Saúde",
    title: "Campanha nacional de vacinação atinge recorde de adesão",
    description: "Mais de 80% da população-alvo já tomou a primeira dose da vacina contra a gripe em 2026.",
    full_content: "O Ministério da Saúde informou que a campanha nacional de vacinação contra a gripe já atingiu 82% da população-alvo, um recorde histórico. São mais de 160 milhões de doses aplicadas.\n\nO sucesso da campanha é atribuído à ampliação da rede de postos de vacinação e à campanha de conscientização nas redes sociais. Pharmácias e supermercados também foram autorizados a aplicar a vacina.\n\nO pico de demanda é esperado nas próximas duas semanas, com a previsão de atingir 90% da meta até o final do mês.",
    image: "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=800&q=80",
    datetime: "há 4 horas",
    source: "Paralelo Comunica"
  },
  {
    id: 8,
    category: "Entretenimento",
    title: "Festival de Cinema Brasileiro anuncia Seleção Oficial 2026",
    description: "Produções independentes de 12 estados competem pelo prêmio de melhor filme no evento que acontece em SP.",
    full_content: "O Festival de Cinema Brasileiro de São Paulo anunciou a Seleção Oficial desta edição. 24 filmes de 12 estados competem pelo prêmio de melhor longa-metragem.\n\nEntre os favoritos estão produções independentes que já conquistaram prêmios em festivais internacionais. O destaque vai para um filme documentário sobre a cultura nordestina.\n\nO festival acontece entre os dias 10 e 20 de março, com sessões gratuitas em 5 cinemas da cidade. A premiação total ultrapassa R$ 500 mil.",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80",
    datetime: "há 5 horas",
    source: "Paralelo Comunica"
  }
];

const storageKey = 'paralelo-noticias';
const featuredNews = document.getElementById('featured-news');
const sidebarNews = document.getElementById('sidebar-news');
const gridNews = document.getElementById('grid-news');
const listNews = document.getElementById('list-news');

function loadNews() {
  const stored = localStorage.getItem(storageKey);
  return stored ? JSON.parse(stored) : defaultNews;
}

async function loadNewsFromServer(category, subcategory) {
  try {
    let url = '/api/news';
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (subcategory) params.append('subcategory', subcategory);
    if (params.toString()) url += '?' + params.toString();

    const response = await fetch(url);
    if (response.ok) {
      const serverNews = await response.json();
      if (serverNews.length > 0) {
        if (!category && !subcategory) localStorage.setItem(storageKey, JSON.stringify(serverNews));
        return serverNews;
      }
    }
  } catch (e) {}
  return loadNews();
}

function renderFeatured(items) {
  if (!items.length) return;
  const main = items[0];
  const img = main.image_url || main.image;
  if (main.video_url) {
    featuredNews.innerHTML = `
      <div class="card-video-wrap">
        <video src="${main.video_url}" muted autoplay loop playsinline style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;"></video>
        <div class="card-overlay">
          <span class="card-category">${main.category}</span>
          <h2 class="card-title">${main.title}</h2>
          <p class="card-desc">${main.description}</p>
        </div>
      </div>
    `;
  } else {
    featuredNews.innerHTML = `
      <div class="card-image" style="background-image:url('${img}')"></div>
      <div class="card-overlay">
        <span class="card-category">${main.category}</span>
        <h2 class="card-title">${main.title}</h2>
        <p class="card-desc">${main.description}</p>
      </div>
    `;
  }
  featuredNews.onclick = () => openModal(main);
}

function renderSidebar(items) {
  const side = items.slice(1, 5);
  const sidebarEl = document.getElementById('sidebar-news');
  sidebarEl.innerHTML = side.map(item => `
    <div class="card-side" data-id="${item.id}">
      <div class="thumb${item.video_url ? ' thumb-video' : ''}" style="background-image:url('${item.image_url || item.image}')">${item.video_url ? '<span class="play-icon-sm">&#9654;</span>' : ''}</div>
      <div class="card-info">
        <span class="card-category">${item.category}</span>
        <h3 class="card-title">${item.title}</h3>
      </div>
    </div>
  `).join('');
  sidebarEl.querySelectorAll('.card-side').forEach(card => {
    card.onclick = () => {
      const id = Number(card.dataset.id);
      const item = items.find(n => n.id === id);
      if (item) openModal(item);
    };
  });
}

function renderGrid(items) {
  const grid = items.slice(0, 8);
  gridNews.innerHTML = grid.map(item => `
    <article class="card-news" data-id="${item.id}">
      <div class="card-image${item.video_url ? ' card-image-video' : ''}" style="background-image:url('${item.image_url || item.image}')">${item.video_url ? '<span class="play-icon">&#9654;</span>' : ''}</div>
      <div class="card-content">
        <span class="card-category">${item.category}</span>
        <h3 class="card-title">${item.title}</h3>
        <p class="card-desc">${item.description}</p>
        <div class="card-meta">
          <span>${item.source}</span>
          <span>${item.datetime || item.created_at}</span>
        </div>
      </div>
    </article>
  `).join('');
  gridNews.querySelectorAll('.card-news').forEach(card => {
    card.onclick = () => {
      const id = Number(card.dataset.id);
      const item = items.find(n => n.id === id);
      if (item) openModal(item);
    };
  });
}

function renderList(items) {
  const list = items.slice(5, 10);
  listNews.innerHTML = list.map(item => `
    <article class="news-item" data-id="${item.id}">
      <div class="item-thumb${item.video_url ? ' thumb-video' : ''}" style="background-image:url('${item.image_url || item.image}')">${item.video_url ? '<span class="play-icon-sm">&#9654;</span>' : ''}</div>
      <div class="item-content">
        <span class="card-category">${item.category}</span>
        <h3 class="card-title">${item.title}</h3>
        <p class="card-desc">${item.description}</p>
        <span class="card-meta">${item.source} &middot; ${item.datetime || item.created_at}</span>
      </div>
    </article>
  `).join('');
  listNews.querySelectorAll('.news-item').forEach(item => {
    item.onclick = () => {
      const id = Number(item.dataset.id);
      const newsItem = items.find(n => n.id === id);
      if (newsItem) openModal(newsItem);
    };
  });
}

function openModal(item) {
  const modal = document.getElementById('news-modal');
  const modalImage = document.getElementById('modal-image');
  const contentEl = document.getElementById('modal-content');
  const fullText = item.full_content || item.description;

  if (item.video_url) {
    let videoHtml = '';
    const url = item.video_url;
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      const id = match ? match[1] : '';
      videoHtml = id ? `<iframe src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen style="width:100%;height:100%;"></iframe>` : '';
    } else if (url.includes('youtube.com/embed/')) {
      videoHtml = `<iframe src="${url}" frameborder="0" allowfullscreen style="width:100%;height:100%;"></iframe>`;
    } else {
      videoHtml = `<video src="${url}" controls style="width:100%;height:100%;object-fit:contain;background:#000;"></video>`;
    }
    modalImage.innerHTML = videoHtml;
    modalImage.style.backgroundImage = 'none';
    modalImage.style.display = 'block';
  } else {
    modalImage.innerHTML = '';
    modalImage.style.backgroundImage = `url('${item.image_url || item.image}')`;
    modalImage.style.display = 'block';
  }

  document.getElementById('modal-category').textContent = item.category;
  document.getElementById('modal-title').innerHTML = `<a href="/noticia.html?news=${item.id}" target="_blank" style="color:inherit;text-decoration:underline;text-underline-offset:4px;cursor:pointer;">${item.title}</a>`;
  document.getElementById('modal-meta').innerHTML = `<span>${item.source}</span> &middot; <span>${item.datetime || item.created_at}</span>`;
  contentEl.innerHTML = fullText.split('\n').map(p => `<p>${p}</p>`).join('');

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderModalAds();
}

function closeModal() {
  const modal = document.getElementById('news-modal');
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('news-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

let allAdSpaces = [];

async function loadAdSlots() {
  try {
    const response = await fetch('/api/ad-spaces-public');
    if (!response.ok) return;
    const spaces = await response.json();
    allAdSpaces = spaces;

    spaces.forEach(space => {
      let container = null;
      switch (space.position) {
        case 'header': container = document.getElementById('ad-header'); break;
        case 'sidebar-top': container = document.getElementById('ad-sidebar-top'); break;
        case 'sidebar-bottom': container = document.getElementById('ad-sidebar-bottom'); break;
        case 'in-feed': container = document.getElementById('ad-infeed-top'); break;
        case 'footer': container = document.getElementById('ad-footer'); break;
      }
      if (!container) return;

      if (space.availability === 'occupied') {
        container.innerHTML = renderAdHtml(space);
        container.style.display = 'block';
      } else {
        const siteCfg = window.siteConfig || {};
        const cleanPhone = (siteCfg.whatsapp_phone || '').replace(/\D/g, '');
        if (cleanPhone) {
          const waLink = `https://wa.me/${cleanPhone}?text=Olá!%20Gostaria%20de%20anunciar%20no%20espaço%20"${encodeURIComponent(space.name)}"%20do%20site.`;
          container.innerHTML = `
            <div class="ad-content ad-vacant">
              <a href="${waLink}" target="_blank" rel="noopener" class="ad-vacant-link" style="display:flex; flex-direction:column; align-items:center; justify-content:center; border:2px dashed #3b82f6; background:#eff6ff; color:#1e3a8a; padding:15px; text-decoration:none; border-radius:6px; transition:all 0.2s ease;">
                <span style="font-size:1.1rem; font-weight:700; color:#2563eb;">Anuncie Aqui!</span>
                <span style="font-size:0.8rem; color:#1e40af; margin-top:4px;">Espaço disponível: ${space.name} (${space.width}x${space.height})</span>
                <span style="font-size:0.75rem; color:#15803d; font-weight:600; margin-top:6px; display:inline-flex; align-items:center; gap:6px;">
                  <svg style="width:14px; height:14px; fill:currentColor;" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.863-9.73.001-2.595-1.013-5.035-2.855-6.882-1.844-1.848-4.293-2.865-6.887-2.866-5.439 0-9.862 4.37-9.865 9.73-.001 1.776.499 3.51 1.447 5.037l-.965 3.522 3.635-.953zm11.758-5.385c-.328-.164-1.942-.96-2.242-1.07-.3-.11-.518-.164-.736.164-.218.328-.845 1.07-1.036 1.29-.19.217-.38.245-.708.081-.328-.164-1.386-.511-2.64-1.63-1.002-.895-1.678-2.001-1.875-2.33-.197-.328-.021-.506.143-.668.147-.147.328-.383.492-.575.164-.191.218-.328.328-.547.11-.219.055-.41-.027-.575-.082-.164-.736-1.777-.999-2.434-.263-.636-.525-.55-.736-.56-.21-.01-.453-.01-.695-.01-.242 0-.636.09-.968.453-.332.364-1.27 1.242-1.27 3.029s1.3 3.5 1.482 3.743c.182.242 2.56 3.91 6.2 5.479.867.373 1.543.597 2.071.765.871.277 1.664.238 2.29.145.698-.104 1.942-.795 2.215-1.56.273-.765.273-1.422.191-1.56-.081-.138-.299-.219-.627-.383z"/></svg>
                  Contatar Administrador via WhatsApp
                </span>
              </a>
            </div>
          `;
          container.style.display = 'block';
        } else {
          container.style.display = 'none';
        }
      }
    });
  } catch (e) {}
}

function renderAdHtml(space) {
  let adHtml = '';
  if (space.ad_embed) {
    adHtml = `<div class="ad-embed-wrap">${space.ad_embed}</div>`;
  } else if (space.ad_video) {
    adHtml = `<video class="ad-video-player" src="${space.ad_video}" autoplay muted loop playsinline style="width:100%;height:auto;display:block;"></video>`;
  } else if (space.ad_image) {
    const linkTag = space.ad_link ? `<a href="${space.ad_link}" target="_blank" rel="noopener">` : '';
    const linkEnd = space.ad_link ? '</a>' : '';
    adHtml = `${linkTag}<img src="${space.ad_image}" alt="${space.ad_title || 'Publicidade'}" style="width:100%;height:auto;display:block;">${linkEnd}`;
  } else {
    adHtml = `<div class="ad-placeholder">${space.ad_title || 'Publicidade'}</div>`;
  }
  return `<div class="ad-content"><span class="ad-label">Publicidade</span>${adHtml}</div>`;
}

function renderModalAds() {
  const topContainer = document.getElementById('modal-ad-top');
  const bottomContainer = document.getElementById('modal-ad-bottom');

  const topSpace = allAdSpaces.find(s => s.position === 'article-top' && s.availability === 'occupied');
  const bottomSpace = allAdSpaces.find(s => s.position === 'article-bottom' && s.availability === 'occupied');

  if (topSpace) {
    topContainer.innerHTML = renderAdHtml(topSpace);
    topContainer.style.display = 'block';
  } else {
    topContainer.innerHTML = '';
    topContainer.style.display = 'none';
  }

  if (bottomSpace) {
    bottomContainer.innerHTML = renderAdHtml(bottomSpace);
    bottomContainer.style.display = 'block';
  } else {
    bottomContainer.innerHTML = '';
    bottomContainer.style.display = 'none';
  }
}

async function loadSiteStats() {
  try {
    const res = await fetch('/api/site-stats');
    if (!res.ok) return;
    const stats = await res.json();
    if (!stats) return;

    const visitsEl = document.getElementById('ticker-visits');
    const onlineEl = document.getElementById('ticker-online');
    if (visitsEl) visitsEl.textContent = Number(stats.total_visitors || 0).toLocaleString('pt-BR');

    if (onlineEl) {
      const max = Number(stats.online_max || 0);
      function randomOnline() {
        if (max === 0) { onlineEl.textContent = '0'; return; }
        const min = Math.max(1, Math.round(max * 0.05));
        const val = Math.floor(Math.random() * (max - min + 1)) + min;
        onlineEl.textContent = val.toLocaleString('pt-BR');
      }
      randomOnline();
      setInterval(randomOnline, 4000 + Math.random() * 3000);
    }
  } catch (e) {}
}

function renderHeaderNewsTicker(newsList) {
  const track = document.getElementById('header-news-track');
  if (!track || !newsList || newsList.length === 0) return;
  const items = newsList.slice(0, 8);
  const html = items.map(item => `
    <a href="/noticia.html?news=${item.id}" target="_blank">
      <span class="ticker-track-dot">&#9679;</span>
      <span>${item.title}</span>
    </a>
  `).join('');
  track.innerHTML = html + html;
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  const subcategory = params.get('subcategory');

  const newsItems = await loadNewsFromServer(category, subcategory);

  const pageTitle = document.getElementById('page-title');
  const featuredSection = document.getElementById('featured-news');
  const listSection = document.querySelector('.news-list');
  const sectionTitle = document.querySelector('.section-title');

  if (category) {
    const titleText = subcategory ? `${category} › ${subcategory}` : category;
    if (pageTitle) pageTitle.textContent = `${titleText} - Paralelo Comunica`;
    if (document.title) document.title = `${titleText} - Paralelo Comunica`;
    if (sectionTitle) sectionTitle.innerHTML = titleText;
    if (featuredSection) featuredSection.style.display = 'none';
  } else {
    if (pageTitle) pageTitle.textContent = 'Paralelo Comunica';
    if (featuredSection) featuredSection.style.display = '';
  }

  renderHeaderNewsTicker(newsItems);
  renderFeatured(newsItems);
  renderSidebar(newsItems);
  renderGrid(newsItems);
  renderList(newsItems);
  await Promise.all([loadAdSlots(), loadSiteStats()]);
}

init().catch(err => {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  const newsItems = loadNews();
  const filtered = category ? newsItems.filter(n => n.category === category) : newsItems;
  renderFeatured(filtered);
  renderSidebar(filtered);
  renderGrid(filtered);
  renderList(filtered);
});

// Dynamic Navbar Categories
async function loadDynamicNav() {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) return;
    const cats = await res.json();
    if (!Array.isArray(cats) || cats.length === 0) return;

    const navList = document.getElementById('main-nav-list');
    if (!navList) return;

    const currentCategory = new URLSearchParams(window.location.search).get('category');
    let html = `<li><a href="/" class="live-indicator">Ao Vivo</a></li>`;
    html += `<li><a href="/" class="${!currentCategory ? 'active' : ''}">Inicio</a></li>`;
    cats.forEach(c => {
      const isActive = currentCategory === c.name ? 'active' : '';
      const safeName = (c.name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      html += `<li><a href="/?category=${encodeURIComponent(c.name)}" class="${isActive}">${safeName}</a></li>`;
    });
    navList.innerHTML = html;
  } catch (e) {}
}
loadDynamicNav();

// Anti-Inspect Security
document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', event => {
  if (event.keyCode == 123 || (event.ctrlKey && event.shiftKey && event.keyCode == 73)) {
    event.preventDefault();
  }
});

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW Reg error:', err));
  });
}
