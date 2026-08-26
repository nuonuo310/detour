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
  async function render(){
    const data=await DetourData.load('food');
    const records=[...(data?.records||[])].sort((a,b)=>parse(b.at)-parse(a.at));
    const visible=records.filter(r=>!isTest(r)),now=new Date();
    const today=visible.filter(r=>{const d=parse(r.at);return !Number.isNaN(d.valueOf())&&sameDay(d,now)});
    const month=visible.filter(r=>{const d=parse(r.at);return !Number.isNaN(d.valueOf())&&sameMonth(d,now)});
    const latest=today[0],card=document.querySelector('.today-feed-card');
    if(card&&latest){
      const visual=card.querySelector('.feed-visual');if(visual)visual.innerHTML=`${visualMarkup(latest)}<span>${time(latest.at)}</span>`;
      const title=card.querySelector('h2');if(title)title.textContent=latest.item||'一份小投喂';
      const copy=card.querySelector('.feed-copy p');if(copy)copy.innerHTML=`<span class="feed-shop">${esc(latest.shop||'')}</span>${specText(latest)?`<span class="feed-specs">${esc(specText(latest))}</span>`:''}${latest.reason?`<span class="feed-reason">${esc(latest.reason)}</span>`:''}`;
    }
    const stats=document.querySelectorAll('.feed-stats strong');[today.length,month.length,visible.length].forEach((v,i)=>{if(stats[i])stats[i].textContent=pad(v)});
    document.querySelectorAll('.category-grid>div').forEach(el=>{const label=el.dataset.kind,val=el.querySelector('strong'),icon=el.querySelector('.category-icon');if(val)val.textContent=visible.filter(r=>r.category===label).length;if(icon)icon.innerHTML=objectMarkup(categoryClass(label),'category-object');el.classList.toggle('has-feed',visible.some(r=>r.category===label));});
    const recent=document.querySelector('.recent-feed .feed-empty-row'),last=visible[0];
    if(recent&&last)recent.outerHTML=`<article class="feed-empty-row"><div class="recent-time">${time(last.at)}${pulseDot()}</div>${thumbMarkup(last)}<div class="recent-main"><h3>${esc(last.item||'一份小投喂')}</h3><p>${esc([last.shop,specText(last)].filter(Boolean).join(' · '))}</p></div><span class="recent-tag">${esc(last.category||'投喂')}</span><b class="row-arrow">›</b></article>`;
    const list=document.querySelector('.feed-history-list');
    if(list&&visible.length)list.innerHTML=visible.map(r=>`<article class="feed-history-row"><div class="feed-history-meta"><span>${date(r.at)}</span><div><time>${time(r.at)}</time>${pulseDot()}</div></div>${thumbMarkup(r)}<div class="feed-history-main"><div class="feed-history-title"><h3>${esc(r.item||'一份小投喂')}</h3><span>${esc(r.category||'投喂')}</span></div><p>${esc([r.shop,specText(r)].filter(Boolean).join(' · '))}</p>${r.reason?`<small>${esc(r.reason)}</small>`:''}</div><b class="row-arrow">›</b></article>`).join('');
    const cat=document.querySelector('[data-favorite="category"]'),shop=document.querySelector('[data-favorite="shop"]'),when=document.querySelector('[data-favorite="time"]');if(cat)cat.textContent=mostCommon(visible.map(r=>r.category));if(shop)shop.textContent=mostCommon(visible.map(r=>r.shop));if(when)when.textContent=mostCommon(visible.map(r=>timeBucket(r.at)));
  }
  render();
})();