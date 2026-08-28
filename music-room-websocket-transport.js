export function createWebSocketTransport({ url, webSocketFactory, onMessage, onOpen, onClose, reconnect = true, reconnectDelay = 1000, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  if (!url) throw new Error('url is required');
  const makeSocket = webSocketFactory || (target => new WebSocket(target));
  let socket = null;
  let receiver = onMessage || null;
  let opened = false;
  let closedByClient = false;
  let reconnectTimer = null;
  const queue = [];

  const scheduleReconnect = () => {
    if (!reconnect || closedByClient || reconnectTimer) return;
    reconnectTimer = setTimer(() => {
      reconnectTimer = null;
      connect();
    }, reconnectDelay);
  };

  const connect = () => {
    socket = makeSocket(url);
    socket.addEventListener('open', () => {
      opened = true;
      while (queue.length) socket.send(queue.shift());
      onOpen?.();
    });
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
      scheduleReconnect();
    });
  };

  connect();

  return {
    send(message) {
      const payload = JSON.stringify(message);
      if (opened && socket?.readyState === 1) socket.send(payload);
      else queue.push(payload);
    },
    subscribe(nextReceiver) {
      receiver = nextReceiver;
      return () => {
        if (receiver === nextReceiver) receiver = null;
      };
    },
    close(code = 1000, reason = 'room client closed') {
      closedByClient = true;
      receiver = null;
      queue.length = 0;
      if (reconnectTimer) clearTimer(reconnectTimer);
      reconnectTimer = null;
      socket?.close(code, reason);
    }
  };
}
