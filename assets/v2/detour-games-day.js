(()=>{
 const host=document.querySelector('.games .art');if(!host)return;
 const fallback=document.createElement('span');fallback.className='dv2-games-day-fallback';while(host.firstChild)fallback.append(host.firstChild);host.append(fallback);host.classList.add('dv2-games-day-slot');
 const scriptUrl=document.currentScript?.src||location.href;const base=new URL('./art/games-day/',scriptUrl);
 const still=new Image();still.className='dv2-games-day-static';still.alt='手柄、游戏书、桌游盒、骰子与花饰静物';still.decoding='async';still.src=new URL('day-assembled.webp',base).href;host.append(still);
 const canvas=document.createElement('span');canvas.className='dv2-games-day-canvas';host.append(canvas);
 const defs=[['shadow','day-contact-shadow.webp'],['body','day-body.webp'],['die','day-die.webp'],['branch-right','day-branch-right.webp'],['flowers-front','day-flowers-front.webp']];
 const nodes={};const images=defs.map(([name,src])=>new Promise((resolve,reject)=>{const img=new Image();img.className=`dv2-games-day-layer dv2-games-day-${name}`;img.alt='';img.decoding='async';img.onload=()=>{nodes[name]=img;canvas.append(img);resolve()};img.onerror=reject;img.src=new URL(src,base).href}));
 let raf=0,start=performance.now();const mq=matchMedia('(prefers-reduced-motion: reduce)');
 const stop=()=>{if(raf)cancelAnimationFrame(raf);raf=0};const reset=()=>{if(nodes['branch-right'])nodes['branch-right'].style.transform='';if(nodes['flowers-front'])nodes['flowers-front'].style.transform=''};
 const tick=t=>{if(document.hidden||mq.matches||!host.classList.contains('is-ready')){stop();reset();return}const e=t-start;nodes['branch-right'].style.transform=`rotate(${-2.4*Math.sin(2*Math.PI*e/6000+1)}deg)`;nodes['flowers-front'].style.transform=`rotate(${-1.8*Math.sin(2*Math.PI*e/6000)}deg)`;raf=requestAnimationFrame(tick)};
 const sync=()=>{host.classList.toggle('is-reduced',mq.matches);if(document.hidden||mq.matches){stop();reset()}else if(host.classList.contains('is-ready')&&!raf){start=performance.now();raf=requestAnimationFrame(tick)}};
 still.addEventListener('load',()=>{const d=typeof still.decode==='function'?still.decode():Promise.resolve();d.catch(()=>{}).finally(()=>host.classList.add('has-static'))},{once:true});
 Promise.all(images).then(()=>{host.classList.add('is-ready');sync()}).catch(()=>{});document.addEventListener('visibilitychange',sync);mq.addEventListener?.('change',sync);sync();document.documentElement.classList.add('detour-games-day-v1');
})();
