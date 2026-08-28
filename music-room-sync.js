const clampTime = value => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);
const nowIso = now => new Date(now).toISOString();

export function normalizeSong(song) {
  if (!song) return null;
  const provider = song.provider || 'unknown';
  const providerId = song.providerId || song.spotifyTrackId || song.id || null;
  const fallback = `${song.title || ''}::${song.artist || ''}`.trim().toLowerCase();
  return { key: providerId ? `${provider}:${providerId}` : `meta:${fallback}`, provider, providerId, title: song.title || '', artist: song.artist || '', duration: Number.isFinite(Number(song.duration)) ? Number(song.duration) : null, source: song.source || null };
}

export function createRoomState({ roomId, authorityId, now = Date.now() }) {
  if (!roomId) throw new Error('roomId is required');
  if (!authorityId) throw new Error('authorityId is required');
  return { roomId, authorityId, revision: 0, song: null, playing: false, position: 0, positionAt: now, playAt: null, updatedAt: nowIso(now), updatedBy: authorityId };
}

export function projectedPosition(state, now = Date.now()) {
  if (!state) return 0;
  const base = clampTime(state.position);
  if (!state.playing) return base;
  const anchor = Number(state.playAt ?? state.positionAt ?? now);
  const elapsed = Math.max(0, (now - anchor) / 1000);
  const raw = base + elapsed;
  return state.song?.duration ? Math.min(raw, state.song.duration) : raw;
}

export function applyAuthorityIntent(state, intent, { authorityId, now = Date.now() }) {
  if (!state || authorityId !== state.authorityId) throw new Error('only the room authority may commit state');
  if (!intent || !intent.type) return state;
  const next = { ...state, position: projectedPosition(state, now), positionAt: now, playAt: state.playing && Number(state.playAt) > now ? state.playAt : null, revision: state.revision + 1, updatedAt: nowIso(now), updatedBy: intent.clientId || authorityId };
  switch (intent.type) {
    case 'play': {
      next.playing = !!next.song;
      const leadMs = Math.max(0, Math.min(3000, Number(intent.leadMs) || 0));
      next.playAt = next.playing ? now + leadMs : null;
      next.positionAt = next.playAt || now;
      return next;
    }
    case 'pause': next.playing = false; next.playAt = null; return next;
    case 'seek': next.position = next.song?.duration ? Math.min(clampTime(intent.position), next.song.duration) : clampTime(intent.position); next.playAt = null; next.positionAt = now; return next;
    case 'song': next.song = normalizeSong(intent.song); next.position = clampTime(intent.position || 0); next.playing = Boolean(intent.playing && next.song); next.playAt = null; return next;
    default: return state;
  }
}

export function createRoomAuthority({ roomId, authorityId, initialState, now = () => Date.now() }) {
  let state = initialState || createRoomState({ roomId, authorityId, now: now() });
  if (state.roomId !== roomId) throw new Error('initialState roomId mismatch');
  if (state.authorityId !== authorityId) throw new Error('initialState authorityId mismatch');
  return { getState: () => state, getPosition: (at = now()) => projectedPosition(state, at), applyIntent(intent) { const next = applyAuthorityIntent(state, intent, { authorityId, now: now() }); const changed = next !== state; state = next; return { state, changed }; } };
}

const matchesRoomAuthority = (local, incoming) => Boolean(local && incoming && incoming.roomId === local.roomId && incoming.authorityId === local.authorityId);
export function shouldAcceptSnapshot(local, incoming) { if (!incoming || !local) return Boolean(incoming); if (!matchesRoomAuthority(local, incoming)) return false; return Number(incoming.revision) > Number(local.revision); }

export function createBroadcastRoom({ roomId, clientId, authorityId, initialState, onState, channelFactory }) {
  const makeChannel = channelFactory || (name => new BroadcastChannel(name)); const channel = makeChannel(`detour:music-room:${roomId}`); const isAuthority = clientId === authorityId; const authority = isAuthority ? createRoomAuthority({ roomId, authorityId, initialState }) : null; let state = authority?.getState() || initialState || createRoomState({ roomId, authorityId }); let hasCanonicalSnapshot = isAuthority;
  const publishState = () => channel.postMessage({ kind: 'snapshot', state: authority.getState() });
  const commitIntent = intent => { const result = authority.applyIntent(intent); if (!result.changed) return; state = result.state; onState?.(state, 'authority'); publishState(); };
  const adopt = incoming => { const first = !hasCanonicalSnapshot && matchesRoomAuthority(state, incoming) && Number(incoming.revision) >= Number(state.revision); if (first || shouldAcceptSnapshot(state, incoming)) { state = incoming; hasCanonicalSnapshot = true; onState?.(state, 'remote'); } };
  channel.onmessage = event => { const message = event.data || {}; if (message.kind === 'hello' && isAuthority) return publishState(); if (message.kind === 'intent' && isAuthority) return commitIntent(message.intent); if (message.kind === 'snapshot') adopt(message.state); };
  const send = intent => { const normalized = { ...intent, clientId }; if (isAuthority) commitIntent(normalized); else channel.postMessage({ kind: 'intent', intent: normalized }); };
  channel.postMessage({ kind: 'hello', clientId });
  return { getState: () => state, getPosition: (now = Date.now()) => projectedPosition(state, now), send, requestSync: () => channel.postMessage({ kind: 'hello', clientId }), close: () => channel.close() };
}
