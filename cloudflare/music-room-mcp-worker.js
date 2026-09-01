import baseWorker, { MusicRoom } from './music-room-worker.js';

export { MusicRoom };

const MCP_PROTOCOL = '2026-07-28';
const TOOL = {
  name: 'get_room_state',
  title: 'Get music room state',
  description: 'Read the current canonical Detour music-room state. This tool is read-only.',
  inputSchema: {
    type: 'object',
    properties: {
      roomId: {
        type: 'string',
        minLength: 1,
        description: 'Detour music room id, for example ours.'
      }
    },
    required: ['roomId'],
    additionalProperties: false
  },
  outputSchema: {
    type: 'object',
    properties: {
      roomId: { type: 'string' },
      revision: { type: 'number' },
      playing: { type: 'boolean' },
      position: { type: 'number' },
      projectedPosition: { type: 'number' },
      song: { type: ['object', 'null'] },
      updatedAt: { type: ['string', 'null'] },
      updatedBy: { type: ['string', 'null'] }
    },
    required: ['roomId', 'revision', 'playing', 'position', 'projectedPosition', 'song', 'updatedAt', 'updatedBy'],
    additionalProperties: true
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  }
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  }
});

const rpcResult = (id, result) => json({ jsonrpc: '2.0', id, result });
const rpcError = (id, code, message, data) => json({
  jsonrpc: '2.0',
  id: id ?? null,
  error: { code, message, ...(data === undefined ? {} : { data }) }
});

function tokenAllowed(request, env) {
  const configured = String(env.MCP_READ_TOKEN || '');
  if (!configured) return false;
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token') || '';
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return queryToken === configured || bearer === configured;
}

function projectedPosition(state, now = Date.now()) {
  const position = Number(state?.position) || 0;
  if (!state?.playing) return position;
  const anchor = Number(state.playAt ?? state.positionAt ?? now);
  const duration = Number(state?.song?.duration);
  const projected = position + Math.max(0, now - anchor) / 1000;
  return Number.isFinite(duration) ? Math.min(projected, duration) : projected;
}

function publicRoomState(state, serverNow = Date.now()) {
  return {
    roomId: String(state?.roomId || ''),
    revision: Number(state?.revision) || 0,
    playing: Boolean(state?.playing),
    position: Number(state?.position) || 0,
    projectedPosition: projectedPosition(state, serverNow),
    song: state?.song ?? null,
    updatedAt: state?.updatedAt ?? null,
    updatedBy: state?.updatedBy ?? null
  };
}

async function readRoomSnapshot(env, roomId, timeoutMs = 1800) {
  const stub = env.MUSIC_ROOM.getByName(roomId);
  const url = new URL('https://music-room.internal/');
  url.searchParams.set('roomId', roomId);
  const response = await stub.fetch(new Request(url, { headers: { Upgrade: 'websocket' } }));
  const socket = response.webSocket;
  if (response.status !== 101 || !socket) throw new Error(`room websocket unavailable (${response.status})`);

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.close(1000, 'mcp snapshot read complete'); } catch {}
      fn(value);
    };
    const timer = setTimeout(() => finish(reject, new Error('room snapshot timeout')), timeoutMs);

    socket.addEventListener('message', event => {
      try {
        const message = JSON.parse(event.data);
        if (message?.kind !== 'snapshot') return;
        finish(resolve, { state: message.state, serverNow: Number(message.serverNow) || Date.now() });
      } catch {}
    });
    socket.addEventListener('close', () => finish(reject, new Error('room websocket closed before snapshot')));
    socket.addEventListener('error', () => finish(reject, new Error('room websocket failed')));

    socket.accept();
    socket.send(JSON.stringify({ kind: 'hello', clientId: 'detour-mcp-read' }));
  });
}

async function callTool(env, params) {
  if (params?.name !== TOOL.name) {
    return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${params?.name || ''}` }] };
  }
  const roomId = String(params?.arguments?.roomId || '').trim();
  if (!roomId) {
    return { isError: true, content: [{ type: 'text', text: 'roomId is required' }] };
  }

  const snapshot = await readRoomSnapshot(env, roomId);
  const state = publicRoomState(snapshot.state, snapshot.serverNow);
  return {
    structuredContent: state,
    content: [{ type: 'text', text: JSON.stringify(state) }]
  };
}

export async function handleMcpRequest(request, env) {
  if (!env.MCP_READ_TOKEN) {
    return json({ error: 'MCP_READ_TOKEN is not configured' }, 503);
  }
  if (!tokenAllowed(request, env)) return json({ error: 'Unauthorized' }, 401);
  if (request.method === 'GET') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });

  let message;
  try {
    message = await request.json();
  } catch {
    return rpcError(null, -32700, 'Parse error');
  }
  if (!message || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return rpcError(message?.id, -32600, 'Invalid Request');
  }

  if (message.method === 'notifications/initialized') return new Response(null, { status: 202 });
  if (message.method === 'initialize') {
    const requested = String(message.params?.protocolVersion || '2025-11-25');
    return rpcResult(message.id, {
      protocolVersion: requested,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'detour-music-room', version: '0.1.0' },
      instructions: 'Read-only access to the canonical Detour music room state.'
    });
  }
  if (message.method === 'server/discover') {
    return rpcResult(message.id, {
      supportedVersions: [MCP_PROTOCOL, '2025-11-25'],
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'detour-music-room', version: '0.1.0' },
      instructions: 'Read-only access to the canonical Detour music room state.',
      ttlMs: 300000,
      cacheScope: 'private'
    });
  }
  if (message.method === 'tools/list') {
    return rpcResult(message.id, { tools: [TOOL], ttlMs: 300000, cacheScope: 'private' });
  }
  if (message.method === 'tools/call') {
    try {
      return rpcResult(message.id, await callTool(env, message.params));
    } catch (error) {
      return rpcResult(message.id, {
        isError: true,
        content: [{ type: 'text', text: `Could not read room state: ${error?.message || 'unknown error'}` }]
      });
    }
  }
  if (message.method === 'ping') return rpcResult(message.id, {});
  return rpcError(message.id, -32601, 'Method not found');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/mcp') return handleMcpRequest(request, env);
    return baseWorker.fetch(request, env, ctx);
  }
};
