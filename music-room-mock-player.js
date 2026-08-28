export function createMockPlayer({ id = 'mock-player' } = {}) {
  let state = { song: null, playing: false, currentTime: 0 };
  const history = [];

  const snapshot = () => ({
    song: state.song ? { ...state.song } : null,
    playing: state.playing,
    currentTime: state.currentTime
  });

  const record = type => history.push({ type, state: snapshot() });

  return {
    id,
    load(song, { playing = false, currentTime = 0 } = {}) {
      state = { song: song ? { ...song } : null, playing: Boolean(song && playing), currentTime: Number(currentTime) || 0 };
      record('load');
    },
    play() {
      if (state.song) state.playing = true;
      record('play');
    },
    pause() {
      state.playing = false;
      record('pause');
    },
    seek(currentTime) {
      state.currentTime = Math.max(0, Number(currentTime) || 0);
      record('seek');
    },
    applyRoomState(roomState, projectedPosition) {
      const nextSong = roomState?.song || null;
      const nextTime = typeof projectedPosition === 'function'
        ? projectedPosition()
        : Number(projectedPosition ?? roomState?.position ?? 0);
      state = {
        song: nextSong ? { ...nextSong } : null,
        playing: Boolean(nextSong && roomState?.playing),
        currentTime: Math.max(0, Number(nextTime) || 0)
      };
      record('sync');
    },
    getState: snapshot,
    getHistory: () => history.map(entry => ({ type: entry.type, state: { ...entry.state, song: entry.state.song ? { ...entry.state.song } : null } }))
  };
}

export function bindRoomToPlayer(room, player) {
  if (!room || !player) throw new Error('room and player are required');
  const apply = state => player.applyRoomState(state, () => room.getPosition());
  apply(room.getState());
  return { apply };
}
