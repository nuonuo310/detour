import { createRoomClient } from './music-room-client.js';
import { createWebSocketTransport } from './music-room-websocket-transport.js';

export function createWebSocketRoomClient({
  url,
  roomId,
  clientId,
  authorityId = 'room-service',
  initialState,
  onState,
  onOpen,
  onClose,
  webSocketFactory
}) {
  let client;
  const transport = createWebSocketTransport({
    url,
    webSocketFactory,
    onOpen: () => {
      client.requestSync();
      onOpen?.();
    },
    onClose
  });

  client = createRoomClient({
    roomId,
    clientId,
    authorityId,
    initialState,
    onState,
    sendMessage: message => transport.send(message)
  });

  transport.subscribe(message => client.receive(message));

  return {
    ...client,
    close: (code, reason) => transport.close(code, reason)
  };
}
