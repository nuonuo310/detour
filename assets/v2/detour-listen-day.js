(()=>{
  const host=document.querySelector('.listen .art');
  if(!host||host.dataset.listenDayMounted==='true')return;

  const base='../assets/v2/art/listen-day/';
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  host.dataset.listenDayMounted='true';
  host.classList.add('dv2-listen-day-slot');

  const fallback=document.createElement('span');
  fallback.className='dv2-listen-day-fallback';
  while(host.firstChild)fallback.append(host.firstChild);
  host.append(fallback);

  const makeImage=(name,className,alt='')=>{
    const img=document.createElement('img');
    img.className=`dv2-listen-day-layer ${className}`;
    img.src=base+name;
    img.alt=alt;
    img.decoding='async';
    img.loading='eager';
    return img;
  };
  const decoded=img=>new Promise((resolve,reject)=>{
    const done=()=>{
      const p=typeof img.decode==='function'?img.decode():Promise.resolve();
      p.catch(()=>{}).finally(resolve);
    };
    if(img.complete){
      if(img.naturalWidth)done();else reject(new Error(`Failed to load ${img.src}`));
      return;
    }
    img.addEventListener('load',done,{once:true});
    img.addEventListener('error',reject,{once:true});
  });

  /* Static assembled art is the first visual checkpoint and runtime fallback. */
  const staticArt=document.createElement('img');
  staticArt.className='dv2-listen-day-static';
  staticArt.src=base+'day-assembled.webp';
  staticArt.alt='日镜 Listen 紫藤留声机静物';
  staticArt.decoding='async';
  staticArt.loading='eager';
  staticArt.addEventListener('load',()=>{
    const p=typeof staticArt.decode==='function'?staticArt.decode():Promise.resolve();
    p.catch(()=>{}).finally(()=>host.classList.add('has-static'));
  },{once:true});
  staticArt.addEventListener('error',()=>host.classList.add('is-missing'),{once:true});
  host.append(staticArt);

  /* Layered canvas keeps the manifest's 1122×1402 coordinate system. */
  const canvas=document.createElement('span');
  canvas.className='dv2-listen-day-canvas';

  const body=makeImage('day-body.webp','dv2-listen-day-body');
  const spindle=makeImage('day-spindle-foreground.webp','dv2-listen-day-spindle');
  const branchRight=makeImage('day-branch-right.webp','dv2-listen-day-branch-right');
  const flowersLeft=makeImage('day-flowers-left.webp','dv2-listen-day-flowers-left');
  const flowersRight=makeImage('day-flowers-right-ground.webp','dv2-listen-day-flowers-right-ground');

  const recordProjection=document.createElement('span');
  recordProjection.className='dv2-listen-day-record-projection';
  const recordScale=document.createElement('span');
  recordScale.className='dv2-listen-day-record-scale';
  const record=makeImage('day-record-top.webp','dv2-listen-day-record');
  recordScale.append(record);
  recordProjection.append(recordScale);

  canvas.append(body,recordProjection,spindle,branchRight,flowersLeft,flowersRight);
  host.append(canvas);

  const syncAmbient=()=>{
    const active=host.classList.contains('is-ready')&&!document.hidden&&!reduced.matches;
    host.classList.toggle('is-ambient-active',active);
  };
  const syncPlaying=playing=>{
    host.dataset.playing=playing?'true':'false';
    host.classList.toggle('is-playing',Boolean(playing)&&!reduced.matches);
  };

  Promise.all([body,record,spindle,branchRight,flowersLeft,flowersRight].map(decoded))
    .then(()=>{
      host.classList.remove('is-missing');
      host.classList.add('is-ready');
      syncAmbient();
      syncPlaying(host.dataset.playing==='true');
    })
    .catch(()=>{
      host.classList.add('is-missing');
      host.classList.remove('is-ready','is-ambient-active','is-playing');
    });

  window.addEventListener('detour:listen-play-state',event=>{
    if(typeof event.detail?.playing==='boolean')syncPlaying(event.detail.playing);
  });
  const observer=new MutationObserver(()=>syncPlaying(host.dataset.playing==='true'));
  observer.observe(host,{attributes:true,attributeFilter:['data-playing']});
  document.addEventListener('visibilitychange',syncAmbient);
  reduced.addEventListener?.('change',()=>{
    syncAmbient();
    syncPlaying(host.dataset.playing==='true');
  });

  document.documentElement.classList.add('detour-listen-day-v1');
})();
