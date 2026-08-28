import { createRoomClient } from './music-room-client.js';
import { createBroadcastTransport } from './music-room-broadcast-transport.js';

export function createBroadcastRoomClient({ roomId, clientId, authorityId = 'room-service', initialState, onState, channelFactory }) {
  const transport = createBroadcastTransport({ roomId, channelFactory });
  const client = createRoomClient({
    roomId,
    clientId,
    authorityId,
    initialState,
    onState,
    sendMessage: message => transport.send(message)
  });

  transport.subscribe(message => client.receive(message));
  client.requestSync();

  return {
    ...client,
    close: () => transport.close()
  };
}
