(() => {
  if (!document.body.classList.contains('music-page') || typeof DetourData === 'undefined') return;

  const embedTrack = id => `https://open.spotify.com/embed/track/${encodeURIComponent(id)}?utm_source=generator&theme=0`;
  const embedPlaylist = id => `https://open.spotify.com/embed/playlist/${encodeURIComponent(id)}?utm_source=generator&theme=0`;

  function mountEmbed(host, src, title) {
    if (!host || !src) return;
    host.innerHTML = '';
    const frame = document.createElement('iframe');
    frame.src = src;
    frame.title = title;
    frame.width = '100%';
    frame.height = '152';
    frame.loading = 'lazy';
    frame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    frame.style.border = '0';
    frame.style.borderRadius = '16px';
    host.append(frame);
  }

  async function init() {
    const data = await DetourData.load('music');
    if (!data) return;
    const records = [...(data.records || [])].sort((a,b) => new Date(b.pickedAt || b.at) - new Date(a.pickedAt || a.at));
    const latest = records[0];
    const playlist = data.playlist || null;

    if (playlist?.url) {
      const links = ['#playlistLink', '#playlistExternal', '#detailPlaylist'];
      links.forEach(sel => {
        const a = document.querySelector(sel);
        if (!a) return;
        a.href = playlist.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.classList.remove('is-disabled');
        a.removeAttribute('aria-disabled');
        a.hidden = false;
      });
    }

    if (playlist?.name) {
      const state = document.querySelector('#detailPlaylistState');
      if (state) state.textContent = `已连接 · ${playlist.name}`;
    }

    if (latest?.spotifyTrackId) {
      mountEmbed(document.querySelector('#spotifySlot'), embedTrack(latest.spotifyTrackId), `${latest.title || 'Spotify track'} player`);
    }

    if (document.body.classList.contains('music-detail-page')) {
      const id = new URLSearchParams(location.search).get('id');
      const current = records.find(r => r.id === id) || latest;
      if (current?.spotifyTrackId) mountEmbed(document.querySelector('#detailPlayer'), embedTrack(current.spotifyTrackId), `${current.title || 'Spotify track'} player`);
    }

    const playlistPanel = document.querySelector('#playlist');
    if (playlistPanel && playlist?.spotifyPlaylistId && !document.querySelector('#playlistSpotifyEmbed')) {
      const wrap = document.createElement('div');
      wrap.id = 'playlistSpotifyEmbed';
      wrap.className = 'spotify-playlist-embed';
      const frame = document.createElement('iframe');
      frame.src = embedPlaylist(playlist.spotifyPlaylistId);
      frame.title = `${playlist.name || 'Spotify playlist'} playlist`;
      frame.width = '100%';
      frame.height = '352';
      frame.loading = 'lazy';
      frame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      frame.style.border = '0';
      frame.style.borderRadius = '18px';
      wrap.append(frame);
      const external = document.querySelector('#playlistExternal');
      playlistPanel.insertBefore(wrap, external || null);
    }
  }

  init();
})();
