(() => {
  if (!document.body.classList.contains('music-page')) return;

  const pad = n => String(n).padStart(2, '0');
  const formatDate = value => {
    const d = new Date(value);
    if (Number.isNaN(d.valueOf())) return '—';
    return `${pad(d.getMonth()+1)}.${pad(d.getDate())} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const monthKey = d => `${d.getFullYear()}-${d.getMonth()}`;
  const songKey = r => r.spotifyTrackId || `${r.title || ''}::${r.artist || ''}`.toLowerCase();
  const sourceLabel = r => r.sourceLabel || ({auto_wake:'自动唤醒',chat:'聊天中',manual:'主动点歌'}[r.source] || '聊天中');
  const triggerLabel = r => r.trigger?.label || r.triggerLabel || '';

  async function render() {
    if (typeof DetourData === 'undefined') return;
    const data = await DetourData.load('music');
    if (!data) return;
    const records = [...(data.records || [])].sort((a,b)=>new Date(b.at||b.pickedAt)-new Date(a.at||a.pickedAt));
    const now = new Date();
    const currentMonth = monthKey(now);
    const total = records.length;
    const monthly = records.filter(r => { const d=new Date(r.pickedAt||r.at); return !Number.isNaN(d)&&monthKey(d)===currentMonth; }).length;
    document.querySelector('#musicTotal').textContent = `${pad(total)} 次`;
    document.querySelector('#musicMonth').textContent = pad(monthly);
    document.querySelector('#musicRecent').textContent = records[0] ? formatDate(records[0].pickedAt||records[0].at).split(' · ')[1] : '—';

    if (!records.length) return;
    const latest = records[0];
    const key = songKey(latest);
    const sameSong = records.filter(r=>songKey(r)===key).sort((a,b)=>new Date(a.pickedAt||a.at)-new Date(b.pickedAt||b.at));
    const occurrence = sameSong.findIndex(r=>r.id===latest.id)+1 || sameSong.length;
    document.querySelector('#pickTitle').textContent = latest.title || '未命名';
    document.querySelector('#pickArtist').textContent = latest.artist || '—';
    document.querySelector('#pickOccurrence').textContent = `第 ${occurrence} 次点给你`;
    document.querySelector('#pickTime').textContent = formatDate(latest.pickedAt||latest.at);
    document.querySelector('#pickSource').textContent = [sourceLabel(latest), triggerLabel(latest)].filter(Boolean).join(' · ');
    document.querySelector('#pickNote').textContent = latest.note || '这次没有留下小纸条。';
    document.querySelector('#pickDetail').href = `music-detail.html?id=${encodeURIComponent(latest.id||'')}`;
    document.querySelector('#echoLink').href = `music-detail.html?id=${encodeURIComponent(latest.id||'')}#echo`;
    document.querySelector('#timelineLink').href = `music-detail.html?id=${encodeURIComponent(latest.id||'')}#timeline`;

    const spotify = document.querySelector('#spotifyOpen');
    if (latest.url) { spotify.href=latest.url; spotify.target='_blank'; spotify.rel='noopener noreferrer'; spotify.classList.remove('is-disabled'); spotify.removeAttribute('aria-disabled'); }
    if (latest.cover) { const c=document.querySelector('#pickCover'); c.style.backgroundImage=`url(${JSON.stringify(latest.cover).slice(1,-1)})`; c.style.backgroundSize='cover'; c.innerHTML=''; }

    const seen = latest.seenAt || latest.readAt;
    document.querySelector('#pickSeenState').textContent = seen ? '已读' : '新点歌';
    document.querySelector('#newPickLink').textContent = `新点歌 · ${records.filter(r=>!(r.seenAt||r.readAt)).length}`;

    const reactions = latest.echo?.reactions || latest.reactions || [];
    document.querySelectorAll('[data-reaction]').forEach(btn=>{ if(reactions.includes(btn.dataset.reaction)) btn.classList.add('is-active'); });
    const echoCount = latest.echo?.messages?.length || latest.echoes?.length || 0;
    document.querySelector('#echoState').textContent = echoCount ? `已留 ${echoCount} 条` : '未回应';
    document.querySelector('#echoLink').childNodes[0].nodeValue = echoCount ? `糯糯留了 ${echoCount} 条回声 ` : '给哥哥留句话 ';

    if (sameSong.length > 1) {
      const previous = sameSong.slice(0,-1).at(-1);
      const card = document.querySelector('#againCard'); card.hidden=false;
      document.querySelector('#againSummary').innerHTML = `<div class="again-entry"><strong>第 ${sameSong.length-1} 次 · ${formatDate(previous.pickedAt||previous.at)}</strong><span>${sourceLabel(previous)}</span><p>${previous.note || '那次没有留下小纸条。'}</p></div>`;
    }

    renderPlaylist(records);
    renderHistory(records);
  }

  function renderPlaylist(records){
    const host=document.querySelector('#playlistHost');
    const grouped=new Map();
    records.forEach(r=>{ const k=songKey(r); if(!grouped.has(k)) grouped.set(k,[]); grouped.get(k).push(r); });
    host.className='playlist-empty music-history'; host.replaceChildren();
    [...grouped.values()].forEach((items,index)=>{
      items.sort((a,b)=>new Date(b.pickedAt||b.at)-new Date(a.pickedAt||a.at)); const r=items[0];
      const a=document.createElement(r.url?'a':'article'); a.className='music-history-card';
      if(r.url){a.href=r.url;a.target='_blank';a.rel='noopener noreferrer';}
      a.innerHTML=`<span class="music-history-number">${pad(grouped.size-index)}</span><div class="music-history-copy"><div class="music-history-meta"><span>${r.artist||'—'}</span><span>点过 ${items.length} 次</span></div><h3>${r.title||'未命名'}</h3><p>最近 · ${formatDate(r.pickedAt||r.at)}</p></div>`;
      host.append(a);
    });
  }

  function renderHistory(records){
    const host=document.querySelector('#musicHistory'); host.replaceChildren();
    records.slice(0,4).forEach(r=>{
      const same=records.filter(x=>songKey(x)===songKey(r)).sort((a,b)=>new Date(a.pickedAt||a.at)-new Date(b.pickedAt||b.at));
      const n=same.findIndex(x=>x.id===r.id)+1;
      const row=document.createElement('a'); row.className='history-row'; row.href=`music-detail.html?id=${encodeURIComponent(r.id||'')}`; row.style.textDecoration='none'; row.style.color='inherit';
      row.innerHTML=`<time>${formatDate(r.pickedAt||r.at)}</time><div><strong>${r.title||'未命名'} · 第 ${n||1} 次</strong><span>${sourceLabel(r)}</span></div>`;
      host.append(row);
    });
  }

  document.querySelectorAll('[data-reaction]').forEach(btn=>btn.addEventListener('click',()=>btn.classList.toggle('is-active')));
  render();
})();