(()=>{
  const modules={
    listen:{src:'../assets/v2/art/listen-gramophone.webp',alt:'紫藤与唱片机静物'},
    read:{src:'../assets/v2/art/read-books.webp',alt:'紫藤与书本静物'},
    gifts:{src:'../assets/v2/art/gifts-keepsakes.webp',alt:'信封、礼物、蜡封与珍珠静物'},
    feed:{src:'../assets/v2/art/feeding-tea.webp',alt:'奶茶、茶杯与托盘静物'},
    games:{src:'../assets/v2/art/games-keepsakes.webp',alt:'手柄、骰子与卡牌静物'},
    dates:{src:'../assets/v2/art/dates-letter.webp',alt:'羽毛笔、信纸与纪念物静物'}
  };

  function mount(selector,{src,alt}){
    const host=document.querySelector(`.${selector} .art`);
    if(!host)return;
    host.textContent='';
    host.classList.add('dv2-art-slot');
    host.dataset.art=selector;
    const img=document.createElement('img');
    img.className='dv2-art-image';
    img.alt=alt;
    img.decoding='async';
    img.loading='eager';
    img.src=src;
    img.addEventListener('load',()=>host.classList.add('is-ready'),{once:true});
    img.addEventListener('error',()=>{
      host.classList.add('is-missing');
      img.remove();
    },{once:true});
    host.append(img);
  }

  Object.entries(modules).forEach(([name,asset])=>mount(name,asset));
  document.documentElement.classList.add('detour-art-assets-v1');
})();
