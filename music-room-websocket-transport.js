export function createWebSocketTransport({ url, webSocketFactory, onMessage, onOpen, onClose } = {}) {
  if (!url) throw new Error('url is required');
  const makeSocket = webSocketFactory || (target => new WebSocket(target));
  const socket = makeSocket(url);
  let receiver = onMessage || null;
  let opened = false;
  const queue = [];

  const flush = () => {
    opened = true;
    while (queue.length) socket.send(queue.shift());
    onOpen?.();
  };

  socket.addEventListener('open', flush);
  socket.addEventListener('message', event => {
    try {
      receiver?.(JSON.parse(event.data));
    } catch {
      // Ignore malformed room messages.
    }
  });
  socket.addEventListener('close', event => {
    opened = false;
    onClose?.(event);
  });

  return {
    send(message) {
      const payload = JSON.stringify(message);
      if (opened || socket.readyState === 1) socket.send(payload);
      else queue.push(payload);
    },
    subscribe(nextReceiver) {
      receiver = nextReceiver;
      return () => {
        if (receiver === nextReceiver) receiver = null;
      };
    },
    close(code = 1000, reason = 'room client closed') {
      receiver = null;
      queue.length = 0;
      socket.close(code, reason);
    }
  };
}
