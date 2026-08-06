const sectionTitles = {
  spaces: 'Espacos Disponiveis',
  reservations: 'Minhas Reservas',
  myads: 'Meus Anuncios',
  news: 'Minhas Noticias',
};

const sections = {
  spaces: document.getElementById('section-spaces'),
  reservations: document.getElementById('section-reservations'),
  myads: document.getElementById('section-myads'),
  news: document.getElementById('section-news'),
};

const navItems = document.querySelectorAll('.sidebar-nav-item[data-section]');
const pageTitle = document.getElementById('page-title');

function showSection(name) {
  Object.values(sections).forEach(s => s.classList.add('hidden'));
  sections[name].classList.remove('hidden');
  navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.section === name);
  });
  pageTitle.textContent = sectionTitles[name] || name;
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
    scheduled: 'badge-draft',
    available: 'badge-active',
    draft: 'badge-draft',
    paused: 'badge-paused',
    inactive: 'badge-inactive',
    occupied: 'badge-occupied',
    expired: 'badge-inactive',
  };
  const labels = {
    available: 'Disponivel',
    occupied: 'Ocupado',
    active: 'Ativo',
    scheduled: 'Agendado',
    published: 'Publicado',
    draft: 'Rascunho',
    paused: 'Pausado',
    inactive: 'Inativo',
    expired: 'Expirado',
  };
  return `<span class="badge ${map[status] || 'badge-draft'}">${labels[status] || status}</span>`;
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
  'header': '&#9650; Topo',
  'sidebar-top': '&#9654; Sidebar',
  'sidebar-bottom': '&#9654; Sidebar',
  'in-feed': '&#9644; Meio',
  'article-top': '&#9650; Matéria',
  'article-bottom': '&#9660; Matéria',
  'footer': '&#9660; Rodapé',
};

async function loadUserInfo() {
  try {
    const user = await fetchJson('/api/me');
    if (user) {
      document.getElementById('user-name').textContent = user.name;
      document.getElementById('user-avatar').textContent = user.name.charAt(0).toUpperCase();
    }
    if (!user || user.role !== 'client') {
      window.location.href = '/login.html';
    }
  } catch (e) {
    window.location.href = '/login.html';
  }
}

async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const data = await fetchJson('/api/upload', { method: 'POST', body: formData });
  return data.url;
}

// ===== ESPACOS DISPONIVEIS =====
let allSpaces = [];

