import assert from 'node:assert/strict';
import { createMediaRoomClient } from '../music-room-media-client.js';

class FakeSocket {
  constructor() {
    this.readyState = 0;
    this.listeners = new Map();
    this.sent = [];
  }
  addEventListener(type, fn) {
    const list = this.listeners.get(type) || [];
    list.push(fn);
    this.listeners.set(type, list);
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
  }
}

const timers = new Map();
let nextTimerId = 1;
const setTimer = (fn, delay) => {
  const id = nextTimerId++;
  timers.set(id, { fn, delay });
  return id;
};
const clearTimer = id => timers.delete(id);
const onlyTimer = () => {
  assert.equal(timers.size, 1, 'exactly one scheduled player start exists');
  return [...timers.entries()][0];
};

const media = {
  src: '',
  paused: true,
  ended: false,
  currentTime: 0,
  readyState: 1,
  playCalls: 0,
  load() {},
  play() {
    this.playCalls++;
    this.paused = false;
    return Promise.resolve();
  },
  pause() { this.paused = true; },
  removeAttribute(name) { if (name === 'src') this.src = ''; },
  addEventListener() {}
};

let socket;
let now = 1000;
const client = createMediaRoomClient({
  url: 'wss://example.test/music-room/ours',
  roomId: 'ours',
  clientId: 'nuonuo',
  media,
  resolveSource: song => '/audio/' + song.providerId + '.mp3',
  webSocketFactory: () => (socket = new FakeSocket()),
  setTimer,
  clearTimer,
  now: () => now
});

socket.open();
const songA = { key: 'mock:a', provider: 'mock', providerId: 'a', title: 'A', artist: 'Detour', duration: 30 };
const songB = { key: 'mock:b', provider: 'mock', providerId: 'b', title: 'B', artist: 'Detour', duration: 30 };
const snapshot = (revision, patch = {}) => ({
  kind: 'snapshot',
  serverNow: now,
  state: {
    roomId: 'ours',
    authorityId: 'room-service',
    revision,
    song: songA,
    playing: true,
    position: 0,
    positionAt: 1500,
    playAt: 1500,
    updatedAt: new Date(now).toISOString(),
    updatedBy: 'shenshu',
    ...patch
  }
});

socket.receive(snapshot(1));
await client.whenSynced();
assert.equal(media.src, '/audio/a.mp3');
assert.equal(media.playCalls, 0, 'future playAt must not start immediately');
const [firstTimerId, firstTimer] = onlyTimer();
assert.equal(firstTimer.delay, 500);

socket.receive(snapshot(2));
await client.whenSynced();
assert.equal(timers.size, 1, 'same playAt snapshot must not duplicate the timer');
assert.ok(timers.has(firstTimerId), 'same scheduled start is preserved');

socket.receive(snapshot(3, { playing: false, playAt: null, positionAt: now }));
await client.whenSynced();
assert.equal(timers.size, 0, 'pause cancels a pending scheduled start');
await firstTimer.fn();
assert.equal(media.playCalls, 0, 'a stale cancelled timer cannot start playback');

socket.receive(snapshot(4, { song: songA, playAt: 2000, positionAt: 2000 }));
await client.whenSynced();
const [, songATimer] = onlyTimer();

socket.receive(snapshot(5, { song: songB, playAt: 2500, positionAt: 2500 }));
await client.whenSynced();
assert.equal(media.src, '/audio/b.mp3');
const [, songBTimer] = onlyTimer();
await songATimer.fn();
assert.equal(media.playCalls, 0, 'song change invalidates the previous song timer');

await songBTimer.fn();
assert.equal(media.playCalls, 1, 'current canonical playAt starts exactly once');
assert.equal(media.paused, false);

socket.receive(snapshot(6, { song: songB, playAt: 2500, positionAt: 2500 }));
await client.whenSynced();
assert.equal(media.playCalls, 1, 'repeated canonical snapshot cannot replay the same start');

client.close();
console.log('media room scheduled playback tests passed');
