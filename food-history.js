(() => {
  if (!document.body.classList.contains('food-page') || typeof DetourData === 'undefined') return;

  const pad = n => String(n).padStart(2, '0');
  const time = value => {
    const d = new Date(value);
    return Number.isNaN(d.valueOf()) ? '—' : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const date = value => {
    const d = new Date(value);
    return Number.isNaN(d.valueOf()) ? '—' : `${d.getMonth() + 1}.${pad(d.getDate())}`;
  };
  const mostCommon = values => {
    const counts = new Map();
    for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  };
  const timeBucket = value => {
    const d = new Date(value);
    if (Number.isNaN(d.valueOf())) return null;
    const h = d.getHours();
    if (h < 6) return '凌晨';
    if (h < 11) return '上午';
    if (h < 14) return '中午';
    if (h < 18) return '下午';
    if (h < 22) return '晚上';
    return '深夜';
  };

  async function render() {
    const data = await DetourData.load('food');
    const records = [...(data?.records || [])].sort((a, b) => new Date(b.at) - new Date(a.at));
    const list = document.querySelector('.feed-history-list');
    if (list && records.length) {
      list.innerHTML = records.map(record => `
        <article class="feed-history-row">
          <div class="feed-history-meta"><span>${date(record.at)}</span><time>${time(record.at)}</time></div>
          <div class="feed-history-main">
            <div class="feed-history-title"><h3>${escapeHtml(record.item || '一份小投喂')}</h3><span>${escapeHtml(record.category || '投喂')}</span></div>
            <p>${escapeHtml([record.shop, record.reason].filter(Boolean).join(' · ') || '这次没有留下更多说明。')}</p>
            ${record.note ? `<small>${escapeHtml(record.note)}</small>` : ''}
          </div>
        </article>`).join('');
    }

    const category = document.querySelector('[data-favorite="category"]');
    const shop = document.querySelector('[data-favorite="shop"]');
    const when = document.querySelector('[data-favorite="time"]');
    if (category) category.textContent = mostCommon(records.map(r => r.category));
    if (shop) shop.textContent = mostCommon(records.map(r => r.shop));
    if (when) when.textContent = mostCommon(records.map(r => timeBucket(r.at)));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  }

  render();
})();
