import baseWorker, { MusicRoom as BaseMusicRoom } from './music-room-worker.js';
import { handleMcpRequest } from './music-room-mcp-protocol.js';

export class MusicRoom extends BaseMusicRoom {
  async getMcpState() {
    await this.ready;
    return this.endpoint.getState();
  }
}

export { handleMcpRequest };

export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname === '/mcp') return handleMcpRequest(request, env);
    return baseWorker.fetch(request, env, ctx);
  }
};
