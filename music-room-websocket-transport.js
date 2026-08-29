export function createWebSocketTransport({
  url,
  webSocketFactory,
  onMessage,
  onOpen,
  onClose,
  reconnect = true,
  reconnectDelay = 1000,
  maxReconnectDelay = 5000,
  heartbeatInterval = 15000,
  watchdogTimeout = 35000,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
  now = Date.now
} = {}) {
  if (!url) throw new Error('url is required');
  const makeSocket = webSocketFactory || (target => new WebSocket(target));
  let socket = null;
  let receiver = onMessage || null;
  let opened = false;
  let closedByClient = false;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let watchdogTimer = null;
  let lastActivity = 0;
  let reconnectCount = 0;
  let generation = 0;
  const queue = [];

  const stopLiveness = () => {
    if (heartbeatTimer) clearIntervalFn(heartbeatTimer);
    if (watchdogTimer) clearIntervalFn(watchdogTimer);
    heartbeatTimer = null;
    watchdogTimer = null;
  };

  const startLiveness = currentSocket => {
    stopLiveness();
    lastActivity = now();
    if (heartbeatInterval > 0) {
      heartbeatTimer = setIntervalFn(() => {
        if (opened && socket === currentSocket && currentSocket.readyState === 1) {
          currentSocket.send(JSON.stringify({ kind: 'ping' }));
        }
      }, heartbeatInterval);
    }
    if (watchdogTimeout > 0) {
      const checkEvery = Math.max(1000, Math.min(heartbeatInterval || watchdogTimeout, watchdogTimeout) / 2);
      watchdogTimer = setIntervalFn(() => {
        if (opened && socket === currentSocket && currentSocket.readyState === 1 && now() - lastActivity > watchdogTimeout) {
          currentSocket.close(4000, 'room transport heartbeat timeout');
        }
      }, checkEvery);
    }
  };

  const scheduleReconnect = currentGeneration => {
    if (!reconnect || closedByClient || reconnectTimer || currentGeneration !== generation) return;
    reconnectCount += 1;
    const delay = Math.min(maxReconnectDelay, reconnectDelay * Math.pow(1.6, reconnectCount - 1));
    reconnectTimer = setTimer(() => {
      reconnectTimer = null;
      if (!closedByClient && currentGeneration === generation) connect();
    }, delay);
  };

  const connect = () => {
    const currentGeneration = ++generation;
    const currentSocket = makeSocket(url);
    socket = currentSocket;
    currentSocket.addEventListener('open', () => {
      if (currentGeneration !== generation || currentSocket !== socket) return;
      opened = true;
      reconnectCount = 0;
      startLiveness(currentSocket);
      while (queue.length) currentSocket.send(queue.shift());
      onOpen?.();
    });
    currentSocket.addEventListener('message', event => {
      if (currentGeneration !== generation || currentSocket !== socket) return;
      lastActivity = now();
      try {
        receiver?.(JSON.parse(event.data));
      } catch {
        // Ignore malformed room messages.
      }
    });
    currentSocket.addEventListener('close', event => {
      if (currentGeneration !== generation || currentSocket !== socket) return;
      opened = false;
      stopLiveness();
      onClose?.(event);
      scheduleReconnect(currentGeneration);
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
      generation += 1;
      opened = false;
      receiver = null;
      queue.length = 0;
      stopLiveness();
      if (reconnectTimer) clearTimer(reconnectTimer);
      reconnectTimer = null;
      socket?.close(code, reason);
    }
  };
}
