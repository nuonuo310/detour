(()=>{
 const host=document.querySelector('.gifts .art');if(!host)return;
 const base='../assets/v2/art/gifts-day/';
 const fallback=document.createElement('span');fallback.className='dv2-gifts-day-fallback';while(host.firstChild)fallback.append(host.firstChild);host.append(fallback);host.classList.add('dv2-gifts-day-slot');
 const still=new Image();still.className='dv2-gifts-day-static';still.alt='信封、礼物、蜡封与珍珠静物';still.decoding='async';still.src=base+'day-assembled.webp';host.append(still);
 const canvas=document.createElement('span');canvas.className='dv2-gifts-day-canvas';host.append(canvas);
 const defs=[
  ['shadow','day-contact-shadow.webp'],['flowers-left','day-flowers-left.webp'],['body','day-body.webp'],['flowers-envelope','day-flowers-envelope.webp'],['sprig-vase','day-sprig-vase.webp'],['vase-front','day-vase-front.webp'],['foreground','day-flowers-foreground.webp']
 ];
 const nodes={};
 const images=defs.map(([name,src])=>new Promise((resolve,reject)=>{const img=new Image();img.className=`dv2-gifts-day-layer dv2-gifts-day-${name}`;img.alt='';img.decoding='async';img.onload=()=>{nodes[name]=img;canvas.append(img);resolve()};img.onerror=reject;img.src=base+src;}));
 const motion=[['flowers-left',3,.5],['flowers-envelope',2.4,0],['sprig-vase',3,1.2]];
 let raf=0,start=performance.now();const mq=matchMedia('(prefers-reduced-motion: reduce)');
 const stop=()=>{if(raf)cancelAnimationFrame(raf);raf=0};
 const tick=t=>{if(document.hidden||mq.matches||!host.classList.contains('is-ready')){stop();return}const e=t-start;for(const[n,a,p]of motion){if(nodes[n])nodes[n].style.transform=`rotate(${-a*Math.sin(2*Math.PI*e/6000+p)}deg)`}raf=requestAnimationFrame(tick)};
 const sync=()=>{host.classList.toggle('is-reduced',mq.matches);if(document.hidden||mq.matches)stop();else if(host.classList.contains('is-ready')&&!raf){start=performance.now();raf=requestAnimationFrame(tick)}};
 still.addEventListener('load',()=>{const d=still.decode?still.decode():Promise.resolve();d.catch(()=>{}).finally(()=>host.classList.add('has-static'))},{once:true});
 Promise.all(images).then(()=>{host.classList.add('is-ready');sync()}).catch(()=>{});
 document.addEventListener('visibilitychange',sync);mq.addEventListener?.('change',sync);sync();document.documentElement.classList.add('detour-gifts-day-v1');
})();
