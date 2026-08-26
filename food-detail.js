(() => {
  if (!document.body.classList.contains('food-detail-page') || typeof DetourData === 'undefined') return;
  const esc=v=>String(v??'').replace(/[&<>'\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[ch]));
  const categoryClass=c=>({'奶茶':'drink','外卖':'meal','零食':'snack','礼物':'gift','日用品':'daily','宠物用品':'pet'}[c]||'other');
  const objectMarkup=preset=>`<div class="product-object product-${esc(preset)}" aria-hidden="true"><i></i><b></b><em></em><span></span></div>`;
  const visualMarkup=r=>r?.visual?.type==='cutout'&&r.visual.src?`<img class="feed-product-image is-cutout" src="${esc(r.visual.src)}" alt="${esc(r.item||'投喂')}" />`:objectMarkup(r?.visual?.preset||r?.visual?.fallback||categoryClass(r?.category));
  const specText=r=>Array.isArray(r?.specs)&&r.specs.length?r.specs.join(' · '):'—';
  const fmt=v=>{const d=new Date(v);if(Number.isNaN(d.valueOf()))return '—';return `${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
  const params=new URLSearchParams(location.search),requestedId=params.get('id');
  const localKey=id=>`detour:food-receipt:${id}`;
  const cloudIssueUrl=receipt=>{
    const payload=encodeURIComponent(JSON.stringify({...receipt,source:'github-issue'}));
    const title=encodeURIComponent(`[feed-receipt] ${receipt.foodId}`);
    const body=encodeURIComponent(`Detour Feed Receipt\n\n<!-- detour-receipt:${payload} -->\n\n由 Detour 页面生成，请直接提交。`);
    return `https://github.com/nuonuo310/detour/issues/new?title=${title}&body=${body}`;
  };

  async function init(){
    const [food,receiptData]=await Promise.all([DetourData.load('food'),DetourData.load('food-receipts')]);
    const records=[...(food?.records||[])].sort((a,b)=>new Date(b.at)-new Date(a.at));
    const record=records.find(r=>r.id===requestedId)||records[0];
    if(!record)return;
    document.querySelector('[data-record-card] h2').textContent=record.item||'一份小投喂';
    document.querySelector('.detail-shop').textContent=record.shop||'—';
    document.querySelector('.detail-specs').textContent=specText(record);
    document.querySelector('.detail-reason').textContent=record.reason||'这次没有留下更多说明。';
    document.querySelector('.detail-visual').innerHTML=visualMarkup(record);
    document.querySelector('[data-meta-time]').textContent=fmt(record.at);
    document.querySelector('[data-meta-category]').textContent=record.category||'投喂';
    document.querySelector('[data-record-content]').textContent=[record.item,record.shop,specText(record)].filter(v=>v&&v!=='—').join(' · ')||'—';

    const serverReceipt=(receiptData?.receipts||[]).find(r=>r.foodId===record.id);
    let localReceipt=null;try{localReceipt=JSON.parse(localStorage.getItem(localKey(record.id))||'null')}catch{}
    renderReceipt(serverReceipt||localReceipt,Boolean(serverReceipt));

    const form=document.querySelector('.receipt-form');
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const text=document.querySelector('#receiptText').value.trim();
      if(!text)return;
      const next={id:`receipt-${Date.now()}`,foodId:record.id,text,photo:null,createdAt:new Date().toISOString(),readByShenshu:false,readAt:null,source:'local'};
      localStorage.setItem(localKey(record.id),JSON.stringify(next));
      renderReceipt(next,false);
    });
  }

  function renderReceipt(receipt,isCloud){
    const existing=document.querySelector('.receipt-existing'),form=document.querySelector('.receipt-form'),state=document.querySelector('[data-receipt-state]'),status=document.querySelector('[data-meta-status]'),sync=document.querySelector('[data-cloud-sync]');
    if(!receipt){existing.hidden=true;form.hidden=false;state.textContent='还没有留下回应';status.textContent='等待回执';return;}
    existing.hidden=false;form.hidden=true;
    state.textContent=receipt.readByShenshu?'哥哥已经看过':isCloud?'云端已收到 · 1 条回应':'本机已收到 · 待同步';
    status.textContent=receipt.readByShenshu?'已读':isCloud?'新回执':'待同步';
    document.querySelector('[data-receipt-text]').textContent=receipt.text||'（没有文字）';
    document.querySelector('[data-receipt-at]').textContent=fmt(receipt.createdAt);
    const photo=document.querySelector('[data-receipt-photo]');
    if(receipt.photo){photo.querySelector('.photo-placeholder').textContent='已附照片';}else{photo.querySelector('.photo-placeholder').textContent='照片以后会留在这里';}
    if(sync){
      sync.hidden=isCloud;
      if(!isCloud){sync.href=cloudIssueUrl(receipt);sync.textContent='同步到云端 · 需要确认一次 GitHub 提交';}
    }
  }
  init();
})();
