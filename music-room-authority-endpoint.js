import { createRoomAuthority } from './music-room-sync.js';

export function createRoomAuthorityEndpoint({ roomId, authorityId = 'room-service', initialState, publish, now }) {
  if (typeof publish !== 'function') throw new Error('publish is required');
  const authority = createRoomAuthority({ roomId, authorityId, initialState, now });

  const publishSnapshot = () => {
    const state = authority.getState();
    publish({ kind: 'snapshot', state });
    return state;
  };

  return {
    getState: authority.getState,
    getPosition: authority.getPosition,
    handle(message) {
      if (!message) return false;
      if (message.kind === 'hello') {
        publishSnapshot();
        return true;
      }
      if (message.kind === 'intent') {
        const result = authority.applyIntent(message.intent);
        if (result.changed) publishSnapshot();
        return result.changed;
      }
      return false;
    },
    publishSnapshot
  };
}
