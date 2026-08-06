const form = document.getElementById('news-form');
const adminList = document.getElementById('admin-list');
const storageKey = 'paralelo-noticias';

function loadNews() {
  const stored = localStorage.getItem(storageKey);
  return stored ? JSON.parse(stored) : [];
}

function saveNews(news) {
  localStorage.setItem(storageKey, JSON.stringify(news));
}

function renderAdminList(news) {
  adminList.innerHTML = news.length === 0 ? '<p>Nenhuma notícia cadastrada.</p>' : news.map(item => `
    <article class="news-item">
      <div class="news-content">
        <h3 class="news-title">${item.title}</h3>
        <p class="news-description">${item.description}</p>
        <div class="news-meta">
          <span>${item.category}</span>
          <span>${item.datetime}</span>
        </div>
      </div>
    </article>
  `).join('');
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const news = loadNews();
  const newItem = {
    id: Date.now(),
    title: document.getElementById('title').value,
    category: document.getElementById('category').value,
    description: document.getElementById('description').value,
    image: document.getElementById('image').value,
    source: document.getElementById('source').value,
    datetime: document.getElementById('datetime').value,
  };
  news.unshift(newItem);
  saveNews(news);
  renderAdminList(news);
  form.reset();
});

renderAdminList(loadNews());
