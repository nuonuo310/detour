(()=>{
 const host=document.querySelector('.read .art');if(!host)return;
 const fallback=document.createElement('span');fallback.className='dv2-read-day-fallback';while(host.firstChild)fallback.append(host.firstChild);host.append(fallback);host.classList.add('dv2-read-day-slot','is-loading');
 const staticImg=document.createElement('img');staticImg.className='dv2-read-day-static';staticImg.alt='紫藤与书本静物';staticImg.decoding='async';staticImg.loading='eager';staticImg.src='../assets/v2/art/read-day/day-assembled.webp';host.append(staticImg);
 staticImg.addEventListener('load',()=>host.classList.add('has-static'),{once:true});
 const canvas=document.createElement('span');canvas.className='dv2-read-day-canvas';
 const layers=[['shadow','day-contact-shadow.webp'],['books','day-books.webp'],['flowers-left','day-flowers-left.webp'],['branch-right','day-branch-right.webp'],['flowers-right','day-flowers-right.webp']];
 const images={};
 const loads=layers.map(([name,file])=>new Promise((resolve,reject)=>{const img=document.createElement('img');img.className=`dv2-read-day-layer dv2-read-day-${name}`;img.alt='';img.decoding='async';img.loading='eager';img.onload=()=>{const d=typeof img.decode==='function'?img.decode():Promise.resolve();d.catch(()=>{}).finally(resolve)};img.onerror=reject;img.src=`../assets/v2/art/read-day/${file}`;images[name]=img;canvas.append(img)}));host.append(canvas);
 let raf=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)');const motion=[['flowers-left',3,0],['branch-right',3,1.1],['flowers-right',1.8,2.4]];
 const stop=()=>{if(raf){cancelAnimationFrame(raf);raf=0}motion.forEach(([n])=>{if(images[n])images[n].style.transform='rotate(0deg)'})};
 const tick=t=>{if(document.hidden||reduced.matches){stop();return}motion.forEach(([n,a,p])=>{images[n].style.transform=`rotate(${-a*Math.sin((Math.PI*2*t/6000)+p)}deg)`});raf=requestAnimationFrame(tick)};
 const sync=()=>{stop();host.classList.toggle('is-reduced',reduced.matches);if(host.classList.contains('is-ready')&&!document.hidden&&!reduced.matches)raf=requestAnimationFrame(tick)};
 Promise.all(loads).then(()=>{host.classList.remove('is-loading');host.classList.add('is-ready');fallback.remove();sync()}).catch(()=>{host.classList.remove('is-loading');host.classList.add('is-missing');canvas.remove();});
 document.addEventListener('visibilitychange',sync);reduced.addEventListener?.('change',sync);sync();document.documentElement.classList.add('detour-read-day-v2');
})();
