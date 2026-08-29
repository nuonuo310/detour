import assert from 'node:assert/strict';
import { createWebSocketTransport } from '../music-room-websocket-transport.js';

class FakeSocket {
  constructor() {
    this.readyState = 0;
    this.listeners = new Map();
    this.sent = [];
    this.closed = null;
  }
  addEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    list.push(listener);
    this.listeners.set(type, list);
  }
  emit(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) listener(event);
  }
  send(payload) { this.sent.push(JSON.parse(payload)); }
  close(code, reason) {
    this.closed = { code, reason };
    this.readyState = 3;
  }
}

const sockets = [];
const intervals = [];
const reconnects = [];
let clock = 1000;
const transport = createWebSocketTransport({
  url: 'wss://example.test/music-room/ours',
  webSocketFactory: () => {
    const socket = new FakeSocket();
    sockets.push(socket);
    return socket;
  },
  heartbeatInterval: 100,
  watchdogTimeout: 250,
  now: () => clock,
  setIntervalFn: fn => {
    const handle = { fn, active: true };
    intervals.push(handle);
    return handle;
  },
  clearIntervalFn: handle => { handle.active = false; },
  setTimer: (fn, delay) => {
    const handle = { fn, delay, active: true };
    reconnects.push(handle);
    return handle;
  },
  clearTimer: handle => { handle.active = false; }
});

const first = sockets[0];
first.readyState = 1;
first.emit('open');
assert.equal(intervals.filter(x => x.active).length, 2, 'heartbeat and watchdog start on open');

const heartbeat = intervals.find(x => x.active);
heartbeat.fn();
assert.deepEqual(first.sent[0], { kind: 'ping' }, 'heartbeat sends ping on open socket');

clock = 1100;
first.emit('message', { data: JSON.stringify({ kind: 'pong', serverNow: 1100 }) });
clock = 1400;
for (const handle of intervals.filter(x => x.active)) handle.fn();
assert.deepEqual(first.closed, { code: 4000, reason: 'room transport heartbeat timeout' }, 'watchdog closes a stale socket');

first.emit('close', { code: 4000 });
assert.equal(reconnects.length, 1, 'unexpected close schedules reconnect');
assert.equal(reconnects[0].delay, 1000, 'first reconnect uses base delay');
reconnects[0].fn();
assert.equal(sockets.length, 2, 'reconnect creates a new socket');

transport.close();
console.log('music websocket transport tests passed');
