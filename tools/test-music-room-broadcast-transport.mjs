import assert from 'node:assert/strict';
import { createBroadcastTransport } from '../music-room-broadcast-transport.js';

function createMemoryBus() {
  const channels = new Map();
  return name => {
    const peers = channels.get(name) || new Set();
    const channel = {
      onmessage: null,
      closed: false,
      postMessage(data) {
        for (const peer of [...peers]) {
          if (peer !== channel && !peer.closed) peer.onmessage?.({ data: structuredClone(data) });
        }
      },
      close() {
        channel.closed = true;
        peers.delete(channel);
      }
    };
    peers.add(channel);
    channels.set(name, peers);
    return channel;
  };
}

const channelFactory = createMemoryBus();
const a = createBroadcastTransport({ roomId: 'transport-room', channelFactory });
const b = createBroadcastTransport({ roomId: 'transport-room', channelFactory });
const received = [];
const unsubscribe = b.subscribe(message => received.push(message));

a.send({ kind: 'hello', clientId: 'shenshu' });
assert.deepEqual(received, [{ kind: 'hello', clientId: 'shenshu' }]);

unsubscribe();
a.send({ kind: 'intent', intent: { type: 'play' } });
assert.equal(received.length, 1);

b.subscribe(message => received.push(message));
a.send({ kind: 'snapshot', state: { revision: 1 } });
assert.equal(received.length, 2);
assert.equal(received[1].kind, 'snapshot');

b.close();
a.send({ kind: 'snapshot', state: { revision: 2 } });
assert.equal(received.length, 2);
a.close();

console.log('music room broadcast transport tests passed');
