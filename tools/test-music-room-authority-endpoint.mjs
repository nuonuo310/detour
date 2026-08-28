import assert from 'node:assert/strict';
import { createRoomAuthorityEndpoint } from '../music-room-authority-endpoint.js';

let clock = 1_000;
const published = [];
const endpoint = createRoomAuthorityEndpoint({
  roomId: 'service-room',
  authorityId: 'room-service',
  now: () => clock,
  publish: message => published.push(structuredClone(message))
});

assert.equal(endpoint.handle({ kind: 'hello', clientId: 'nuonuo' }), true);
assert.equal(published.length, 1);
assert.equal(published[0].kind, 'snapshot');
assert.equal(published[0].state.revision, 0);
assert.equal(published[0].state.authorityId, 'room-service');

assert.equal(endpoint.handle({
  kind: 'intent',
  intent: {
    type: 'song',
    clientId: 'nuonuo',
    song: { provider: 'mock', providerId: 'a', title: 'A', artist: 'Detour', duration: 60 },
    position: 4,
    playing: true
  }
}), true);
assert.equal(published.length, 2);
assert.equal(published[1].state.song.key, 'mock:a');
assert.equal(published[1].state.updatedBy, 'nuonuo');
assert.equal(published[1].state.revision, 1);

clock += 3_000;
assert.equal(endpoint.getPosition(), 7);
assert.equal(endpoint.handle({ kind: 'intent', intent: { type: 'unknown', clientId: 'shenshu' } }), false);
assert.equal(published.length, 2);

assert.equal(endpoint.handle({ kind: 'intent', intent: { type: 'pause', clientId: 'shenshu' } }), true);
assert.equal(published.length, 3);
assert.equal(published[2].state.playing, false);
assert.equal(published[2].state.updatedBy, 'shenshu');

console.log('music room authority endpoint tests passed');
