(() => {
  if (!document.body.classList.contains('music-page') || typeof DetourData === 'undefined') return;

  const embedTrack = id => `https://open.spotify.com/embed/track/${encodeURIComponent(id)}?utm_source=generator&theme=0`;
  const embedPlaylist = id => `https://open.spotify.com/embed/playlist/${encodeURIComponent(id)}?utm_source=generator&theme=0`;

  function mountStaticEmbed(host, src, title, height='152') {
    if (!host || !src) return;
    host.innerHTML = '';
    host.classList.remove('spotify-loading', 'spotify-fallback');
    host.classList.add('has-spotify-embed');
    const frame = document.createElement('iframe');
    frame.src = src;
    frame.title = title;
    frame.width = '100%';
    frame.height = height;
    frame.loading = 'eager';
    frame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.style.border = '0';
    frame.style.borderRadius = '16px';
    frame.style.display = 'block';
    host.append(frame);
  }

  async function init() {
    const data = await DetourData.load('music');
    if (!data) return;
    const records = [...(data.records || [])].sort((a,b) => new Date(b.pickedAt || b.at) - new Date(a.pickedAt || a.at));
    const latest = records[0];
    const playlist = data.playlist || null;

    if (playlist?.url) {
      ['#playlistLink', '#playlistExternal', '#detailPlaylist'].forEach(sel => {
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

    const id = new URLSearchParams(location.search).get('id');
    const current = id ? records.find(r => r.id === id) || latest : latest;

    if (document.body.classList.contains('music-v2') && latest?.spotifyTrackId) {
      mountStaticEmbed(document.querySelector('#spotifySlot'), embedTrack(latest.spotifyTrackId), `${latest.title || 'Spotify track'} player`);
    }

    if (document.body.classList.contains('music-detail-page') && current?.spotifyTrackId) {
      mountStaticEmbed(document.querySelector('#detailPlayer'), embedTrack(current.spotifyTrackId), `${current.title || 'Spotify track'} player`);
    }

    const playlistPanel = document.querySelector('#playlist');
    if (playlistPanel && playlist?.spotifyPlaylistId && !document.querySelector('#playlistSpotifyEmbed')) {
      const wrap = document.createElement('div');
      wrap.id = 'playlistSpotifyEmbed';
      wrap.className = 'spotify-playlist-embed';
      mountStaticEmbed(wrap, embedPlaylist(playlist.spotifyPlaylistId), `${playlist.name || 'Spotify playlist'} playlist`, '352');
      const external = document.querySelector('#playlistExternal');
      playlistPanel.insertBefore(wrap, external || null);
    }
  }

  init();
})();
