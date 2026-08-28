const finiteTime = value => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);

export function planPlayerSync(playerState, roomState, projectedPosition, { seekThreshold = 0.75 } = {}) {
  const roomSong = roomState?.song || null;
  const playerSong = playerState?.song || null;
  const targetTime = finiteTime(typeof projectedPosition === 'function' ? projectedPosition() : projectedPosition ?? roomState?.position);
  const currentTime = finiteTime(playerState?.currentTime);
  const songChanged = (playerSong?.key || null) !== (roomSong?.key || null);

  if (songChanged) {
    return [{ type: 'load', song: roomSong, currentTime: targetTime, playing: Boolean(roomSong && roomState?.playing) }];
  }

  const actions = [];
  const drift = Math.abs(currentTime - targetTime);
  if (drift >= seekThreshold) actions.push({ type: 'seek', currentTime: targetTime, drift });

  const shouldPlay = Boolean(roomSong && roomState?.playing);
  if (shouldPlay !== Boolean(playerState?.playing)) actions.push({ type: shouldPlay ? 'play' : 'pause' });
  return actions;
}

export function applyPlayerSync(player, roomState, projectedPosition, options) {
  if (!player) throw new Error('player is required');
  const actions = planPlayerSync(player.getState(), roomState, projectedPosition, options);
  for (const action of actions) {
    if (action.type === 'load') player.load(action.song, { currentTime: action.currentTime, playing: action.playing });
    else if (action.type === 'seek') player.seek(action.currentTime);
    else if (action.type === 'play') player.play();
    else if (action.type === 'pause') player.pause();
  }
  return actions;
}
