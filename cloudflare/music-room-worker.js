import { DurableObject } from 'cloudflare:workers';
import { createRoomAuthorityEndpoint } from '../music-room-authority-endpoint.js';

const STATE_KEY = 'canonical-room-state';

const parseMessage = message => {
  if (typeof message !== 'string') return null;
  try {
    return JSON.parse(message);
  } catch {
    return null;
  }
};

export class MusicRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.roomId = null;
    this.endpoint = null;
    this.ready = this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get(STATE_KEY);
      if (stored?.roomId) this.roomId = stored.roomId;
      this.endpoint = this.createEndpoint(stored || undefined);
    });
  }

  createEndpoint(initialState) {
    return createRoomAuthorityEndpoint({
      roomId: initialState?.roomId || this.roomId || 'pending-room',
      authorityId: 'room-service',
      initialState,
      publish: message => this.broadcast(message)
    });
  }

  async fetch(request) {
    await this.ready;
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const url = new URL(request.url);
    const roomId = url.searchParams.get('roomId');
    if (!roomId) return new Response('roomId is required', { status: 400 });

    if (!this.roomId || this.roomId === 'pending-room') {
      this.roomId = roomId;
      this.endpoint = createRoomAuthorityEndpoint({
        roomId,
        authorityId: 'room-service',
        publish: message => this.broadcast(message)
      });
    } else if (roomId !== this.roomId) {
      return new Response('roomId mismatch', { status: 409 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, rawMessage) {
    await this.ready;
    const message = parseMessage(rawMessage);
    if (!message) return;

    const changed = this.endpoint.handle(message);
    if (changed && message.kind === 'intent') {
      await this.ctx.storage.put(STATE_KEY, this.endpoint.getState());
    }
  }

  webSocketClose(ws, code, reason) {
    ws.close(code, reason);
  }

  broadcast(message) {
    const payload = JSON.stringify(message);
    for (const socket of this.ctx.getWebSockets()) socket.send(payload);
  }
}

export default {
  fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/music-room\/([^/]+)$/);
    if (!match) return new Response('Not found', { status: 404 });
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const roomId = decodeURIComponent(match[1]);
    const stub = env.MUSIC_ROOM.getByName(roomId);
    const upstream = new URL(request.url);
    upstream.searchParams.set('roomId', roomId);
    return stub.fetch(new Request(upstream, request));
  }
};
