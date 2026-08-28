import assert from 'node:assert/strict';
import { createMediaRoomClient } from '../music-room-media-client.js';

class FakeSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.listeners = new Map();
    this.sent = [];
  }
  addEventListener(type, fn) {
    const bucket = this.listeners.get(type) || [];
    bucket.push(fn);
    this.listeners.set(type, bucket);
  }
  emit(type, event = {}) {
    for (const fn of this.listeners.get(type) || []) fn(event);
  }
  open() {
    this.readyState = 1;
    this.emit('open');
  }
  receive(message) {
    this.emit('message', { data: JSON.stringify(message) });
  }
  send(payload) {
    this.sent.push(JSON.parse(payload));
  }
  close() {
    this.readyState = 3;
    this.emit('close', { code: 1000 });
  }
}

const media = {
  src: '', paused: true, ended: false, currentTime: 0, readyState: 1,
  load() {},
  play() { this.paused = false; return Promise.resolve(); },
  pause() { this.paused = true; },
  removeAttribute(name) { if (name === 'src') this.src = ''; },
  addEventListener() {}
};

let socket;
const client = createMediaRoomClient({
  url: 'wss://example.test/music-room/ours',
  roomId: 'ours',
  clientId: 'nuonuo',
  media,
  resolveSource: song => '/audio/' + song.providerId + '.mp3',
  webSocketFactory: url => (socket = new FakeSocket(url))
});

socket.open();
assert.deepEqual(socket.sent[0], { kind: 'hello', clientId: 'nuonuo' });

socket.receive({
  kind: 'snapshot',
  serverNow: Date.now(),
  state: {
    roomId: 'ours', authorityId: 'room-service', revision: 1,
    song: { key: 'mock:song-a', provider: 'mock', providerId: 'song-a', title: 'Song A', artist: 'Detour', duration: 300, source: null },
    playing: true, position: 42.5, positionAt: Date.now(), updatedAt: new Date().toISOString(), updatedBy: 'shenshu'
  }
});

await client.whenSynced();
assert.equal(media.src, '/audio/song-a.mp3');
assert.equal(media.paused, false);
assert.ok(Math.abs(media.currentTime - 42.5) < 0.25);

socket.receive({
  kind: 'snapshot',
  serverNow: Date.now(),
  state: {
    ...client.getState(), revision: 2, playing: false, position: 88, positionAt: Date.now(), updatedAt: new Date().toISOString(), updatedBy: 'nuonuo'
  }
});

await client.whenSynced();
assert.equal(media.paused, true);
assert.ok(Math.abs(media.currentTime - 88) < 0.25);

console.log('media room client bridge tests passed');
client.close();
