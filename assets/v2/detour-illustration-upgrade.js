(()=>{
  const modules={};
  function mount(selector,{src,alt}){
    const host=document.querySelector(`.${selector} .art`);if(!host)return;
    const fallback=document.createElement('span');fallback.className='dv2-art-fallback';while(host.firstChild)fallback.append(host.firstChild);host.append(fallback);
    host.classList.add('dv2-art-slot','is-loading');host.dataset.art=selector;
    const img=document.createElement('img');img.className='dv2-art-image';img.alt=alt;img.decoding='async';img.loading='eager';
    const reveal=()=>{host.classList.remove('is-loading','is-missing');host.classList.add('is-ready');fallback.remove();};
    const fail=()=>{host.classList.remove('is-loading');host.classList.add('is-missing');img.remove();};
    img.addEventListener('load',()=>{const decoded=typeof img.decode==='function'?img.decode():Promise.resolve();decoded.catch(()=>{}).finally(reveal);},{once:true});
    img.addEventListener('error',fail,{once:true});img.src=src;host.append(img);
  }
  Object.entries(modules).forEach(([name,asset])=>mount(name,asset));document.documentElement.classList.add('detour-art-assets-v2');
})();
