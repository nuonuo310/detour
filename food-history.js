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
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const sameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
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
  const isTestRecord = record => {
    const text = [record.item, record.shop, record.reason, record.note].filter(Boolean).join(' ');
    return /联调|测试/.test(text);
  };

  async function render() {
    const data = await DetourData.load('food');
    const records = [...(data?.records || [])].sort((a, b) => new Date(b.at) - new Date(a.at));
    const visibleRecords = records.filter(record => !isTestRecord(record));
    const now = new Date();
    const todayRecords = visibleRecords.filter(record => {
      const d = new Date(record.at);
      return !Number.isNaN(d.valueOf()) && sameDay(d, now);
    });
    const monthRecords = visibleRecords.filter(record => {
      const d = new Date(record.at);
      return !Number.isNaN(d.valueOf()) && sameMonth(d, now);
    });

    const todayCard = document.querySelector('.today-feed-card');
    const latestToday = todayRecords[0];
    if (todayCard && latestToday) {
      const title = todayCard.querySelector('h2');
      const copy = todayCard.querySelector('.feed-copy p');
      const visual = todayCard.querySelector('.feed-visual span');
      if (visual) visual.textContent = time(latestToday.at);
      if (title) title.textContent = latestToday.item || '一份小投喂';
      if (copy) copy.textContent = [latestToday.shop, latestToday.reason].filter(Boolean).join(' · ') || '今天想到你，所以留下一份投喂。';
    }

    const statValues = document.querySelectorAll('.feed-stats strong');
    if (statValues[0]) statValues[0].textContent = pad(todayRecords.length);
    if (statValues[1]) statValues[1].textContent = pad(monthRecords.length);
    if (statValues[2]) statValues[2].textContent = pad(visibleRecords.length);

    document.querySelectorAll('.category-grid > div').forEach(item => {
      const label = item.querySelector('span')?.textContent?.trim();
      const value = item.querySelector('strong');
      if (!label || !value) return;
      value.textContent = String(visibleRecords.filter(record => record.category === label).length);
    });

    const recent = document.querySelector('.recent-feed');
    const latest = visibleRecords[0];
    if (recent && latest) {
      const oldRow = recent.querySelector('.feed-empty-row');
      if (oldRow) {
        oldRow.outerHTML = `
          <article class="feed-empty-row">
            <span class="feed-time">${time(latest.at)}</span>
            <div><h3>${escapeHtml(latest.item || '一份小投喂')}</h3><p>${escapeHtml([latest.shop, latest.reason].filter(Boolean).join(' · ') || '这次没有留下更多说明。')}</p></div>
          </article>`;
      }
    }

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
    if (category) category.textContent = mostCommon(visibleRecords.map(r => r.category));
    if (shop) shop.textContent = mostCommon(visibleRecords.map(r => r.shop));
    if (when) when.textContent = mostCommon(visibleRecords.map(r => timeBucket(r.at)));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  }

  render();
})();
