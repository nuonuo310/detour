(() => {
  if (!document.body.classList.contains('wild-page')) return;

  const pad = n => String(n).padStart(2, '0');
  const dateLabel = value => {
    const d = new Date(value);
    if (Number.isNaN(d.valueOf())) return '—';
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  };
  const timeLabel = value => {
    const d = new Date(value);
    if (Number.isNaN(d.valueOf())) return '—';
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  async function render() {
    const host = document.querySelector('#wake-history');
    const empty = document.querySelector('#wake-history-empty');
    if (!host) return;

    const data = await DetourData.load('wake');
    const records = [...(data?.records || [])].sort((a, b) => new Date(b.at) - new Date(a.at));
    if (!records.length) return;

    if (empty) empty.remove();
    host.innerHTML = '';

    records.forEach(record => {
      const article = document.createElement('article');
      article.className = 'wake-history-item';

      const tags = Array.isArray(record.tags) ? record.tags.filter(Boolean) : [];
      const meta = [record.action, ...tags.filter(tag => tag !== record.action)].filter(Boolean);

      article.innerHTML = `
        <div class="wake-history-time">
          <strong>${timeLabel(record.at)}</strong>
          <span>${dateLabel(record.at)}</span>
        </div>
        <div class="wake-history-copy">
          <div class="wake-history-topline">
            <h3>${record.action || '醒来了一下'}</h3>
            ${meta.length ? `<span>${meta.join(' · ')}</span>` : ''}
          </div>
          <p>${record.detail || '这次没有留下更多活动说明。'}</p>
          ${record.words ? `<blockquote>${record.words}</blockquote>` : ''}
        </div>`;
      host.appendChild(article);
    });

    const note = document.querySelector('.observation-note p');
    if (note && records.length >= 3) {
      const counts = new Map();
      records.forEach(record => {
        const key = record.action || '其他';
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      const [favorite, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      note.textContent = `已经捕捉到 ${records.length} 次出没。现在最常见的活动是「${favorite}」${count} 次；这里会继续随着真实记录变化。`;
    }
  }

  render();
})();
