(()=>{
  const host=document.querySelector('.listen .art');
  if(!host||host.dataset.listenDayMounted==='true')return;

  host.dataset.listenDayMounted='true';
  host.classList.add('dv2-listen-day-slot');

  const fallback=document.createElement('span');
  fallback.className='dv2-listen-day-fallback';
  while(host.firstChild)fallback.append(host.firstChild);
  host.append(fallback);

  const art=document.createElement('img');
  art.className='dv2-listen-day-static';
  art.src='../assets/v2/art/listen-day/day-assembled.webp';
  art.alt='日镜 Listen 紫藤留声机静物';
  art.decoding='async';
  art.loading='eager';
  art.addEventListener('load',()=>{
    const decoded=typeof art.decode==='function'?art.decode():Promise.resolve();
    decoded.catch(()=>{}).finally(()=>host.classList.add('has-static'));
  },{once:true});
  art.addEventListener('error',()=>host.classList.add('is-missing'),{once:true});
  host.append(art);

  document.documentElement.classList.add('detour-listen-day-v1');
})();
