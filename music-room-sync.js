const clampTime = value => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);
const nowIso = now => new Date(now).toISOString();

export function normalizeSong(song) {
  if (!song) return null;
  const provider = song.provider || 'unknown';
  const providerId = song.providerId || song.spotifyTrackId || song.id || null;
  const fallback = `${song.title || ''}::${song.artist || ''}`.trim().toLowerCase();
  return {
    key: providerId ? `${provider}:${providerId}` : `meta:${fallback}`,
    provider,
    providerId,
    title: song.title || '',
    artist: song.artist || '',
    duration: Number.isFinite(Number(song.duration)) ? Number(song.duration) : null,
    source: song.source || null
  };
}

export function createRoomState({ roomId, authorityId, now = Date.now() }) {
  if (!roomId) throw new Error('roomId is required');
  if (!authorityId) throw new Error('authorityId is required');
  return {
    roomId,
    authorityId,
    revision: 0,
    song: null,
    playing: false,
    position: 0,
    positionAt: now,
    updatedAt: nowIso(now),
    updatedBy: authorityId
  };
}

export function projectedPosition(state, now = Date.now()) {
  if (!state) return 0;
  const base = clampTime(state.position);
  if (!state.playing) return base;
  const elapsed = Math.max(0, (now - Number(state.positionAt || now)) / 1000);
  const raw = base + elapsed;
  return state.song?.duration ? Math.min(raw, state.song.duration) : raw;
}

export function applyAuthorityIntent(state, intent, { authorityId, now = Date.now() }) {
  if (!state || authorityId !== state.authorityId) throw new Error('only the room authority may commit state');
  if (!intent || !intent.type) return state;

  const next = {
    ...state,
    position: projectedPosition(state, now),
    positionAt: now,
    revision: state.revision + 1,
    updatedAt: nowIso(now),
    updatedBy: intent.clientId || authorityId
  };

  switch (intent.type) {
    case 'play':
      next.playing = !!next.song;
      return next;
    case 'pause':
      next.playing = false;
      return next;
    case 'seek':
      next.position = next.song?.duration
        ? Math.min(clampTime(intent.position), next.song.duration)
        : clampTime(intent.position);
      return next;
    case 'song':
      next.song = normalizeSong(intent.song);
      next.position = clampTime(intent.position || 0);
      next.playing = Boolean(intent.playing && next.song);
      return next;
    default:
      return state;
  }
}

const matchesRoomAuthority = (local, incoming) => Boolean(
  local && incoming &&
  incoming.roomId === local.roomId &&
  incoming.authorityId === local.authorityId
);

export function shouldAcceptSnapshot(local, incoming) {
  if (!incoming || !local) return Boolean(incoming);
  if (!matchesRoomAuthority(local, incoming)) return false;
  return Number(incoming.revision) > Number(local.revision);
}

export function createBroadcastRoom({ roomId, clientId, authorityId, initialState, onState, channelFactory }) {
  const makeChannel = channelFactory || (name => new BroadcastChannel(name));
  const channel = makeChannel(`detour:music-room:${roomId}`);
  let state = initialState || createRoomState({ roomId, authorityId });
  const isAuthority = clientId === authorityId;
  let hasCanonicalSnapshot = isAuthority;

  const publishState = () => channel.postMessage({ kind: 'snapshot', state });
  const adopt = incoming => {
    const firstCanonicalSnapshot = !hasCanonicalSnapshot &&
      matchesRoomAuthority(state, incoming) &&
      Number(incoming.revision) >= Number(state.revision);

    if (firstCanonicalSnapshot || shouldAcceptSnapshot(state, incoming)) {
      state = incoming;
      hasCanonicalSnapshot = true;
      onState?.(state, 'remote');
    }
  };

  channel.onmessage = event => {
    const message = event.data || {};
    if (message.kind === 'hello' && isAuthority) {
      publishState();
      return;
    }
    if (message.kind === 'intent' && isAuthority) {
      state = applyAuthorityIntent(state, message.intent, { authorityId });
      onState?.(state, 'authority');
      publishState();
      return;
    }
    if (message.kind === 'snapshot') adopt(message.state);
  };

  const send = intent => {
    const normalized = { ...intent, clientId };
    if (isAuthority) {
      state = applyAuthorityIntent(state, normalized, { authorityId });
      onState?.(state, 'authority');
      publishState();
    } else {
      channel.postMessage({ kind: 'intent', intent: normalized });
    }
  };

  channel.postMessage({ kind: 'hello', clientId });

  return {
    getState: () => state,
    getPosition: (now = Date.now()) => projectedPosition(state, now),
    send,
    requestSync: () => channel.postMessage({ kind: 'hello', clientId }),
    close: () => channel.close()
  };
}
