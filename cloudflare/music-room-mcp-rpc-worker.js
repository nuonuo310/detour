import baseWorker, { MusicRoom as BaseMusicRoom } from './music-room-worker.js';

export class MusicRoom extends BaseMusicRoom {
  async getMcpState() {
    await this.ready;
    return this.endpoint.getState();
  }
}

const TOOL = {
  name: 'get_room_state',
  title: 'Get music room state',
  description: 'Read the current canonical Detour music-room state. Read-only.',
  inputSchema: {
    type: 'object',
    properties: { roomId: { type: 'string', minLength: 1 } },
    required: ['roomId'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
};

const response = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});
const result = (id, value) => response({ jsonrpc: '2.0', id, result: value });
const error = (id, code, message) => response({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

function authorized(request, env) {
  const expected = String(env.MCP_READ_TOKEN || '');
  if (!expected) return false;
  const url = new URL(request.url);
  const query = url.searchParams.get('token') || '';
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return query === expected || bearer === expected;
}

function sanitize(state, now = Date.now()) {
  const position = Number(state?.position) || 0;
  const anchor = Number(state?.playAt ?? state?.positionAt ?? now);
  const duration = Number(state?.song?.duration);
  let projectedPosition = position;
  if (state?.playing) projectedPosition += Math.max(0, now - anchor) / 1000;
  if (Number.isFinite(duration)) projectedPosition = Math.min(projectedPosition, duration);
  return {
    roomId: String(state?.roomId || ''),
    revision: Number(state?.revision) || 0,
    playing: Boolean(state?.playing),
    position,
    projectedPosition,
    song: state?.song ?? null,
    updatedAt: state?.updatedAt ?? null,
    updatedBy: state?.updatedBy ?? null
  };
}

async function callTool(env, params) {
  if (params?.name !== TOOL.name) return { isError: true, content: [{ type: 'text', text: 'Unknown tool' }] };
  const roomId = String(params?.arguments?.roomId || '').trim();
  if (!roomId) return { isError: true, content: [{ type: 'text', text: 'roomId is required' }] };
  const state = sanitize(await env.MUSIC_ROOM.getByName(roomId).getMcpState());
  return { structuredContent: state, content: [{ type: 'text', text: JSON.stringify(state) }] };
}

export async function handleMcpRequest(request, env) {
  if (!env.MCP_READ_TOKEN) return response({ error: 'MCP_READ_TOKEN is not configured' }, 503);
  if (!authorized(request, env)) return response({ error: 'Unauthorized' }, 401);
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });

  let message;
  try { message = await request.json(); } catch { return error(null, -32700, 'Parse error'); }
  if (!message || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') return error(message?.id, -32600, 'Invalid Request');

  if (message.method === 'notifications/initialized') return new Response(null, { status: 202 });
  if (message.method === 'initialize') return result(message.id, {
    protocolVersion: String(message.params?.protocolVersion || '2025-11-25'),
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: 'detour-music-room', version: '0.1.0' },
    instructions: 'Read-only access to the canonical Detour music room state.'
  });
  if (message.method === 'server/discover') return result(message.id, {
    supportedVersions: ['2026-07-28', '2025-11-25'],
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: 'detour-music-room', version: '0.1.0' },
    instructions: 'Read-only access to the canonical Detour music room state.',
    ttlMs: 300000,
    cacheScope: 'private'
  });
  if (message.method === 'tools/list') return result(message.id, { tools: [TOOL] });
  if (message.method === 'tools/call') {
    try { return result(message.id, await callTool(env, message.params)); }
    catch (cause) { return result(message.id, { isError: true, content: [{ type: 'text', text: `Could not read room state: ${cause?.message || 'unknown error'}` }] }); }
  }
  if (message.method === 'ping') return result(message.id, {});
  return error(message.id, -32601, 'Method not found');
}

export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname === '/mcp') return handleMcpRequest(request, env);
    return baseWorker.fetch(request, env, ctx);
  }
};
