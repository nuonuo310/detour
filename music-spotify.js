(() => {
  if (!document.body.classList.contains('music-page') || typeof DetourData === 'undefined') return;

  const API_SRC = 'https://open.spotify.com/embed/iframe-api/v1';
  let iframeAPI = null;
  let apiPromise = null;

  function spotifyApi() {
    if (iframeAPI) return Promise.resolve(iframeAPI);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      const previous = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = api => {
        iframeAPI = api;
        if (typeof previous === 'function') previous(api);
        resolve(api);
      };
      const existing = document.querySelector(`script[src="${API_SRC}"]`);
      if (!existing) {
        const script = document.createElement('script');
        script.src = API_SRC;
        script.async = true;
        script.onerror = () => reject(new Error('Spotify iframe API failed to load'));
        document.body.append(script);
      }
      setTimeout(() => { if (!iframeAPI) reject(new Error('Spotify iframe API timed out')); }, 10000);
    });
    return apiPromise;
  }

  function setExternalLink(selector, playlist) {
    const a = document.querySelector(selector);
    if (!a || !playlist?.url) return;
    a.href = playlist.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.classList.remove('is-disabled');
    a.removeAttribute('aria-disabled');
    a.hidden = false;
  }

  function fallback(host, url, label) {
    if (!host) return;
    host.classList.remove('spotify-loading');
    host.classList.add('spotify-fallback');
    host.innerHTML = '';
    const p = document.createElement('p');
    p.textContent = 'Spotify 播放器暂时没有加载出来。';
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = `${label} ↗`;
    host.append(p, a);
  }

  async function mountController(host, uri, height, fallbackUrl, fallbackLabel) {
    if (!host || !uri) return;
    host.innerHTML = '';
    host.classList.add('spotify-loading');
    const mount = document.createElement('div');
    mount.className = 'spotify-api-mount';
    host.append(mount);
    try {
      const api = await spotifyApi();
      api.createController(mount, { width: '100%', height, uri }, controller => {
        host.classList.remove('spotify-loading');
        host.classList.add('has-spotify-embed');
        controller.addListener('ready', () => host.classList.add('spotify-ready'));
      });
    } catch (error) {
      console.warn('Spotify embed unavailable:', error);
      fallback(host, fallbackUrl, fallbackLabel);
    }
  }

  async function init() {
    const data = await DetourData.load('music');
    if (!data) return;
    const records = [...(data.records || [])].sort((a,b) => new Date(b.pickedAt || b.at) - new Date(a.pickedAt || a.at));
    const latest = records[0];
    const playlist = data.playlist || null;

    ['#playlistLink', '#playlistExternal', '#detailPlaylist'].forEach(sel => setExternalLink(sel, playlist));
    if (playlist?.name) {
      const state = document.querySelector('#detailPlaylistState');
      if (state) state.textContent = `已连接 · ${playlist.name}`;
    }

    const params = new URLSearchParams(location.search);
    const requested = params.get('id');
    const current = requested ? records.find(r => r.id === requested) || latest : latest;

    if (document.querySelector('#spotifySlot') && latest?.spotifyUri) {
      mountController(document.querySelector('#spotifySlot'), latest.spotifyUri, 152, latest.url, '去 Spotify 播放');
    }
    if (document.querySelector('#detailPlayer') && current?.spotifyUri) {
      mountController(document.querySelector('#detailPlayer'), current.spotifyUri, 152, current.url, '去 Spotify 播放');
    }

    const playlistPanel = document.querySelector('#playlist');
    if (playlistPanel && playlist?.spotifyUri && !document.querySelector('#playlistSpotifyEmbed')) {
      const wrap = document.createElement('div');
      wrap.id = 'playlistSpotifyEmbed';
      wrap.className = 'spotify-playlist-embed';
      const external = document.querySelector('#playlistExternal');
      playlistPanel.insertBefore(wrap, external || null);
      mountController(wrap, playlist.spotifyUri, 352, playlist.url, '打开 Spotify 真实歌单');
    }
  }

  init();
})();
