(()=>{
 const host=document.querySelector('.feed .art');if(!host)return;
 const fallback=document.createElement('span');fallback.className='dv2-feeding-day-fallback';while(host.firstChild)fallback.append(host.firstChild);host.append(fallback);
 host.classList.add('dv2-feeding-day-slot');
 const still=new Image();still.className='dv2-feeding-day-static';still.alt='奶茶、茶杯、托盘与花饰静物';still.decoding='async';
 const base=new URL('../assets/v2/art/feeding-day/',document.currentScript?.src||location.href);
 still.src=new URL('day-assembled.webp',base).href;host.append(still);
 still.addEventListener('load',()=>{const d=typeof still.decode==='function'?still.decode():Promise.resolve();d.catch(()=>{}).finally(()=>host.classList.add('has-static'))},{once:true});
 document.documentElement.classList.add('detour-feeding-day-v1-static');
})();
