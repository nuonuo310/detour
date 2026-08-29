import assert from 'node:assert/strict';
import { createBrowserMusicRoomSession, musicRoomWebSocketUrl } from '../music-room-browser-session.js';

assert.equal(
  musicRoomWebSocketUrl({ protocol: 'https:', host: 'detour.example' }, 'ours'),
  'wss://detour.example/music-room/ours'
);

assert.equal(
  musicRoomWebSocketUrl({ protocol: 'http:', host: 'localhost:8787' }, '糯糯 & 沈述'),
  'ws://localhost:8787/music-room/%E7%B3%AF%E7%B3%AF%20%26%20%E6%B2%88%E8%BF%B0'
);

assert.throws(() => musicRoomWebSocketUrl({ protocol: 'https:', host: '' }, 'ours'), /location\.host is required/);
assert.throws(() => musicRoomWebSocketUrl({ protocol: 'https:', host: 'detour.example' }, ''), /roomId is required/);

class FakeSocket {
  constructor() {
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
  playCalls: 0,
  pauseCalls: 0,
  play() { this.playCalls += 1; this.paused = false; return Promise.resolve(); },
  pause() { this.pauseCalls += 1; this.paused = true; },
  removeAttribute(name) { if (name === 'src') this.src = ''; },
  addEventListener() {}
};

let socket;
const session = createBrowserMusicRoomSession({
  location: { protocol: 'https:', host: 'detour.example' },
  roomId: 'ours',
  clientId: 'nuonuo',
  media,
  resolveSource: song => `/audio/${song.providerId}.mp3`,
  webSocketFactory: () => (socket = new FakeSocket())
});

socket.open();
assert.equal(session.isPlaybackArmed(), false);

const now = Date.now();
socket.receive({
  kind: 'snapshot',
  serverNow: now,
  state: {
    roomId: 'ours', authorityId: 'room-service', revision: 1,
    song: { key: 'mock:song-a', provider: 'mock', providerId: 'song-a', title: 'Song A', artist: 'Detour', duration: 300, source: null },
    playing: true, position: 12, positionAt: now, playAt: null,
    updatedAt: new Date(now).toISOString(), updatedBy: 'shenshu'
  }
});

await session.whenSynced();
assert.equal(media.src, '/audio/song-a.mp3');
assert.equal(media.paused, true, 'canonical playing state must stay silent before local arm');
assert.equal(media.playCalls, 0);

await session.armPlayback();
assert.equal(session.isPlaybackArmed(), true);
assert.equal(media.paused, false, 'arming explicitly may join current canonical playback');
assert.equal(media.playCalls, 1);

session.disarmPlayback();
assert.equal(session.isPlaybackArmed(), false);
assert.equal(media.paused, true);

session.close();
console.log('music browser room session tests passed');
