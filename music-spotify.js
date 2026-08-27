(() => {
  if (!document.body.classList.contains('music-page') || typeof DetourData === 'undefined') return;

  const embedTrack = id => `https://open.spotify.com/embed/track/${encodeURIComponent(id)}?utm_source=generator&theme=0`;
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function makeNativeCard(host, record) {
    if (!host || !record?.url) return;
    host.classList.remove('has-spotify-embed');
    host.classList.add('spotify-native-card');
    host.innerHTML = '';

    const copy = document.createElement('div');
    copy.className = 'spotify-native-copy';
    const label = document.createElement('span');
    label.textContent = 'SPOTIFY';
    const title = document.createElement('strong');
    title.textContent = record.title || '这首歌';
    const artist = document.createElement('small');
    artist.textContent = record.artist || 'Spotify';
    copy.append(label, title, artist);

    const play = document.createElement('a');
    play.className = 'spotify-native-play';
    play.href = record.url;
    play.target = '_blank';
    play.rel = 'noopener noreferrer';
    play.textContent = '在 Spotify 播放 ↗';

    host.append(copy, play);
  }

  function ensureTrackEmbed(host, record) {
    if (!host || !record?.spotifyTrackId) return;
    if (isIOS) {
      makeNativeCard(host, record);
      return;
    }
    const existing = host.querySelector('iframe[data-spotify-track]');
    if (existing) {
      if (existing.dataset.spotifyTrack !== record.spotifyTrackId) {
        existing.dataset.spotifyTrack = record.spotifyTrackId;
        existing.src = embedTrack(record.spotifyTrackId);
        existing.title = `${record.title || 'Spotify track'} Spotify player`;
      }
      host.classList.add('has-spotify-embed');
      return;
    }
    const frame = document.createElement('iframe');
    frame.dataset.spotifyTrack = record.spotifyTrackId;
    frame.src = embedTrack(record.spotifyTrackId);
    frame.title = `${record.title || 'Spotify track'} Spotify player`;
    frame.width = '100%';
    frame.height = '152';
    frame.setAttribute('frameborder', '0');
    frame.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
    frame.setAttribute('allowfullscreen', '');
    frame.style.cssText = 'border:0;border-radius:16px;display:block';
    host.replaceChildren(frame);
    host.classList.add('has-spotify-embed');
  }

  async function init() {
    const data = await DetourData.load('music');
    if (!data) return;
    const records = [...(data.records || [])].sort((a,b) => new Date(b.pickedAt || b.at) - new Date(a.pickedAt || a.at));
    const latest = records[0];
    const library = data.library || null;

    if (library?.name) {
      const state = document.querySelector('#detailPlaylistState');
      if (state) state.textContent = `Detour · ${library.name}`;
    }

    const id = new URLSearchParams(location.search).get('id');
    const current = id ? records.find(r => r.id === id) || latest : latest;

    ensureTrackEmbed(document.querySelector('#spotifySlot'), latest);
    ensureTrackEmbed(document.querySelector('#detailPlayer'), current);
  }

  init();
})();
