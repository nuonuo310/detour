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
  ...options
} = {}) {
  return createMediaRoomClient({
    ...options,
    url: musicRoomWebSocketUrl(location, roomId),
    roomId,
    clientId,
    media,
    resolveSource
  });
}
