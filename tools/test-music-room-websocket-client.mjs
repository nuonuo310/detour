import assert from 'node:assert/strict';
import { createWebSocketRoomClient } from '../music-room-websocket-client.js';
import { createRoomState } from '../music-room-sync.js';

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

const socket = new FakeSocket();
const states = [];
const client = createWebSocketRoomClient({
  url: 'wss://example.test/music-room/ours',
  roomId: 'ours',
  clientId: 'nuonuo',
  webSocketFactory: () => socket,
  onState: state => states.push(state)
});

assert.equal(socket.sent.length, 0, 'hello waits for websocket open');
socket.readyState = 1;
socket.emit('open');
assert.deepEqual(socket.sent[0], { kind: 'hello', clientId: 'nuonuo' });

client.send({ type: 'seek', position: 42 });
assert.equal(socket.sent[1].kind, 'intent');
assert.equal(socket.sent[1].intent.clientId, 'nuonuo');
assert.equal(socket.sent[1].intent.position, 42);

const canonical = { ...createRoomState({ roomId: 'ours', authorityId: 'room-service', now: 1000 }), revision: 1 };
socket.emit('message', { data: JSON.stringify({ kind: 'snapshot', state: canonical }) });
assert.equal(states.length, 1);
assert.equal(client.getState().revision, 1);

client.close();
console.log('music websocket room client tests passed');
