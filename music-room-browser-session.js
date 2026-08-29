import { createMediaRoomClient } from './music-room-media-client.js';

export function musicRoomWebSocketUrl(locationLike, roomId) {
  if (!locationLike?.host) throw new Error('location.host is required');
  if (!roomId) throw new Error('roomId is required');
  const protocol = locationLike.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${locationLike.host}/music-room/${encodeURIComponent(roomId)}`;
}

/**
 * Small browser-facing entry point for the real "一起听" chain.
 * Room transport, canonical timing and HTMLMediaElement playback all stay in
 * reusable modules. Music source selection remains injected by resolveSource.
 */
export function createBrowserMusicRoomSession({
  location = globalThis.location,
  roomId,
  clientId,
  media,
  resolveSource,
  requirePlaybackArm = true,
  ...options
} = {}) {
  let playbackArmed = !requirePlaybackArm;
  let armedAt = playbackArmed ? -Infinity : Infinity;
  let joinedPlayAt = null;
  let session = null;

  const serviceNow = () => Date.now() + Number(session?.getServiceClockOffset?.() || 0);
  const playbackAllowed = () => {
    if (!playbackArmed) return false;
    if (typeof options.canPlay === 'function' && options.canPlay() === false) return false;
    if (!requirePlaybackArm) return true;

    const state = session?.getState?.();
    if (!state?.playing) return true;
    const playAt = Number(state.playAt);
    if (!Number.isFinite(playAt)) return false;
    return playAt >= armedAt || playAt === joinedPlayAt;
  };

  session = createMediaRoomClient({
    ...options,
    url: musicRoomWebSocketUrl(location, roomId),
    roomId,
    clientId,
    media,
    resolveSource,
    canPlay: playbackAllowed
  });

  return {
    ...session,
    isPlaybackArmed: () => playbackArmed,
    async armPlayback({ joinCurrent = false } = {}) {
      playbackArmed = true;
      armedAt = serviceNow();
      const currentPlayAt = Number(session.getState()?.playAt);
      joinedPlayAt = joinCurrent && Number.isFinite(currentPlayAt) ? currentPlayAt : null;
      await session.sync();
      return session.whenSynced();
    },
    disarmPlayback() {
      playbackArmed = false;
      armedAt = Infinity;
      joinedPlayAt = null;
      session.player.pause();
      return playbackArmed;
    }
  };
}
