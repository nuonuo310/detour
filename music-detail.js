(() => {
  if (!document.body.classList.contains('music-detail-page')) return;
  const q=new URLSearchParams(location.search),id=q.get('id');
  const pad=n=>String(n).padStart(2,'0');
  const fmt=v=>{const d=new Date(v);if(Number.isNaN(d.valueOf()))return'—';return`${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} · ${pad(d.getHours())}:${pad(d.getMinutes())}`};
  const key=r=>r.spotifyTrackId||`${r.title||''}::${r.artist||''}`.toLowerCase();
  const source=r=>r.sourceLabel||({auto_wake:'自动唤醒',chat:'聊天中',manual:'主动点歌'}[r.source]||'聊天中');
  const trig=r=>r.trigger?.label||r.triggerLabel||'';
  const row=(label,value)=>`<span>${label}</span><strong>${value||'—'}</strong>`;
  const localKey=value=>`detour:music-echo:${value||'latest'}`;
  const readLocal=value=>{try{return JSON.parse(localStorage.getItem(localKey(value))||'{}')}catch{return{}}};
  const writeLocal=(value,patch)=>{const next={...readLocal(value),...patch,updatedAt:new Date().toISOString()};localStorage.setItem(localKey(value),JSON.stringify(next));return next};
  const sameSet=(a=[],b=[])=>a.length===b.length&&[...a].sort().every((x,i)=>x===[...b].sort()[i]);

  function issueUrl(record,state,text){
    const now=new Date().toISOString();
    let echoId=state.echoId; if(text&&!echoId){echoId=`echo-${Date.now()}`;writeLocal(record.id,{echoId});}
    const payload={pickId:record.id,echoId:echoId||null,moods:state.moods||[],reactions:state.reactions||[],text:text||'',seenAt:state.seenAt||now,listenedAt:state.listenedAt||now,respondedAt:now,source:'detour-detail'};
    const encoded=encodeURIComponent(JSON.stringify(payload)),title=encodeURIComponent(`[music-echo] ${record.id}`);
    const body=encodeURIComponent(`Detour Music Echo\n\n这条回声属于「${record.title||'这首歌'}」的这一次点歌。\n\n<!-- detour-music-echo:${encoded} -->\n\n由 Detour 页面生成，请直接提交。`);
    return `https://github.com/nuonuo310/detour/issues/new?title=${title}&body=${body}`;
  }

  async function render(){
    if(typeof DetourData==='undefined')return;
    const data=await DetourData.load('music');
    const records=[...(data?.records||[])].sort((a,b)=>new Date(a.pickedAt||a.at)-new Date(b.pickedAt||b.at)); if(!records.length)return;
    const current=records.find(r=>r.id===id)||records.at(-1),same=records.filter(r=>key(r)===key(current)),occurrence=same.findIndex(r=>r.id===current.id)+1;
    document.querySelector('#detailTitle').textContent=current.title||'未命名';document.querySelector('#detailArtist').textContent=current.artist||'—';document.querySelector('#detailCount').textContent=`点过 ${same.length} 次`;document.querySelector('#thisOccurrence').textContent=`第 ${occurrence||1} 次点给你`;document.querySelector('#thisTime').textContent=fmt(current.pickedAt||current.at);document.querySelector('#thisSource').textContent=[source(current),trig(current)].filter(Boolean).join(' · ');document.querySelector('#thisNote').textContent=current.note||'这次没有留下小纸条。';
    if(current.cover){const c=document.querySelector('#detailCover');c.style.backgroundImage=`url(${JSON.stringify(current.cover).slice(1,-1)})`;c.style.backgroundSize='cover';c.innerHTML=''}
    if(current.url){const a=document.querySelector('#detailSpotify');a.href=current.url;a.target='_blank';a.rel='noopener noreferrer';a.classList.remove('is-disabled');a.removeAttribute('aria-disabled')}

    const local=readLocal(current.id); if(!local.seenAt)writeLocal(current.id,{seenAt:new Date().toISOString()});
    document.querySelector('#thisTiming').innerHTML=[row('决定点歌',fmt(current.pickedAt||current.at)),row('出现在 Detour',fmt(current.visibleAt||current.at)),row('糯糯看到',fmt(current.seenAt||current.readAt||readLocal(current.id).seenAt)),row('糯糯听了',fmt(current.listenedAt||readLocal(current.id).listenedAt))].join('');

    function state(){const l=readLocal(current.id);return{...l,moods:l.moods||current.echo?.moods||current.moods||[],reactions:l.reactions||current.echo?.reactions||current.reactions||[]}}
    function refreshControls(){const s=state();document.querySelectorAll('[data-mood]').forEach(b=>b.classList.toggle('is-active',s.moods.includes(b.dataset.mood)));document.querySelectorAll('[data-reaction]').forEach(b=>b.classList.toggle('is-active',s.reactions.includes(b.dataset.reaction)));refreshSync()}
    document.querySelectorAll('[data-mood]').forEach(btn=>btn.addEventListener('click',()=>{const s=state(),v=btn.dataset.mood;let moods=s.moods.includes(v)?s.moods.filter(x=>x!==v):[...s.moods,v];if(moods.length>2)moods=moods.slice(-2);writeLocal(current.id,{moods,listenedAt:s.listenedAt||new Date().toISOString()});refreshControls()}));
    document.querySelectorAll('[data-reaction]').forEach(btn=>btn.addEventListener('click',()=>{const s=state(),v=btn.dataset.reaction,reactions=s.reactions.includes(v)?s.reactions.filter(x=>x!==v):[...s.reactions,v];writeLocal(current.id,{reactions,listenedAt:s.listenedAt||new Date().toISOString()});refreshControls()}));
    document.querySelector('#echoText').addEventListener('input',e=>writeLocal(current.id,{draftText:e.target.value}));document.querySelector('#echoText').value=local.draftText||'';

    function refreshSync(){const s=state(),text=document.querySelector('#echoText').value.trim(),cloud=current.echo||{},changed=!sameSet(s.moods,cloud.moods||[])||!sameSet(s.reactions,cloud.reactions||[])||!!text,link=document.querySelector('#detailEchoSync'),hint=document.querySelector('#detailEchoHint');if(!changed){link.classList.add('is-disabled');link.removeAttribute('href');link.setAttribute('aria-disabled','true');link.textContent='哥哥已经收到了';hint.textContent='现在这份回声已经在云端。';return}link.classList.remove('is-disabled');link.removeAttribute('aria-disabled');link.textContent='同步给哥哥';link.href=issueUrl(current,s,text);link.target='_blank';link.rel='noopener';hint.textContent='点同步后会打开 GitHub；Create 完成后，这次心情、反应和文字都会回到 Detour。'}
    document.querySelector('#echoText').addEventListener('input',refreshSync);refreshControls();

    const echoes=current.echo?.messages||current.echoes||[];document.querySelector('#echoMessages').innerHTML=echoes.length?echoes.map(e=>`<div class="again-entry"><p>${typeof e==='string'?e:(e.text||'')}</p><span>${typeof e==='string'?'':fmt(e.at)}</span></div>`).join(''):'<p class="empty-echo">这一次还没有文字回声。</p>';

    const timeline=document.querySelector('#songTimeline');timeline.innerHTML='';const firstMention=current.firstMention||same.find(r=>r.firstMention)?.firstMention;if(firstMention)timeline.insertAdjacentHTML('beforeend',`<article class="timeline-item"><i class="timeline-dot"></i><small>第一次说起 · ${fmt(firstMention.at)}</small><h3>${firstMention.label||'聊天记录'}</h3><p>${firstMention.note||''}</p></article>`);
    same.forEach((r,i)=>{const isCurrent=r.id===current.id,e=r.echo?.messages||r.echoes||[],localEcho=readLocal(r.id),moods=localEcho.moods||r.echo?.moods||r.moods||[];timeline.insertAdjacentHTML('beforeend',`<article class="timeline-item ${isCurrent?'is-current':''}"><i class="timeline-dot"></i><small>第 ${i+1} 次点歌 · ${fmt(r.pickedAt||r.at)}</small><h3>${[source(r),trig(r)].filter(Boolean).join(' · ')}</h3><p><strong>哥哥：</strong> ${r.note||'这次没有留下小纸条。'}</p>${moods.length?`<p class="timeline-echo-meta">糯糯留下了 ${moods.length} 个心情</p>`:''}${e.length?`<p><strong>糯糯：</strong> ${typeof e[0]==='string'?e[0]:(e[0].text||'')}</p>`:''}</article>`)});

    document.querySelector('#deliverySummary').textContent=current.scheduledAt||current.visibleAt&&current.visibleAt!==(current.pickedAt||current.at)?`${fmt(current.pickedAt||current.at)} 点下 · ${fmt(current.visibleAt)} 送到`:[source(current),trig(current)].filter(Boolean).join(' · ')||'普通点歌';document.querySelector('#deliveryGrid').innerHTML=[row('来源',source(current)),row('触发',trig(current)||'—'),row('决定时间',fmt(current.pickedAt||current.at)),row('计划送达',fmt(current.scheduledAt)),row('实际出现',fmt(current.visibleAt||current.at))].join('');document.querySelector('#playlistFacts').innerHTML=[row('加入时间',fmt(current.addedAt||same[0]?.addedAt||same[0]?.at)),row('最近点歌',fmt(same.at(-1)?.pickedAt||same.at(-1)?.at)),row('总点歌次数',pad(same.length))].join('');
  }
  render();
})();