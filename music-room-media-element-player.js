const finiteTime = value => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);

/**
 * Adapt an HTMLMediaElement to the room player contract without choosing a
 * music provider. resolveSource(song) is deliberately injected by the caller.
 */
export function createMediaElementPlayer({ media, resolveSource } = {}) {
  if (!media) throw new Error('media is required');
  if (typeof resolveSource !== 'function') throw new Error('resolveSource is required');

  let song = null;
  let loadGeneration = 0;

  const snapshot = () => ({
    song: song ? { ...song } : null,
    playing: Boolean(song && !media.paused && !media.ended),
    currentTime: finiteTime(media.currentTime)
  });

  const setCurrentTime = currentTime => {
    const next = finiteTime(currentTime);
    try {
      media.currentTime = next;
    } catch {
      // Some media elements reject seeking until metadata is available.
    }
  };

  const safePlay = () => {
    const result = media.play?.();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  };

  return {
    async load(nextSong, { currentTime = 0, playing = false } = {}) {
      const generation = ++loadGeneration;
      song = nextSong ? { ...nextSong } : null;

      if (!song) {
        media.pause?.();
        media.removeAttribute?.('src');
        media.load?.();
        return;
      }

      const source = await resolveSource({ ...song });
      if (generation !== loadGeneration) return;
      if (!source) throw new Error(`No playable source for ${song.key || song.title || 'song'}`);

      const src = typeof source === 'string' ? source : source.src;
      if (!src) throw new Error('resolved media source must include src');
      if (media.src !== src) {
        media.src = src;
        media.load?.();
      }

      const align = () => {
        if (generation !== loadGeneration) return;
        setCurrentTime(currentTime);
        if (playing) safePlay();
        else media.pause?.();
      };

      if (media.readyState >= 1) align();
      else media.addEventListener?.('loadedmetadata', align, { once: true });
    },
    play() {
      if (song) safePlay();
    },
    pause() {
      media.pause?.();
    },
    seek(currentTime) {
      setCurrentTime(currentTime);
    },
    getState: snapshot
  };
}
