import { planPlayerSync } from './music-room-player-adapter.js';
import { createMediaElementPlayer } from './music-room-media-element-player.js';
import { createWebSocketRoomClient } from './music-room-websocket-client.js';

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
  webSocketFactory,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  now = () => Date.now()
} = {}) {
  const player = createMediaElementPlayer({ media, resolveSource });
  let room = null;
  let syncChain = Promise.resolve();
  let playTimer = null;
  let scheduledPlayAt = null;

  const clearScheduledPlay = () => {
    if (playTimer) clearTimer(playTimer);
    playTimer = null;
    scheduledPlayAt = null;
  };

  const runPlayerActions = async actions => {
    for (const action of actions) {
      if (action.type === 'load') {
        clearScheduledPlay();
        await player.load(action.song, { currentTime: action.currentTime, playing: action.playing });
      } else if (action.type === 'seek') {
        player.seek(action.currentTime);
      } else if (action.type === 'playAt') {
        if (scheduledPlayAt === action.playAt) continue;
        clearScheduledPlay();
        scheduledPlayAt = action.playAt;
        playTimer = setTimer(async () => {
          playTimer = null;
          scheduledPlayAt = null;
          if (!room?.getState()?.playing || Number(room.getState()?.playAt) !== Number(action.playAt)) return;
          await player.play();
        }, Math.max(0, action.delayMs));
      } else if (action.type === 'play') {
        clearScheduledPlay();
        await player.play();
      } else if (action.type === 'pause') {
        clearScheduledPlay();
        player.pause();
      }
    }
  };

  const scheduleSync = roomState => {
    syncChain = syncChain
      .then(async () => {
        if (!room) return [];
        if (!roomState?.playing) clearScheduledPlay();
        const serviceNow = () => Number(now()) + Number(room.getServiceClockOffset?.() || 0);
        const actions = planPlayerSync(player.getState(), roomState, () => room.getPosition(), { seekThreshold, serviceNow });
        await runPlayerActions(actions);
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
    whenSynced: () => syncChain,
    close(code, reason) {
      clearScheduledPlay();
      room.close(code, reason);
    }
  };
}