async function loadSpaces() {
  allSpaces = await fetchJson('/api/client/ad-spaces');
  const grid = document.getElementById('spaces-grid');

  const order = ['header', 'sidebar-top', 'in-feed', 'sidebar-bottom', 'article-top', 'article-bottom', 'footer'];
  const sorted = [...allSpaces].sort((a, b) => order.indexOf(a.position) - order.indexOf(b.position));

  if (!sorted.length) {
    grid.innerHTML = '<p class="empty-state">Nenhum espaco disponivel no momento.</p>';
    return;
  }

  grid.innerHTML = sorted.map((s, idx) => {
    const isAvail = s.availability === 'available';
    const price = s.price_cents === 0 ? 'Gratis' : `R$ ${(s.price_cents / 100).toFixed(0)}`;
    const pricePeriod = s.price_cents === 0 ? '' : '<span>/mes</span>';
    const quickLabel = s.price_cents === 0 ? 'Anuncio Rapido - Gratis (7 dias)' : `Anuncio Rapido - R$30 (7 dias)`;
    const posNum = { 'header': 1, 'sidebar-top': 2, 'sidebar-bottom': 3, 'in-feed': 4, 'article-top': 5, 'article-bottom': 6, 'footer': 7 };
    return `
      <div class="space-card ${isAvail ? 'space-available' : 'space-occupied'}">
        <div class="space-card-header">
          <span class="space-number">Campo ${posNum[s.position] || s.id}</span>
          <span class="space-position-badge">${positionIcons[s.position] || s.position}</span>
        </div>
        <h3 class="space-card-name">${s.name}</h3>
        <p class="space-card-size">${s.width} x ${s.height}</p>
        <p class="space-card-price">${price}${pricePeriod}</p>
        <p class="space-card-desc">${s.description || ''}</p>
        <div class="space-card-footer">
          ${isAvail
            ? `<button class="btn btn-primary btn-sm space-quick-btn" data-id="${s.id}" data-price="${s.price_cents}">${quickLabel}</button>
               <button class="btn btn-secondary btn-sm space-buy-btn" data-id="${s.id}">Personalizar</button>`
            : `<button class="btn btn-primary btn-sm space-reserve-btn" data-id="${s.id}" data-price="${s.price_cents}" data-name="${s.name}">Reservar</button>
               <span class="space-expires">Expira: ${s.expires_at || 'N/I'}</span>`
          }
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.space-quick-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const spaceId = Number(btn.dataset.id);
      const spacePrice = Number(btn.dataset.price);
      if (spacePrice === 0) {
        try {
          await fetchJson('/api/client/ads/quick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ad_space_id: spaceId, title: 'Anuncio Rapido' }),
          });
          alert('Anuncio criado gratuitamente! Ativo por 7 dias.');
          await Promise.all([loadSpaces(), loadMyAds()]);
          showSection('myads');
        } catch(err) {
          alert('Erro: ' + err.message);
        }
      } else {
        openPaymentModal(spaceId, 'quick');
      }
    });
  });
  grid.querySelectorAll('.space-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => openAdModal(Number(btn.dataset.id)));
  });
  grid.querySelectorAll('.space-reserve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const spaceId = Number(btn.dataset.id);
      const space = allSpaces.find(s => s.id === spaceId);
      if (space && space.price_cents === 0) {
        openReserveModal(spaceId);
      } else {
        openReserveModal(spaceId);
      }
    });
  });
}

// ===== MODAL CRIAR ANUNCIO =====
function openAdModal(spaceId) {
  const space = allSpaces.find(s => s.id === spaceId);
  if (!space) return;

  document.getElementById('ad-space-id').value = space.id;
  document.getElementById('ad-modal-title').textContent = `Criar Anuncio - ${space.name}`;
  document.getElementById('ad-modal-space-info').innerHTML = `
    <div class="space-info-bar">
      <span><strong>Espaco:</strong> ${space.name}</span>
      <span><strong>Dimensoes:</strong> ${space.width} x ${space.height}</span>
      <span><strong>Preco:</strong> R$ ${(space.price_cents / 100).toFixed(0)}/mes</span>
    </div>
  `;

  document.getElementById('ad-modal-dims').innerHTML = `
    <div class="ad-dims-box-inner">
      <span class="ad-dims-icon">&#9634;</span>
      <div>
        <strong>Tamanho recomendado da imagem:</strong> ${space.width} x ${space.height}
        <p class="ad-dims-sub">Crie sua imagem nesse tamanho exato para o melhor resultado.</p>
      </div>
    </div>
  `;

  document.getElementById('ad-dims-hint-img').textContent =
    `Formato ideal: ${space.width} x ${space.height} pixels. Crie a imagem no Canva, Photoshop ou similar nesse tamanho.`;

  // Reset to image mode
  document.querySelector('input[name="ad-type"][value="image"]').checked = true;
  document.getElementById('ad-type-image-fields').classList.remove('hidden');
  document.getElementById('ad-type-video-fields').classList.add('hidden');
  document.getElementById('ad-type-embed-fields').classList.add('hidden');

  document.getElementById('ad-modal-overlay').classList.remove('hidden');
  document.getElementById('ad-title').focus();
}

function closeAdModal() {
  document.getElementById('ad-modal-overlay').classList.add('hidden');
  document.getElementById('ad-modal-form').reset();
}

document.getElementById('ad-modal-close').addEventListener('click', closeAdModal);
document.getElementById('ad-modal-cancel').addEventListener('click', closeAdModal);
document.getElementById('ad-modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeAdModal();
});

document.querySelectorAll('input[name="ad-type"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const val = radio.value;
    const isImage = val === 'image';
    const isVideo = val === 'video';
    const isEmbed = val === 'embed';
    document.getElementById('ad-type-image-fields').classList.toggle('hidden', !isImage);
    document.getElementById('ad-type-video-fields').classList.toggle('hidden', !isVideo);
    document.getElementById('ad-type-embed-fields').classList.toggle('hidden', !isEmbed);
  });
});

document.getElementById('ad-modal-form').addEventListener('submit', async event => {
  event.preventDefault();
  const spaceId = Number(document.getElementById('ad-space-id').value);
  const adType = document.querySelector('input[name="ad-type"]:checked').value;

  let imageUrl = '';
  let videoUrl = '';

  if (adType === 'image') {
    const imageFile = document.getElementById('ad-image').files[0];
    if (imageFile) imageUrl = await uploadImage(imageFile);
  } else if (adType === 'video') {
    const videoFile = document.getElementById('ad-video').files[0];
    if (videoFile) {
      const formData = new FormData();
      formData.append('image', videoFile);
      const data = await fetchJson('/api/upload', { method: 'POST', body: formData });
      videoUrl = data.url;
    }
  }

  try {
    await fetchJson('/api/client/ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ad_space_id: spaceId,
        title: document.getElementById('ad-title').value,
        link: document.getElementById('ad-link').value,
        image_url: imageUrl,
        video_url: videoUrl,
        embed_code: adType === 'embed' ? document.getElementById('ad-embed').value : '',
        start_date: document.getElementById('ad-start').value || null,
        end_date: document.getElementById('ad-end').value || null,
      }),
    });
    closeAdModal();
    await Promise.all([loadSpaces(), loadMyAds()]);
    showSection('myads');
  } catch (err) {
    alert('Erro ao criar anuncio: ' + err.message);
  }
});

// ===== MODAL RESERVAR =====
let reserveSpaceId = null;

function openReserveModal(spaceId) {
  const space = allSpaces.find(s => s.id === spaceId);
  if (!space) return;
  reserveSpaceId = spaceId;

  document.getElementById('reserve-space-id').value = spaceId;
  document.getElementById('reserve-space-info').innerHTML = `
    <strong>${space.name}</strong><br>
    <span style="font-size:0.85rem;">${space.width} x ${space.height} - R$ ${(space.price_cents/100).toFixed(0)}/mes</span>
  `;

  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 1);
  document.getElementById('reserve-start').min = minDate.toISOString().split('T')[0];
  document.getElementById('reserve-start').value = minDate.toISOString().split('T')[0];

  updateReserveEndDate();
  document.getElementById('reserve-modal-overlay').classList.remove('hidden');
}

function updateReserveEndDate() {
  const startStr = document.getElementById('reserve-start').value;
  if (!startStr) return;
  const start = new Date(startStr);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  document.getElementById('reserve-end').min = new Date(start.getTime() + 7 * 86400000).toISOString().split('T')[0];
  const maxDate = new Date(start);
  maxDate.setDate(maxDate.getDate() + 30);
  document.getElementById('reserve-end').max = maxDate.toISOString().split('T')[0];
  if (!document.getElementById('reserve-end').value) {
    document.getElementById('reserve-end').value = end.toISOString().split('T')[0];
  }
  updateReservePrice();
}

function updateReservePrice() {
  const startStr = document.getElementById('reserve-start').value;
  const endStr = document.getElementById('reserve-end').value;
  const infoEl = document.getElementById('reserve-price-info');
  if (!startStr || !endStr) { infoEl.style.display = 'none'; return; }
  const days = Math.ceil((new Date(endStr) - new Date(startStr)) / 86400000);
  if (days < 7) {
    infoEl.textContent = 'Minimo 7 dias';
    infoEl.style.display = 'block';
    infoEl.style.background = '#e74c3c';
    return;
  }
  if (days > 30) {
    infoEl.textContent = 'Maximo 30 dias';
    infoEl.style.display = 'block';
    infoEl.style.background = '#e74c3c';
    return;
  }
  const space = allSpaces.find(s => s.id === reserveSpaceId);
  if (!space) return;
  if (space.price_cents === 0) {
    infoEl.textContent = `${days} dias - Gratis`;
    infoEl.style.display = 'block';
    infoEl.style.background = 'var(--success)';
  } else {
    const priceCents = Math.round(space.price_cents / 30 * days);
    infoEl.textContent = `${days} dias - R$ ${(priceCents/100).toFixed(2)}`;
    infoEl.style.display = 'block';
    infoEl.style.background = 'var(--accent)';
  }
}

document.getElementById('reserve-start').addEventListener('change', updateReserveEndDate);
document.getElementById('reserve-end').addEventListener('change', updateReservePrice);

document.getElementById('reserve-form').addEventListener('submit', async event => {
  event.preventDefault();
  const body = {
    ad_space_id: reserveSpaceId,
    start_date: document.getElementById('reserve-start').value,
    end_date: document.getElementById('reserve-end').value,
  };
  try {
    const result = await fetchJson('/api/client/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    document.getElementById('reserve-modal-overlay').classList.add('hidden');
    if (result.is_free) {
      alert('Reserva criada gratuitamente! Envie o conteudo do anuncio.');
      await Promise.all([loadSpaces(), loadReservations()]);
      showSection('reservations');
      openEditAdModal(result.id, {
        space_id: reserveSpaceId,
        space_name: allSpaces.find(s => s.id === reserveSpaceId)?.name || '',
        width: allSpaces.find(s => s.id === reserveSpaceId)?.width || '',
        height: allSpaces.find(s => s.id === reserveSpaceId)?.height || '',
      });
    } else {
      alert('Reserva solicitada com sucesso! Aguarde a aprovacao do administrador.');
      await Promise.all([loadSpaces(), loadReservations()]);
      showSection('reservations');
    }
  } catch (err) {
    alert('Erro: ' + err.message);
  }
});

document.getElementById('reserve-modal-close').addEventListener('click', () => {
  document.getElementById('reserve-modal-overlay').classList.add('hidden');
});
document.getElementById('reserve-modal-cancel').addEventListener('click', () => {
  document.getElementById('reserve-modal-overlay').classList.add('hidden');
});
document.getElementById('reserve-modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
});

// ===== MODAL PAGAMENTO =====
let paymentData = {};

function openPaymentModal(spaceId, type, reservationResult, reservationId) {
  const space = allSpaces.find(s => s.id === spaceId);
  paymentData = { spaceId, type, space, reservation: reservationResult, reservationId };

  let amount = 3000;
  let desc = 'Anuncio Rapido - 7 dias';
  let days = 7;

  if (type === 'reservation' && reservationResult) {
    amount = reservationResult.price_cents;
    days = reservationResult.total_days;
    desc = `Reserva - ${days} dias`;
  }

  document.getElementById('payment-desc').textContent = desc;
  document.getElementById('payment-amount').textContent = `R$ ${(amount/100).toFixed(2)}`;
  document.getElementById('payment-days').textContent = `${days} dias de exposicao`;

  try {
    const config = fetchJson('/api/payment-config').then(config => {
      const pixKey = config.pix_key || 'Configure no painel admin';
      document.getElementById('payment-pix-key').textContent = pixKey;
      document.getElementById('payment-pix-name').textContent = config.pix_name ? `Titular: ${config.pix_name}` : '';
      const pixQr = document.getElementById('payment-pix-qr');
      pixQr.innerHTML = '';
      if (config.pix_key) {
        const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixKey)}`;
        pixQr.innerHTML = `<img src="${qrApi}" alt="QR Code PIX" style="width:200px;height:200px;">`;
      } else {
        pixQr.innerHTML = '<p style="color:var(--danger);">Chave PIX nao configurada</p>';
      }
    });
  } catch(e) {}

  document.getElementById('payment-modal-overlay').classList.remove('hidden');
}

