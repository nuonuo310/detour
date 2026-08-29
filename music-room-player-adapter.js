const finiteTime = value => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);

export function planPlayerSync(playerState, roomState, projectedPosition, { seekThreshold = 0.75, serviceNow } = {}) {
  const roomSong = roomState?.song || null;
  const playerSong = playerState?.song || null;
  const targetTime = finiteTime(typeof projectedPosition === 'function' ? projectedPosition() : projectedPosition ?? roomState?.position);
  const currentTime = finiteTime(playerState?.currentTime);
  const songChanged = (playerSong?.key || null) !== (roomSong?.key || null);
  const shouldPlay = Boolean(roomSong && roomState?.playing);
  const playAt = Number(roomState?.playAt);
  const now = Number(typeof serviceNow === 'function' ? serviceNow() : serviceNow);
  const scheduledDelay = shouldPlay && Number.isFinite(playAt) && Number.isFinite(now) ? Math.max(0, playAt - now) : 0;

  if (songChanged) {
    const actions = [{ type: 'load', song: roomSong, currentTime: targetTime, playing: shouldPlay && scheduledDelay === 0 }];
    if (shouldPlay && scheduledDelay > 0) actions.push({ type: 'playAt', delayMs: scheduledDelay, playAt });
    return actions;
  }

  const actions = [];
  const drift = Math.abs(currentTime - targetTime);
  if (drift >= seekThreshold) actions.push({ type: 'seek', currentTime: targetTime, drift });

  if (shouldPlay && !playerState?.playing) {
    actions.push(scheduledDelay > 0 ? { type: 'playAt', delayMs: scheduledDelay, playAt } : { type: 'play' });
  } else if (!shouldPlay && playerState?.playing) {
    actions.push({ type: 'pause' });
  }
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
