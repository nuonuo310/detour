(() => {
  const embedUrl = (type, id) => id ? `https://open.spotify.com/embed/${type}/${encodeURIComponent(id)}?utm_source=generator&theme=0` : '';
  const iframe = (src, title) => {
    const el = document.createElement('iframe');
    el.src = src;
    el.title = title;
    el.width = '100%';
    el.height = '152';
    el.frameBorder = '0';
    el.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    el.loading = 'lazy';
    el.style.borderRadius = '16px';
    return el;
  };

  async function init() {
    if (typeof DetourData === 'undefined') return;
    const data = await DetourData.load('music');
    if (!data) return;
    const playlist = data.playlist || null;
    const records = [...(data.records || [])].sort((a,b)=>new Date(b.pickedAt||b.at)-new Date(a.pickedAt||a.at));

    if (playlist?.url) {
      const homeLink = document.querySelector('#playlistExternal');
      if (homeLink) {
        homeLink.href = playlist.url;
        homeLink.target = '_blank';
        homeLink.rel = 'noopener noreferrer';
        homeLink.hidden = false;
        homeLink.textContent = `打开 Spotify 真实歌单 · ${playlist.name || '共同歌单'} ↗`;
      }
      const detailLink = document.querySelector('#detailPlaylist');
      if (detailLink) {
        detailLink.href = playlist.url;
        detailLink.target = '_blank';
        detailLink.rel = 'noopener noreferrer';
        detailLink.classList.remove('is-disabled');
        detailLink.removeAttribute('aria-disabled');
        detailLink.textContent = `打开共同 Spotify 歌单 · ${playlist.name || '歌单'} ↗`;
      }
      const state = document.querySelector('#detailPlaylistState');
      if (state) state.textContent = `已连接 · ${playlist.name || 'Spotify 歌单'}`;
    }

    const params = new URLSearchParams(location.search);
    const requested = params.get('id');
    const record = requested ? records.find(r=>r.id===requested) : records[0];
    if (!record?.spotifyTrackId) return;

    const src = embedUrl('track', record.spotifyTrackId);
    const homeSlot = document.querySelector('#spotifySlot');
    if (homeSlot && document.body.classList.contains('music-v2')) {
      homeSlot.replaceChildren(iframe(src, `${record.title || 'Spotify track'} 播放器`));
      homeSlot.classList.add('has-spotify-embed');
    }
    const detailSlot = document.querySelector('#detailPlayer');
    if (detailSlot) {
      detailSlot.replaceChildren(iframe(src, `${record.title || 'Spotify track'} 播放器`));
      detailSlot.classList.add('has-spotify-embed');
    }
  }

  init();
})();