document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const val = radio.value;
    document.getElementById('payment-pix-section').classList.toggle('hidden', val !== 'pix');
    document.getElementById('payment-card-section').classList.toggle('hidden', val !== 'card');
  });
});

document.getElementById('btn-confirm-payment').addEventListener('click', async () => {
  const method = document.querySelector('input[name="payment-method"]:checked').value;
  if (paymentData.type === 'quick') {
    try {
      await fetchJson('/api/client/ads/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad_space_id: paymentData.spaceId, title: 'Anuncio Rapido' }),
      });
      alert('Pagamento confirmado! Anuncio ativo por 7 dias.');
      document.getElementById('payment-modal-overlay').classList.add('hidden');
      await Promise.all([loadSpaces(), loadMyAds()]);
      showSection('myads');
    } catch(err) {
      alert('Erro: ' + err.message);
    }
  } else if (paymentData.type === 'reservation') {
    try {
      await fetchJson(`/api/client/reservations/${paymentData.reservationId}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: method }),
      });
      alert('Pagamento registrado! Agora envie o conteudo do seu anuncio.');
      document.getElementById('payment-modal-overlay').classList.add('hidden');
      await loadReservations();
      openEditAdModal(paymentData.reservationId);
    } catch(err) {
      alert('Erro: ' + err.message);
    }
  }
});

document.getElementById('payment-modal-close').addEventListener('click', () => {
  document.getElementById('payment-modal-overlay').classList.add('hidden');
});
document.getElementById('payment-modal-cancel').addEventListener('click', () => {
  document.getElementById('payment-modal-overlay').classList.add('hidden');
});
document.getElementById('payment-modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
});

// ===== MINHAS RESERVAS =====
async function loadReservations() {
  const reservations = await fetchJson('/api/client/reservations');
  const tbody = document.getElementById('reservations-table');
  if (!reservations.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhuma reserva. Va em "Espacos Disponiveis" para reservar.</td></tr>';
    return;
  }
  const statusBadge = s => {
    const map = { pending: 'badge-draft', approved: 'badge-active', paid: 'badge-active', rejected: 'badge-occupied', expired: 'badge-inactive' };
    const labels = { pending: 'Pendente', approved: 'Aprovada - Pague', paid: 'Paga - Envie o anuncio', rejected: 'Rejeitada', expired: 'Expirada' };
    return `<span class="badge ${map[s] || 'badge-draft'}">${labels[s] || s}</span>`;
  };
  tbody.innerHTML = reservations.map(r => `
    <tr>
      <td>${r.space_name}</td>
      <td>${r.start_date}</td>
      <td>${r.end_date}</td>
      <td>${r.total_days}</td>
      <td>R$ ${(r.price_cents/100).toFixed(2)}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="actions">
        ${r.status === 'approved' ? `<button class="btn btn-sm btn-primary res-pay" data-id="${r.id}" data-price="${r.price_cents}" data-days="${r.total_days}" data-space="${r.ad_space_id}">Pagar</button>` : ''}
        ${r.status === 'paid' ? `<button class="btn btn-sm btn-primary res-edit-ad" data-id="${r.id}" data-space="${r.ad_space_id}" data-space-name="${r.space_name}" data-width="${r.width}" data-height="${r.height}">Enviar Anuncio</button>` : ''}
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.res-pay').forEach(btn => {
    btn.addEventListener('click', () => {
      openPaymentModal(Number(btn.dataset.space), 'reservation', {
        price_cents: Number(btn.dataset.price),
        total_days: Number(btn.dataset.days),
      }, Number(btn.dataset.id));
    });
  });
  tbody.querySelectorAll('.res-edit-ad').forEach(btn => {
    btn.addEventListener('click', () => {
      openEditAdModal(Number(btn.dataset.id), {
        space_id: Number(btn.dataset.space),
        space_name: btn.dataset.spaceName,
        width: btn.dataset.width,
        height: btn.dataset.height,
      });
    });
  });
}

// ===== MODAL EDITAR ANUNCIO (RESERVA) =====
let editAdReservationId = null;

function openEditAdModal(reservationId, spaceInfo) {
  editAdReservationId = reservationId;
  document.getElementById('edit-ad-reservation-id').value = reservationId;
  document.getElementById('edit-ad-id').value = '';

  if (spaceInfo) {
    document.getElementById('edit-ad-space-info').innerHTML = `<strong>${spaceInfo.space_name}</strong>`;
    document.getElementById('edit-ad-dims').textContent = `${spaceInfo.width} x ${spaceInfo.height}`;
    document.getElementById('edit-ad-dims-hint-img').textContent = `Tamanho ideal: ${spaceInfo.width} x ${spaceInfo.height}`;
  }

  document.getElementById('edit-ad-title').value = '';
  document.getElementById('edit-ad-link').value = '';
  document.getElementById('edit-ad-embed').value = '';

  document.getElementById('edit-ad-modal-overlay').classList.remove('hidden');
}

document.querySelectorAll('input[name="edit-ad-type"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const val = radio.value;
    document.getElementById('edit-ad-type-image-fields').classList.toggle('hidden', val !== 'image');
    document.getElementById('edit-ad-type-video-fields').classList.toggle('hidden', val !== 'video');
    document.getElementById('edit-ad-type-embed-fields').classList.toggle('hidden', val !== 'embed');
  });
});

