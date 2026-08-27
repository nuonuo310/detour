(() => {
  if (!document.body.classList.contains('music-detail-page')) return;
  const q = new URLSearchParams(location.search);
  const id = q.get('id');
  const pad=n=>String(n).padStart(2,'0');
  const fmt=v=>{const d=new Date(v);if(Number.isNaN(d.valueOf()))return'—';return`${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} · ${pad(d.getHours())}:${pad(d.getMinutes())}`};
  const key=r=>r.spotifyTrackId||`${r.title||''}::${r.artist||''}`.toLowerCase();
  const source=r=>r.sourceLabel||({auto_wake:'自动唤醒',chat:'聊天中',manual:'主动点歌'}[r.source]||'聊天中');
  const trig=r=>r.trigger?.label||r.triggerLabel||'';
  const row=(label,value)=>`<span>${label}</span><strong>${value||'—'}</strong>`;

  async function render(){
    if(typeof DetourData==='undefined')return;
    const data=await DetourData.load('music');
    const records=[...(data?.records||[])].sort((a,b)=>new Date(a.pickedAt||a.at)-new Date(b.pickedAt||b.at));
    if(!records.length)return;
    const current=records.find(r=>r.id===id)||records.at(-1);
    const same=records.filter(r=>key(r)===key(current));
    const occurrence=same.findIndex(r=>r.id===current.id)+1;

    document.querySelector('#detailTitle').textContent=current.title||'未命名';
    document.querySelector('#detailArtist').textContent=current.artist||'—';
    document.querySelector('#detailCount').textContent=`点过 ${same.length} 次`;
    document.querySelector('#thisOccurrence').textContent=`第 ${occurrence||1} 次点给你`;
    document.querySelector('#thisTime').textContent=fmt(current.pickedAt||current.at);
    document.querySelector('#thisSource').textContent=[source(current),trig(current)].filter(Boolean).join(' · ');
    document.querySelector('#thisNote').textContent=current.note||'这次没有留下小纸条。';
    if(current.cover){const c=document.querySelector('#detailCover');c.style.backgroundImage=`url(${JSON.stringify(current.cover).slice(1,-1)})`;c.style.backgroundSize='cover';c.innerHTML='';}
    if(current.url){const a=document.querySelector('#detailSpotify');a.href=current.url;a.target='_blank';a.rel='noopener noreferrer';a.classList.remove('is-disabled');a.removeAttribute('aria-disabled');}

    const timing=document.querySelector('#thisTiming');
    timing.innerHTML=[row('决定点歌',fmt(current.pickedAt||current.at)),row('出现在 Detour',fmt(current.visibleAt||current.at)),row('糯糯看到',fmt(current.seenAt||current.readAt)),row('糯糯听了',fmt(current.listenedAt))].join('');

    const reactions=current.echo?.reactions||current.reactions||[];
    document.querySelectorAll('[data-reaction]').forEach(btn=>{if(reactions.includes(btn.dataset.reaction))btn.classList.add('is-active');btn.addEventListener('click',()=>btn.classList.toggle('is-active'));});
    const echoes=current.echo?.messages||current.echoes||[];
    document.querySelector('#echoMessages').innerHTML=echoes.length?echoes.map(e=>`<div class="again-entry"><p>${typeof e==='string'?e:(e.text||'')}</p><span>${typeof e==='string'?'':fmt(e.at)}</span></div>`).join(''):'<p style="margin:0;color:var(--muted);font-size:11px">这一次还没有文字回声。</p>';

    const timeline=document.querySelector('#songTimeline');
    timeline.innerHTML='';
    const firstMention=current.firstMention||same.find(r=>r.firstMention)?.firstMention;
    if(firstMention){timeline.insertAdjacentHTML('beforeend',`<article class="timeline-item"><i class="timeline-dot"></i><small>第一次说起 · ${fmt(firstMention.at)}</small><h3>${firstMention.label||'聊天记录'}</h3><p>${firstMention.note||''}</p></article>`);}
    same.forEach((r,i)=>{
      const isCurrent=r.id===current.id;
      const e=r.echo?.messages||r.echoes||[];
      timeline.insertAdjacentHTML('beforeend',`<article class="timeline-item ${isCurrent?'is-current':''}"><i class="timeline-dot"></i><small>第 ${i+1} 次点歌 · ${fmt(r.pickedAt||r.at)}</small><h3>${[source(r),trig(r)].filter(Boolean).join(' · ')}</h3><p><strong>哥哥：</strong> ${r.note||'这次没有留下小纸条。'}</p>${e.length?`<p style="margin-top:7px"><strong>糯糯：</strong> ${typeof e[0]==='string'?e[0]:(e[0].text||'')}</p>`:''}</article>`);
    });

    document.querySelector('#deliverySummary').textContent=current.scheduledAt||current.visibleAt&&current.visibleAt!==(current.pickedAt||current.at)?`${fmt(current.pickedAt||current.at)} 点下 · ${fmt(current.visibleAt)} 送到`:[source(current),trig(current)].filter(Boolean).join(' · ')||'普通点歌';
    document.querySelector('#deliveryGrid').innerHTML=[row('来源',source(current)),row('触发',trig(current)||'—'),row('决定时间',fmt(current.pickedAt||current.at)),row('计划送达',fmt(current.scheduledAt)),row('实际出现',fmt(current.visibleAt||current.at))].join('');
    document.querySelector('#playlistFacts').innerHTML=[row('加入时间',fmt(current.addedAt||same[0]?.addedAt||same[0]?.at)),row('最近点歌',fmt(same.at(-1)?.pickedAt||same.at(-1)?.at)),row('总点歌次数',pad(same.length))].join('');
  }
  render();
})();