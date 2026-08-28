import assert from 'node:assert/strict';
import { createRoomAuthorityEndpoint } from '../music-room-authority-endpoint.js';
import { createRoomClient } from '../music-room-client.js';

const clients = [];
const endpoint = createRoomAuthorityEndpoint({
  roomId: 'shared-service-room',
  publish: message => clients.forEach(client => client.receive(structuredClone(message)))
});

function addClient(clientId) {
  const client = createRoomClient({
    roomId: 'shared-service-room',
    clientId,
    sendMessage: message => endpoint.handle(structuredClone(message))
  });
  clients.push(client);
  client.requestSync();
  return client;
}

const shenshu = addClient('shenshu');
const nuonuo = addClient('nuonuo');

nuonuo.send({
  type: 'song',
  song: { provider: 'mock', providerId: 'together', title: 'Together', artist: 'Detour', duration: 240 },
  position: 12,
  playing: true
});
assert.equal(shenshu.getState().song.key, 'mock:together');
assert.equal(nuonuo.getState().song.key, 'mock:together');
assert.equal(shenshu.getState().revision, 1);
assert.equal(nuonuo.getState().revision, 1);

shenshu.send({ type: 'seek', position: 55 });
assert.equal(shenshu.getState().position, 55);
assert.equal(nuonuo.getState().position, 55);
assert.equal(endpoint.getState().updatedBy, 'shenshu');

nuonuo.send({ type: 'pause' });
assert.equal(shenshu.getState().playing, false);
assert.equal(nuonuo.getState().playing, false);
assert.equal(endpoint.getState().updatedBy, 'nuonuo');

const reconnect = addClient('nuonuo-reconnect');
assert.equal(reconnect.getState().revision, endpoint.getState().revision);
assert.equal(reconnect.getState().song.key, 'mock:together');
assert.equal(reconnect.getState().position, endpoint.getState().position);
assert.equal(reconnect.getState().playing, false);

console.log('music room client/service tests passed');
