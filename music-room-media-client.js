import { planPlayerSync } from './music-room-player-adapter.js';
import { createMediaElementPlayer } from './music-room-media-element-player.js';
import { createWebSocketRoomClient } from './music-room-websocket-client.js';

async function runPlayerActions(player, actions) {
  for (const action of actions) {
    if (action.type === 'load') {
      await player.load(action.song, {
        currentTime: action.currentTime,
        playing: action.playing
      });
    } else if (action.type === 'seek') {
      player.seek(action.currentTime);
    } else if (action.type === 'play') {
      await player.play();
    } else if (action.type === 'pause') {
      player.pause();
    }
  }
}

/**
 * Browser-facing composition for "一起听":
 * WebSocket room authority -> canonical state -> HTMLMediaElement.
 *
 * The concrete music provider stays outside this module. Callers inject
 * resolveSource(song), so changing providers does not change room semantics.
 */
export function createMediaRoomClient({
  url,
  roomId,
  clientId,
  media,
  resolveSource,
  authorityId = 'room-service',
  initialState,
  seekThreshold = 0.75,
  onState,
  onSync,
  onOpen,
  onClose,
  webSocketFactory
} = {}) {
  const player = createMediaElementPlayer({ media, resolveSource });
  let room = null;
  let syncChain = Promise.resolve();

  const scheduleSync = roomState => {
    syncChain = syncChain
      .then(async () => {
        if (!room) return [];
        const actions = planPlayerSync(
          player.getState(),
          roomState,
          () => room.getPosition(),
          { seekThreshold }
        );
        await runPlayerActions(player, actions);
        onSync?.(actions, roomState, player.getState());
        return actions;
      })
      .catch(error => {
        onSync?.([], roomState, player.getState(), error);
        return [];
      });
    return syncChain;
  };

  room = createWebSocketRoomClient({
    url,
    roomId,
    clientId,
    authorityId,
    initialState,
    webSocketFactory,
    onOpen,
    onClose,
    onState: (state, source) => {
      scheduleSync(state);
      onState?.(state, source);
    }
  });

  scheduleSync(room.getState());

  return {
    ...room,
    player,
    sync: () => scheduleSync(room.getState()),
    whenSynced: () => syncChain
  };
}
