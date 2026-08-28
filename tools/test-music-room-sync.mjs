import assert from 'node:assert/strict';
import {
  applyAuthorityIntent,
  createRoomState,
  normalizeSong,
  projectedPosition,
  shouldAcceptSnapshot
} from '../music-room-sync.js';

const authorityId = 'shenshu';
let state = createRoomState({ roomId: 'together', authorityId, now: 1_000 });
assert.equal(state.revision, 0);

state = applyAuthorityIntent(state, {
  type: 'song',
  clientId: 'nuonuo',
  song: { provider: 'mock', providerId: 'song-1', title: 'A', artist: 'B', duration: 240 },
  playing: true
}, { authorityId, now: 2_000 });
assert.equal(state.song.key, 'mock:song-1');
assert.equal(state.playing, true);
assert.equal(state.revision, 1);
assert.equal(state.updatedBy, 'nuonuo');
assert.equal(projectedPosition(state, 7_000), 5);

state = applyAuthorityIntent(state, { type: 'seek', clientId: 'shenshu', position: 42.5 }, { authorityId, now: 7_000 });
assert.equal(state.position, 42.5);
assert.equal(state.positionAt, 7_000);
assert.equal(state.revision, 2);

state = applyAuthorityIntent(state, { type: 'pause', clientId: 'nuonuo' }, { authorityId, now: 8_000 });
assert.equal(state.playing, false);
assert.equal(state.position, 43.5);
assert.equal(projectedPosition(state, 18_000), 43.5);

state = applyAuthorityIntent(state, { type: 'play', clientId: 'nuonuo' }, { authorityId, now: 18_000 });
assert.equal(state.playing, true);
assert.equal(state.revision, 4);

const newer = { ...state, revision: state.revision + 1 };
assert.equal(shouldAcceptSnapshot(state, newer), true);
assert.equal(shouldAcceptSnapshot(newer, state), false);
assert.equal(shouldAcceptSnapshot(state, { ...newer, authorityId: 'other' }), false);
assert.equal(shouldAcceptSnapshot(state, { ...newer, roomId: 'other-room' }), false);

assert.deepEqual(normalizeSong({ title: 'Same Song', artist: 'Same Artist' }).key, 'meta:same song::same artist');
assert.throws(
  () => applyAuthorityIntent(state, { type: 'pause' }, { authorityId: 'intruder', now: 20_000 }),
  /only the room authority/
);

console.log('music room sync tests passed');
