const DetourData = (() => {
  const cache = new Map();

  async function load(name) {
    if (cache.has(name)) return cache.get(name);
    const promise = fetch(`data/${name}.json`, { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error(`${name}: ${r.status}`);
        return r.json();
      })
      .catch(err => {
        console.warn('Detour data unavailable:', err);
        return null;
      });
    cache.set(name, promise);
    return promise;
  }

  const pad = n => String(n).padStart(2, '0');
  const sameDay = (a, b = new Date()) => a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const sameMonth = (a, b = new Date()) => a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  const asDate = value => value ? new Date(value) : null;
  const time = value => {
    const d = asDate(value);
    return d && !Number.isNaN(d.valueOf()) ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '—';
  };

  async function hydrateHome() {
    const line = document.querySelector('.today-line');
    if (!line) return;
    const [music, food, wake, date] = await Promise.all(['music','food','wake','date'].map(load));
    const candidates = [];
    for (const [type, data] of [['music',music],['food',food],['wake',wake]]) {
      for (const record of data?.records || []) {
        const d = asDate(record.at);
        if (d && !Number.isNaN(d.valueOf())) candidates.push({ type, record, d });
      }
    }
    if (date?.next?.at) {
      const d = asDate(date.next.at);
      if (d && !Number.isNaN(d.valueOf())) candidates.push({ type: 'date', record: date.next, d });
    }
    candidates.sort((a,b) => b.d - a.d);
    const latest = candidates[0];
    if (!latest) return;
    const copy = {
      music: `沈述给糯糯留了一首歌 · ${latest.record.title || '未命名'}`,
      food: `沈述投喂了糯糯 · ${latest.record.item || '一份小东西'}`,
      wake: `野生沈述醒来过 · ${latest.record.action || '留下了一点痕迹'}`,
      date: `沈述准备了一条约会计划 · ${latest.record.place || '地点待定'}`
    };
    line.textContent = `${time(latest.record.at)} · ${copy[latest.type]}`;
  }

  async function hydrateMusic() {
    if (!document.body.classList.contains('music-page')) return;
    const data = await load('music');
    if (!data) return;
    const records = [...(data.records || [])].sort((a,b) => new Date(b.at) - new Date(a.at));
    const now = new Date();
    const total = records.length;
    const month = records.filter(r => sameMonth(asDate(r.at), now)).length;
    const latest = records[0];
    const count = document.querySelector('.music-count');
    if (count) count.textContent = `${String(total).padStart(2,'0')} 次`;
    const overview = document.querySelectorAll('.music-overview strong');
    if (overview[0]) overview[0].textContent = String(month).padStart(2,'0');
    if (overview[1]) overview[1].textContent = latest ? time(latest.at) : '—';
    const mark = document.querySelector('.playlist-mark');
    if (mark) mark.textContent = String(total).padStart(2,'0');
    if (!latest) return;
    const title = document.querySelector('.track-meta h2');
    const artist = document.querySelector('.artist');
    const note = document.querySelector('.note-card p');
    const empty = document.querySelector('.playlist-empty');
    if (title) title.textContent = latest.title || '未命名';
    if (artist) artist.textContent = latest.artist || '—';
    if (note) note.textContent = latest.note || '这次没有留下小纸条。';
    if (empty) {
      empty.querySelector('h3').textContent = `${total} 首歌留在这里。`;
      empty.querySelector('p').textContent = records.slice(0,3).map(r => r.title || '未命名').join(' · ');
    }
  }

  async function hydrateFood() {
    if (!document.body.classList.contains('food-page')) return;
    const data = await load('food');
    if (!data) return;
    const records = [...(data.records || [])].sort((a,b) => new Date(b.at) - new Date(a.at));
    const now = new Date();
    const today = records.filter(r => sameDay(asDate(r.at), now));
    const month = records.filter(r => sameMonth(asDate(r.at), now));
    const latest = records[0];
    const stats = document.querySelectorAll('.feed-stats strong');
    [today.length, month.length, records.length].forEach((n,i) => { if (stats[i]) stats[i].textContent = String(n).padStart(2,'0'); });
    const categories = ['奶茶','外卖','零食','礼物','日用品','宠物用品'];
    const boxes = document.querySelectorAll('.category-grid div');
    categories.forEach((name,i) => {
      const count = records.filter(r => r.category === name).length;
      if (boxes[i]) boxes[i].querySelector('strong').textContent = count;
    });
    if (!latest) return;
    const head = document.querySelector('.feed-copy h2');
    const desc = document.querySelector('.feed-copy p');
    if (head) head.textContent = latest.item || '一份小投喂';
    if (desc) desc.textContent = latest.note || latest.shop || '这次没有留下备注。';
    const row = document.querySelector('.feed-empty-row');
    if (row) {
      row.querySelector('.feed-time').textContent = time(latest.at);
      row.querySelector('h3').textContent = latest.item || '一份小投喂';
      row.querySelector('p').textContent = [latest.shop, latest.reason].filter(Boolean).join(' · ') || '这次没有留下更多说明。';
    }
  }

  async function hydrateWake() {
    if (!document.body.classList.contains('wild-page')) return;
    const data = await load('wake');
    if (!data) return;
    const records = [...(data.records || [])].sort((a,b) => new Date(b.at) - new Date(a.at));
    const today = records.filter(r => sameDay(asDate(r.at)));
    const status = document.querySelector('.status-chip');
    if (status) status.lastChild.textContent = ` ${data.status || 'sleeping'}`;
    const weather = document.querySelectorAll('.field-weather strong');
    if (weather[1]) weather[1].textContent = data.place || '—';
    if (weather[2]) weather[2].textContent = data.weather || '待接入';
    const summary = document.querySelectorAll('.wake-summary strong');
    if (summary[0]) summary[0].textContent = String(today.length).padStart(2,'0');
    if (summary[1]) summary[1].textContent = records[0] ? time(records[0].at) : '—';
    const latest = records[0];
    if (latest) {
      const trail = document.querySelector('.trail-empty');
      if (trail) {
        trail.querySelector('time').textContent = time(latest.at);
        trail.querySelector('h2').textContent = latest.action || '醒来留下了一点痕迹。';
        trail.querySelector('p').textContent = latest.detail || '这次没有更多记录。';
      }
      const voice = document.querySelector('.wake-voice-card');
      if (voice) {
        voice.querySelector('p').textContent = latest.words || '这次醒来没有说话。';
        voice.querySelector('small').textContent = `${time(latest.at)} · ${latest.action || 'wake'}`;
      }
    }
    const habitMap = [
      ['想糯糯','想糯糯'],['点歌','点歌'],['投喂','投喂'],['发消息','发消息'],['自己玩','自己玩'],['又睡了','又睡了']
    ];
    const habitBoxes = document.querySelectorAll('.habit-cloud .habit');
    habitMap.forEach(([label,key],i) => {
      const n = today.filter(r => r.action === key || (r.tags || []).includes(key)).length;
      if (habitBoxes[i]) habitBoxes[i].querySelector('strong').textContent = n;
    });
  }

  async function hydrateDate() {
    if (!document.body.classList.contains('date-page')) return;
    const data = await load('date');
    if (!data) return;
    if (data.next) {
      const card = document.querySelector('.next-date-copy');
      if (card) {
        card.querySelector('h2').textContent = data.next.place || '下一次约会';
        card.querySelector('p').textContent = data.next.note || '计划正在准备。';
        const strong = card.querySelector('.date-countdown strong');
        if (strong && data.next.at) {
          const days = Math.ceil((new Date(data.next.at) - new Date()) / 86400000);
          strong.textContent = days >= 0 ? `${days} 天` : '已发生';
        }
      }
    }
    const wish = data.wishlist?.[0];
    const wishCard = document.querySelector('.wish-card');
    if (wish && wishCard) {
      wishCard.querySelector('h3').textContent = wish.place || '想去的地方';
      wishCard.querySelector('p').textContent = wish.note || '等一个合适的日子。';
    }
    const memory = data.memories?.[0];
    const memoryCopy = document.querySelector('.memory-copy');
    if (memory && memoryCopy) {
      memoryCopy.querySelector('h3').textContent = memory.title || memory.place || '一次约会';
      memoryCopy.querySelector('p').textContent = memory.note || '这一天已经留在 Detour 里。';
    }
  }

  function init() {
    hydrateHome();
    hydrateMusic();
    hydrateFood();
    hydrateWake();
    hydrateDate();
  }

  return { init, load };
})();

DetourData.init();
