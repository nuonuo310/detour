(() => {
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const fmt = value => {
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.valueOf())) return '日期待定';
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  };

  async function load() {
    try {
      const response = await fetch('data/date.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      return await response.json();
    } catch (error) {
      console.warn('Detour date archive unavailable:', error);
      return null;
    }
  }

  function photo(url, label, className = '') {
    if (!url) return `<div class="date-photo-empty ${className}"><span>${esc(label)}</span></div>`;
    return `<figure class="date-photo-real ${className}"><img src="${esc(url)}" alt="${esc(label)}" loading="lazy" /></figure>`;
  }

  function renderWishlist(items) {
    const host = document.querySelector('[data-date-wishlist]');
    if (!host || !items?.length) return;
    host.innerHTML = items.map((item, index) => `
      <article class="wish-card date-wish-row">
        <div><strong>${String(index + 1).padStart(2,'0')}</strong></div>
        <div>
          <div class="date-row-meta"><span>${esc(fmt(item.at))}</span>${item.area ? `<span>${esc(item.area)}</span>` : ''}</div>
          <h3>${esc(item.place || '想去的地方')}</h3>
          <p>${esc(item.note || item.reason || '等一个合适的日子。')}</p>
        </div>
      </article>`).join('');
  }

  function renderMemories(items) {
    const host = document.querySelector('[data-date-memories]');
    if (!host || !items?.length) return;
    host.innerHTML = items.map(item => {
      const photos = Array.isArray(item.photos) ? item.photos.filter(Boolean).slice(0,3) : [];
      return `<article class="date-memory-entry">
        <div class="memory-photos memory-photos-live">
          ${photo(photos[0], '主图', 'main-memory-photo')}
          ${photo(photos[1], '照片', 'small-memory-photo')}
          ${photo(photos[2], '照片', 'small-memory-photo')}
        </div>
        <div class="memory-copy">
          <div class="date-row-meta"><span>${esc(fmt(item.at))}</span>${item.place ? `<span>${esc(item.place)}</span>` : ''}</div>
          <h3>${esc(item.title || item.place || '一次约会')}</h3>
          <p>${esc(item.note || item.memory || '这一天已经留在 Detour 里。')}</p>
          ${item.favorite ? `<p class="date-favorite">最喜欢：${esc(item.favorite)}</p>` : ''}
        </div>
      </article>`;
    }).join('');
  }

  load().then(data => {
    if (!data) return;
    renderWishlist(data.wishlist || []);
    renderMemories(data.memories || []);
  });
})();