document.getElementById('edit-ad-form').addEventListener('submit', async event => {
  event.preventDefault();
  const adType = document.querySelector('input[name="edit-ad-type"]:checked').value;
  let imageUrl = '', videoUrl = '', embedCode = '';

  if (adType === 'image') {
    const file = document.getElementById('edit-ad-image').files[0];
    if (file) imageUrl = await uploadImage(file);
  } else if (adType === 'video') {
    const file = document.getElementById('edit-ad-video').files[0];
    if (file) videoUrl = await uploadImage(file);
  } else {
    embedCode = document.getElementById('edit-ad-embed').value;
  }

  try {
    const existingAdId = document.getElementById('edit-ad-id').value;
    if (existingAdId) {
      await fetchJson(`/api/client/ads/${existingAdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: document.getElementById('edit-ad-title').value,
          link: document.getElementById('edit-ad-link').value,
          image_url: imageUrl || undefined,
          video_url: videoUrl || undefined,
          embed_code: embedCode || undefined,
        }),
      });
      alert('Anuncio atualizado! Ele sera ativado automaticamente na data de inicio.');
    } else {
      await fetchJson('/api/client/ads/from-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservation_id: editAdReservationId,
          title: document.getElementById('edit-ad-title').value,
          link: document.getElementById('edit-ad-link').value,
          image_url: imageUrl,
          video_url: videoUrl,
          embed_code: embedCode,
        }),
      });
      alert('Anuncio enviado com sucesso! Ele sera ativado na data de inicio.');
    }
    document.getElementById('edit-ad-modal-overlay').classList.add('hidden');
    await Promise.all([loadReservations(), loadMyAds()]);
  } catch(err) {
    alert('Erro: ' + err.message);
  }
});

document.getElementById('edit-ad-modal-close').addEventListener('click', () => {
  document.getElementById('edit-ad-modal-overlay').classList.add('hidden');
});
document.getElementById('edit-ad-modal-cancel').addEventListener('click', () => {
  document.getElementById('edit-ad-modal-overlay').classList.add('hidden');
});
document.getElementById('edit-ad-modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
});

// ===== MEUS ANUNCIOS =====
async function loadMyAds() {
  const ads = await fetchJson('/api/client/ads');
  const table = document.getElementById('myads-table');
  if (!ads.length) {
    table.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhum anúncio ativo. Contrate um espaço na aba "Espaços Disponíveis".</td></tr>';
    return;
  }
  table.innerHTML = ads.map(item => `
    <tr>
      <td><strong>${item.title}</strong></td>
      <td>${item.space_name}</td>
      <td>${item.width} x ${item.height}</td>
      <td>${badgeForStatus(item.status)}</td>
      <td>${item.start_date || '-'}</td>
      <td>${item.end_date || '-'}</td>
      <td class="actions">
        <button data-id="${item.id}" class="btn btn-sm btn-delete delete-ad">Remover</button>
      </td>
    </tr>
  `).join('');

  table.querySelectorAll('.delete-ad').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remover este anúncio? O espaço ficará disponível novamente.')) return;
      await fetchJson(`/api/client/ads/${btn.dataset.id}`, { method: 'DELETE' });
      await Promise.all([loadMyAds(), loadSpaces()]);
    });
  });
}

// ===== MINHAS NOTICIAS =====
let pendingNewsId = null;
let newsConfig = { price_per_day_cents: 1000, min_days: 2, max_days: 10 };

async function loadNewsConfig() {
  try {
    newsConfig = await fetchJson('/api/news-config');
    buildDurationSelect();
  } catch(e) {}
}

function buildDurationSelect() {
  const select = document.getElementById('news-duration');
  select.innerHTML = '';
  for (let d = newsConfig.min_days; d <= newsConfig.max_days; d++) {
    const price = (d * newsConfig.price_per_day_cents / 100).toFixed(2).replace('.', ',');
    const selected = d === 5 ? ' selected' : '';
    select.innerHTML += `<option value="${d}"${selected}>${d} dias - R$ ${price}</option>`;
  }
  updateNewsPriceDisplay();
}

function updateNewsPriceDisplay() {
  const days = parseInt(document.getElementById('news-duration').value) || newsConfig.min_days;
  const price = (days * newsConfig.price_per_day_cents / 100).toFixed(2).replace('.', ',');
  document.getElementById('news-price-display').textContent = `R$ ${price}`;
}

document.getElementById('news-duration').addEventListener('change', updateNewsPriceDisplay);

async function loadNews() {
  const news = await fetchJson('/api/client/news');
  const table = document.getElementById('news-table');
  if (!news.length) {
    table.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhuma noticia cadastrada.</td></tr>';
    return;
  }
  const paymentBadge = s => {
    const map = { pending: 'badge-draft', paid: 'badge-active' };
    const labels = { pending: 'Aguardando Pagamento', paid: 'Pago' };
    return `<span class="badge ${map[s] || 'badge-draft'}">${labels[s] || s}</span>`;
  };
  table.innerHTML = news.map(item => `
    <tr>
      <td><strong>${item.title}</strong></td>
      <td>${item.category}</td>
      <td>${badgeForStatus(item.status)}</td>
      <td>${paymentBadge(item.payment_status)}</td>
      <td>${item.expires_at || '-'}</td>
      <td class="actions">
        ${item.payment_status === 'pending' ? `<button class="btn btn-sm btn-primary news-pay" data-id="${item.id}">Pagar</button>` : ''}
        ${item.payment_status === 'pending' ? `<button class="btn btn-sm btn-secondary news-delete" data-id="${item.id}">Excluir</button>` : ''}
        ${item.payment_status === 'paid' && item.status !== 'expired' ? `<button class="btn btn-sm btn-delete news-delete-paid" data-id="${item.id}">Excluir</button>` : ''}
      </td>
    </tr>
  `).join('');

  table.querySelectorAll('.news-pay').forEach(btn => {
    btn.addEventListener('click', () => openNewsPaymentModal(Number(btn.dataset.id)));
  });
  table.querySelectorAll('.news-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir esta noticia?')) return;
      await fetchJson(`/api/client/news/${btn.dataset.id}`, { method: 'DELETE' });
      await loadNews();
    });
  });
  table.querySelectorAll('.news-delete-paid').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir esta noticia paga? Ela sera removida do site.')) return;
      try {
        await fetchJson(`/api/client/news/${btn.dataset.id}`, { method: 'DELETE' });
        await loadNews();
      } catch(e) {
        alert('Erro: ' + e.message);
      }
    });
  });
}

document.getElementById('news-form').addEventListener('submit', async event => {
  event.preventDefault();
  const imageFile = document.getElementById('image-file').files[0];
  let imageUrl = '';
  if (imageFile) imageUrl = await uploadImage(imageFile);
  try {
    const result = await fetchJson('/api/client/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: document.getElementById('title').value,
        category: document.getElementById('category').value,
        description: document.getElementById('description').value,
        full_content: document.getElementById('full-content').value,
        image_url: imageUrl,
        source: document.getElementById('source').value,
        datetime: '',
        duration_days: document.getElementById('news-duration').value,
      }),
    });
    document.getElementById('news-form').reset();
    updateNewsPriceDisplay();
    await loadNews();
    if (result.is_free) {
      alert('Noticia publicada gratuitamente!');
    } else {
      pendingNewsId = result.id;
      pendingNewsPrice = result.price_cents;
      openNewsPaymentModal(result.id, result.price_cents);
    }
  } catch (err) {
    alert('Erro: ' + err.message);
  }
});

// ===== MODAL PAGAMENTO NOTICIA =====
let pendingNewsPrice = 5000;

function openNewsPaymentModal(newsId, priceCents) {
  pendingNewsId = newsId;
  if (priceCents) pendingNewsPrice = priceCents;
  document.getElementById('news-payment-amount').textContent = `R$ ${(pendingNewsPrice/100).toFixed(2).replace('.', ',')}`;
  try {
    fetchJson('/api/payment-config').then(config => {
      const pixKey = config.pix_key || 'Configure no painel admin';
      document.getElementById('news-payment-pix-key').textContent = pixKey;
      document.getElementById('news-payment-pix-name').textContent = config.pix_name ? `Titular: ${config.pix_name}` : '';
      const pixQr = document.getElementById('news-payment-pix-qr');
      pixQr.innerHTML = '';
      if (config.pix_key) {
        const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixKey)}`;
        pixQr.innerHTML = `<img src="${qrApi}" alt="QR Code PIX" style="width:200px;height:200px;">`;
      } else {
        pixQr.innerHTML = '<p style="color:var(--danger);">Chave PIX nao configurada</p>';
      }
    });
  } catch(e) {}
  document.getElementById('news-payment-modal-overlay').classList.remove('hidden');
}

