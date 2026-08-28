export function createBroadcastTransport({ roomId, channelFactory, onMessage } = {}) {
  if (!roomId) throw new Error('roomId is required');
  const makeChannel = channelFactory || (name => new BroadcastChannel(name));
  const channel = makeChannel(`detour:music-room:${roomId}`);
  let receiver = onMessage || null;

  channel.onmessage = event => receiver?.(event.data);

  return {
    send(message) {
      channel.postMessage(message);
    },
    subscribe(nextReceiver) {
      receiver = nextReceiver;
      return () => {
        if (receiver === nextReceiver) receiver = null;
      };
    },
    close() {
      receiver = null;
      channel.close();
    }
  };
}
