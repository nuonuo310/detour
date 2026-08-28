import { applyPlayerSync } from './music-room-player-adapter.js';

export function bindRoomClientToPlayer({ room, player, seekThreshold = 0.75, onSync } = {}) {
  if (!room) throw new Error('room is required');
  if (!player) throw new Error('player is required');

  const sync = state => {
    const roomState = state || room.getState();
    const actions = applyPlayerSync(
      player,
      roomState,
      () => room.getPosition(),
      { seekThreshold }
    );
    onSync?.(actions, roomState, player.getState());
    return actions;
  };

  sync(room.getState());

  return {
    sync,
    getPlayerState: () => player.getState()
  };
}