document.querySelectorAll('input[name="news-payment-method"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const val = radio.value;
    document.getElementById('news-payment-pix-section').classList.toggle('hidden', val !== 'pix');
    document.getElementById('news-payment-card-section').classList.toggle('hidden', val !== 'card');
  });
});

document.getElementById('btn-confirm-news-payment').addEventListener('click', async () => {
  const method = document.querySelector('input[name="news-payment-method"]:checked').value;
  try {
    await fetchJson(`/api/client/news/${pendingNewsId}/pay`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_method: method }),
    });
    alert('Pagamento confirmado! Noticia publicada com sucesso.');
    document.getElementById('news-payment-modal-overlay').classList.add('hidden');
    await loadNews();
  } catch(err) {
    alert('Erro: ' + err.message);
  }
});

document.getElementById('news-payment-modal-close').addEventListener('click', () => {
  document.getElementById('news-payment-modal-overlay').classList.add('hidden');
});
document.getElementById('news-payment-modal-cancel').addEventListener('click', () => {
  document.getElementById('news-payment-modal-overlay').classList.add('hidden');
});
document.getElementById('news-payment-modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
});

// ===== INIT =====
async function init() {
  await loadUserInfo();
  await Promise.all([loadSpaces(), loadReservations(), loadMyAds(), loadNews(), loadNewsConfig()]);
}

showSection('spaces');
init().catch(err => console.error(err));
