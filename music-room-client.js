import { createRoomState, projectedPosition, shouldAcceptSnapshot } from './music-room-sync.js';

const matchesRoomAuthority = (local, incoming) => Boolean(
  local && incoming &&
  incoming.roomId === local.roomId &&
  incoming.authorityId === local.authorityId
);

export function createRoomClient({ roomId, clientId, authorityId = 'room-service', initialState, sendMessage, onState, now = () => Date.now() }) {
  if (!roomId) throw new Error('roomId is required');
  if (!clientId) throw new Error('clientId is required');
  if (typeof sendMessage !== 'function') throw new Error('sendMessage is required');

  let state = initialState || createRoomState({ roomId, authorityId });
  let hasCanonicalSnapshot = false;
  let serviceClockOffset = 0;

  const adopt = (incoming, serverNow) => {
    const firstCanonicalSnapshot = !hasCanonicalSnapshot &&
      matchesRoomAuthority(state, incoming) &&
      Number(incoming.revision) >= Number(state.revision);

    if (!firstCanonicalSnapshot && !shouldAcceptSnapshot(state, incoming)) return false;
    if (Number.isFinite(Number(serverNow))) serviceClockOffset = Number(serverNow) - Number(now());
    state = incoming;
    hasCanonicalSnapshot = true;
    onState?.(state, 'remote');
    return true;
  };

  return {
    getState: () => state,
    getPosition: (clientNow = now()) => projectedPosition(state, Number(clientNow) + serviceClockOffset),
    getServiceClockOffset: () => serviceClockOffset,
    send(intent) {
      sendMessage({ kind: 'intent', intent: { ...intent, clientId } });
    },
    requestSync() {
      sendMessage({ kind: 'hello', clientId });
    },
    receive(message) {
      if (message?.kind !== 'snapshot') return false;
      return adopt(message.state, message.serverNow);
    }
  };
}
