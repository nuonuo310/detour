import assert from 'node:assert/strict';
import { createBroadcastRoom } from '../music-room-sync.js';
import { createMockPlayer } from '../music-room-mock-player.js';

function createMemoryBus() {
  const channels = new Map();
  return {
    channelFactory(name) {
      const peers = channels.get(name) || new Set();
      const channel = {
        onmessage: null,
        postMessage(data) {
          for (const peer of [...peers]) {
            if (peer !== channel && !peer.closed) peer.onmessage?.({ data: structuredClone(data) });
          }
        },
        close() {
          channel.closed = true;
          peers.delete(channel);
        },
        closed: false
      };
      peers.add(channel);
      channels.set(name, peers);
      return channel;
    }
  };
}

const bus = createMemoryBus();
const roomId = 'together-live';
const authorityId = 'shenshu';
const shenshuPlayer = createMockPlayer({ id: 'shenshu-player' });
const nuonuoPlayer = createMockPlayer({ id: 'nuonuo-player' });

let shenshuRoom;
let nuonuoRoom;

shenshuRoom = createBroadcastRoom({
  roomId,
  clientId: authorityId,
  authorityId,
  channelFactory: bus.channelFactory,
  onState: state => shenshuPlayer.applyRoomState(state, () => shenshuRoom.getPosition())
});
shenshuPlayer.applyRoomState(shenshuRoom.getState(), () => shenshuRoom.getPosition());

nuonuoRoom = createBroadcastRoom({
  roomId,
  clientId: 'nuonuo',
  authorityId,
  channelFactory: bus.channelFactory,
  onState: state => nuonuoPlayer.applyRoomState(state, () => nuonuoRoom.getPosition())
});
nuonuoPlayer.applyRoomState(nuonuoRoom.getState(), () => nuonuoRoom.getPosition());

const songA = { provider: 'mock', providerId: 'song-a', title: 'Song A', artist: 'Detour', duration: 300 };
const songB = { provider: 'mock', providerId: 'song-b', title: 'Song B', artist: 'Detour', duration: 180 };

nuonuoRoom.send({ type: 'song', song: songA, position: 12, playing: true });
assert.equal(shenshuRoom.getState().song.key, 'mock:song-a');
assert.equal(nuonuoRoom.getState().song.key, 'mock:song-a');
assert.equal(shenshuPlayer.getState().song.key, 'mock:song-a');
assert.equal(nuonuoPlayer.getState().song.key, 'mock:song-a');
assert.equal(shenshuPlayer.getState().playing, true);
assert.equal(nuonuoPlayer.getState().playing, true);

shenshuRoom.send({ type: 'pause' });
assert.equal(shenshuPlayer.getState().playing, false);
assert.equal(nuonuoPlayer.getState().playing, false);

nuonuoRoom.send({ type: 'seek', position: 88.5 });
assert.equal(shenshuRoom.getState().position, 88.5);
assert.equal(nuonuoRoom.getState().position, 88.5);
assert.ok(Math.abs(shenshuPlayer.getState().currentTime - nuonuoPlayer.getState().currentTime) < 0.05);

nuonuoRoom.send({ type: 'play' });
assert.equal(shenshuPlayer.getState().playing, true);
assert.equal(nuonuoPlayer.getState().playing, true);

shenshuRoom.send({ type: 'song', song: songB, position: 3, playing: false });
assert.equal(shenshuPlayer.getState().song.key, 'mock:song-b');
assert.equal(nuonuoPlayer.getState().song.key, 'mock:song-b');
assert.equal(shenshuPlayer.getState().currentTime, 3);
assert.equal(nuonuoPlayer.getState().currentTime, 3);
assert.equal(shenshuPlayer.getState().playing, false);
assert.equal(nuonuoPlayer.getState().playing, false);

nuonuoRoom.close();
const reconnectedPlayer = createMockPlayer({ id: 'nuonuo-reconnected' });
let reconnectedRoom;
reconnectedRoom = createBroadcastRoom({
  roomId,
  clientId: 'nuonuo',
  authorityId,
  channelFactory: bus.channelFactory,
  onState: state => reconnectedPlayer.applyRoomState(state, () => reconnectedRoom.getPosition())
});
reconnectedPlayer.applyRoomState(reconnectedRoom.getState(), () => reconnectedRoom.getPosition());

assert.equal(reconnectedRoom.getState().revision, shenshuRoom.getState().revision);
assert.equal(reconnectedPlayer.getState().song.key, 'mock:song-b');
assert.equal(reconnectedPlayer.getState().currentTime, 3);
assert.equal(reconnectedPlayer.getState().playing, false);

reconnectedRoom.send({ type: 'seek', position: 27 });
assert.equal(shenshuRoom.getState().position, 27);
assert.equal(reconnectedRoom.getState().position, 27);
assert.ok(Math.abs(shenshuPlayer.getState().currentTime - reconnectedPlayer.getState().currentTime) < 0.05);

shenshuRoom.close();
reconnectedRoom.close();

console.log('two-client music room sync passed');
