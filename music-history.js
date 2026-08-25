(() => {
  if (!document.body.classList.contains('music-page')) return;

  const pad = n => String(n).padStart(2, '0');
  const formatDate = value => {
    const d = new Date(value);
    if (Number.isNaN(d.valueOf())) return '—';
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  async function renderHistory() {
    const host = document.querySelector('.playlist-empty');
    if (!host) return;

    let data;
    try {
      const response = await fetch('data/music.json', { cache: 'no-store' });
      if (!response.ok) return;
      data = await response.json();
    } catch {
      return;
    }

    const records = [...(data.records || [])].sort((a, b) => new Date(b.at) - new Date(a.at));
    if (!records.length) return;

    host.classList.add('music-history');
    host.replaceChildren();

    records.forEach((record, index) => {
      const article = document.createElement(record.url ? 'a' : 'article');
      article.className = 'music-history-card';
      if (record.url) {
        article.href = record.url;
        article.target = '_blank';
        article.rel = 'noopener noreferrer';
        article.setAttribute('aria-label', `打开 ${record.title || '这首歌'}`);
      }

      const number = document.createElement('span');
      number.className = 'music-history-number';
      number.textContent = String(records.length - index).padStart(2, '0');

      const copy = document.createElement('div');
      copy.className = 'music-history-copy';

      const meta = document.createElement('div');
      meta.className = 'music-history-meta';
      const date = document.createElement('time');
      date.dateTime = record.at || '';
      date.textContent = formatDate(record.at);
      const artist = document.createElement('span');
      artist.textContent = record.artist || '—';
      meta.append(date, artist);

      const title = document.createElement('h3');
      title.textContent = record.title || '未命名';

      const note = document.createElement('p');
      note.textContent = record.note || '这次没有留下小纸条。';

      copy.append(meta, title, note);
      article.append(number, copy);
      host.append(article);
    });
  }

  renderHistory();
})();
