(() => {
  if (!document.body.classList.contains('food-page') || typeof DetourData === 'undefined') return;
  const pad=n=>String(n).padStart(2,'0'),parse=v=>new Date(v);
  const time=v=>{const d=parse(v);return Number.isNaN(d.valueOf())?'—':`${pad(d.getHours())}:${pad(d.getMinutes())}`};
  const date=v=>{const d=parse(v);return Number.isNaN(d.valueOf())?'—':`${d.getMonth()+1}.${pad(d.getDate())}`};
  const sameDay=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  const sameMonth=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth();
  const isTest=r=>/联调|测试/.test([r.item,r.shop,r.reason,r.note].filter(Boolean).join(' '));
  const esc=v=>String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const mostCommon=values=>{const m=new Map();values.filter(Boolean).forEach(v=>m.set(v,(m.get(v)||0)+1));return [...m].sort((a,b)=>b[1]-a[1])[0]?.[0]||'—'};
  const timeBucket=v=>{const h=parse(v).getHours();return h<6?'凌晨':h<11?'上午':h<14?'中午':h<18?'下午':h<22?'晚上':'深夜'};
  const specText=r=>Array.isArray(r.specs)&&r.specs.length?r.specs.join(' · '):'';
  const categoryClass=c=>({'奶茶':'drink','外卖':'meal','零食':'snack','礼物':'gift','日用品':'daily','宠物用品':'pet'}[c]||'other');
  const objectMarkup=(preset,extra='')=>`<div class="product-object product-${esc(preset)} ${extra}" aria-hidden="true"><i></i><b></b><em></em><span></span></div>`;
  const visualMarkup=r=>{
    if(r?.visual?.type==='cutout'&&r.visual.src)return `<img class="feed-product-image is-cutout" src="${esc(r.visual.src)}" alt="${esc(r.item||'投喂')}" />`;
    const preset=r?.visual?.preset||r?.visual?.fallback||categoryClass(r?.category);
    return objectMarkup(preset);
  };
  const thumbMarkup=r=>`<div class="record-thumb">${visualMarkup(r)}</div>`;
  const pulseDot=()=>'<i class="record-pulse" aria-hidden="true"></i>';
  const receiptFor=(record,serverReceipts)=>{
    let local=null;try{local=JSON.parse(localStorage.getItem(`detour:food-receipt:${record.id}`)||'null')}catch{}
    return local||(serverReceipts||[]).find(r=>r.foodId===record.id)||null;
  };
  const receiptBadge=receipt=>receipt?`<span class="receipt-badge ${receipt.readByShenshu?'is-read':'is-new'}">${receipt.readByShenshu?'已收到':'新回执'}</span>`:'';

  function renderHero(record,card,serverReceipts,label){
    if(!record||!card)return;
    const receipt=receiptFor(record,serverReceipts);
    const visual=card.querySelector('.feed-visual');if(visual)visual.innerHTML=`${visualMarkup(record)}<span>${time(record.at)}</span>`;
    const mini=card.querySelector('.mini-label');if(mini)mini.textContent=label;
    const title=card.querySelector('h2');if(title)title.textContent=record.item||'一份小投喂';
    const copy=card.querySelector('.feed-copy p');if(copy)copy.innerHTML=`<span class="feed-shop">${esc(record.shop||'')}</span>${specText(record)?`<span class="feed-specs">${esc(specText(record))}</span>`:''}${record.reason?`<span class="feed-reason">${esc(record.reason)}</span>`:''}${receipt?`<span class="feed-receipt-hint ${receipt.readByShenshu?'is-read':'is-new'}">${!receipt.readByShenshu?pulseDot():''}${receipt.readByShenshu?'已收到 · 1 条回应':'新回执 · 1 条回应'}</span>`:''}`;
    card.dataset.detailHref=`food-detail.html?id=${encodeURIComponent(record.id)}`;
  }

  function renderDailySwitcher(today,card,serverReceipts){
    document.querySelector('.today-feed-switcher')?.remove();
    if(today.length<=1)return;
    const switcher=document.createElement('div');
    switcher.className='today-feed-switcher';
    switcher.innerHTML=`<span class="switcher-label">今天还有 ${today.length} 份</span><div class="switcher-items">${today.map((r,i)=>`<button type="button" class="feed-switch ${i===0?'is-active':''}" data-index="${i}"><i></i><span>${esc(r.item||r.category||'投喂')}</span><small>${time(r.at)}</small></button>`).join('')}</div>`;
    card.insertAdjacentElement('afterend',switcher);
    switcher.addEventListener('click',e=>{
      const btn=e.target.closest('.feed-switch');if(!btn)return;
      const index=Number(btn.dataset.index);const record=today[index];if(!record)return;
      switcher.querySelectorAll('.feed-switch').forEach(x=>x.classList.toggle('is-active',x===btn));
      renderHero(record,card,serverReceipts,`今日投喂 · ${index+1}/${today.length}`);
    });
  }

  async function render(){
    const [data,receiptData]=await Promise.all([DetourData.load('food'),DetourData.load('food-receipts')]);
    const serverReceipts=receiptData?.receipts||[];
    const records=[...(data?.records||[])].sort((a,b)=>parse(b.at)-parse(a.at));
    const visible=records.filter(r=>!isTest(r)),now=new Date();
    const today=visible.filter(r=>{const d=parse(r.at);return !Number.isNaN(d.valueOf())&&sameDay(d,now)});
    const month=visible.filter(r=>{const d=parse(r.at);return !Number.isNaN(d.valueOf())&&sameMonth(d,now)});
    const card=document.querySelector('.today-feed-card');
    const heroRecord=today[0]||visible[0];
    if(heroRecord&&card){
      renderHero(heroRecord,card,serverReceipts,today.length?`今日投喂${today.length>1?` · 1/${today.length}`:''}`:'最近投喂');
      renderDailySwitcher(today,card,serverReceipts);
      card.addEventListener('click',e=>{if(e.target.closest('button,a,input,textarea'))return;if(card.dataset.detailHref)location.href=card.dataset.detailHref;});
    }
    const stats=document.querySelectorAll('.feed-stats strong');[today.length,month.length,visible.length].forEach((v,i)=>{if(stats[i])stats[i].textContent=pad(v)});
    document.querySelectorAll('.category-grid>div').forEach(el=>{const label=el.dataset.kind,val=el.querySelector('strong'),icon=el.querySelector('.category-icon');if(val)val.textContent=visible.filter(r=>r.category===label).length;if(icon)icon.innerHTML=objectMarkup(categoryClass(label),'category-object');el.classList.toggle('has-feed',visible.some(r=>r.category===label));});
    const recent=document.querySelector('.recent-feed .feed-empty-row'),last=visible[0];
    if(recent&&last){const receipt=receiptFor(last,serverReceipts);recent.outerHTML=`<a class="feed-empty-row feed-row-link" href="food-detail.html?id=${encodeURIComponent(last.id)}"><div class="recent-time">${time(last.at)}${receipt&&!receipt.readByShenshu?pulseDot():''}</div>${thumbMarkup(last)}<div class="recent-main"><h3>${esc(last.item||'一份小投喂')}</h3><p>${esc([last.shop,specText(last)].filter(Boolean).join(' · '))}</p>${receiptBadge(receipt)}</div><span class="recent-tag">${esc(last.category||'投喂')}</span><b class="row-arrow">›</b></a>`;}
    const list=document.querySelector('.feed-history-list');
    if(list&&visible.length)list.innerHTML=visible.map(r=>{const receipt=receiptFor(r,serverReceipts);return `<a class="feed-history-row feed-row-link" href="food-detail.html?id=${encodeURIComponent(r.id)}"><div class="feed-history-meta"><span>${date(r.at)}</span><div><time>${time(r.at)}</time>${receipt&&!receipt.readByShenshu?pulseDot():''}</div></div>${thumbMarkup(r)}<div class="feed-history-main"><div class="feed-history-title"><h3>${esc(r.item||'一份小投喂')}</h3><span>${esc(r.category||'投喂')}</span></div><p>${esc([r.shop,specText(r)].filter(Boolean).join(' · '))}</p>${receiptBadge(receipt)}</div><b class="row-arrow">›</b></a>`}).join('');
    const cat=document.querySelector('[data-favorite="category"]'),shop=document.querySelector('[data-favorite="shop"]'),when=document.querySelector('[data-favorite="time"]');if(cat)cat.textContent=mostCommon(visible.map(r=>r.category));if(shop)shop.textContent=mostCommon(visible.map(r=>r.shop));if(when)when.textContent=mostCommon(visible.map(r=>timeBucket(r.at)));
  }
  render();
})();