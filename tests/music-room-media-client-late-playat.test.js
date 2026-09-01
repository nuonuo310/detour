import assert from 'node:assert/strict';
import { createMediaRoomClient } from '../music-room-media-client.js';

class FakeSocket {
  constructor() { this.readyState = 0; this.listeners = new Map(); }
  addEventListener(type, fn) { const list = this.listeners.get(type) || []; list.push(fn); this.listeners.set(type, list); }
  emit(type, event = {}) { for (const fn of this.listeners.get(type) || []) fn(event); }
  open() { this.readyState = 1; this.emit('open'); }
  receive(message) { this.emit('message', { data: JSON.stringify(message) }); }
  send() {}
  close() { this.readyState = 3; this.emit('close', { code: 1000 }); }
}

let clock = 1000;
let finishLoad;
const loadGate = new Promise(resolve => { finishLoad = resolve; });
const media = {
  src: '', paused: true, ended: false, currentTime: 0, readyState: 0,
  load() {},
  play() { this.paused = false; return Promise.resolve(); },
  pause() { this.paused = true; },
  removeAttribute() {},
  addEventListener(type, fn) { if (type === 'loadedmetadata') loadGate.then(() => { this.readyState = 1; fn(); }); }
};

let socket;
const client = createMediaRoomClient({
  url: 'wss://example.test/music-room/ours', roomId: 'ours', clientId: 'nuonuo', media,
  resolveSource: () => '/song.mp3', now: () => clock,
  webSocketFactory: () => (socket = new FakeSocket())
});
socket.open();
const playAt = 1500;
socket.receive({ kind: 'snapshot', serverNow: clock, state: {
  roomId: 'ours', authorityId: 'room-service', revision: 1,
  song: { key: 'mock:a', provider: 'mock', providerId: 'a', title: 'A', artist: 'Detour', duration: 30, source: null },
  playing: true, position: 0, positionAt: playAt, playAt, updatedAt: new Date().toISOString(), updatedBy: 'shenshu'
} });
clock = 2200;
finishLoad();
await client.whenSynced();
assert.equal(media.paused, false, 'late load should start immediately instead of waiting stale delay');
assert.ok(media.currentTime >= 0.6, `late load should catch up to canonical position, got ${media.currentTime}`);
client.close();
console.log('late playAt catch-up tests passed');
