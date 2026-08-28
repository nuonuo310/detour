import assert from 'node:assert/strict';
import { createWebSocketTransport } from '../music-room-websocket-transport.js';

class FakeSocket {
  constructor() {
    this.readyState = 0;
    this.listeners = new Map();
    this.sent = [];
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
  close() { this.readyState = 3; }
}

const sockets = [];
const timers = [];
let opens = 0;
const transport = createWebSocketTransport({
  url: 'wss://example.test/music-room/ours',
  webSocketFactory: () => {
    const socket = new FakeSocket();
    sockets.push(socket);
    return socket;
  },
  onOpen: () => opens++,
  reconnectDelay: 10,
  setTimer: callback => { timers.push(callback); return timers.length; },
  clearTimer: () => {}
});

assert.equal(sockets.length, 1);
sockets[0].readyState = 1;
sockets[0].emit('open');
assert.equal(opens, 1);

sockets[0].readyState = 3;
sockets[0].emit('close');
assert.equal(timers.length, 1);
timers.shift()();
assert.equal(sockets.length, 2);

transport.send({ kind: 'hello', clientId: 'nuonuo' });
assert.equal(sockets[1].sent.length, 0, 'messages queue while reconnecting');
sockets[1].readyState = 1;
sockets[1].emit('open');
assert.deepEqual(sockets[1].sent[0], { kind: 'hello', clientId: 'nuonuo' });
assert.equal(opens, 2);

transport.close();
console.log('music websocket reconnect tests passed');
