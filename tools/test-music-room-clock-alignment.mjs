import assert from 'node:assert/strict';
import { createRoomClient } from '../music-room-client.js';
import { createRoomState } from '../music-room-sync.js';

let clientNow = 5000;
const sent = [];
const client = createRoomClient({
  roomId: 'ours',
  clientId: 'nuonuo',
  now: () => clientNow,
  sendMessage: message => sent.push(message)
});

const state = {
  ...createRoomState({ roomId: 'ours', authorityId: 'room-service', now: 1000 }),
  revision: 1,
  song: { key: 'mock:song-a', duration: 300 },
  playing: true,
  position: 10,
  positionAt: 1000
};

client.receive({ kind: 'snapshot', state, serverNow: 1000 });
assert.equal(client.getServiceClockOffset(), -4000);
assert.equal(client.getPosition(), 10);

clientNow = 7000;
assert.equal(client.getPosition(), 12, 'projected position advances on service clock, not device wall clock');

console.log('music room clock alignment tests passed');
