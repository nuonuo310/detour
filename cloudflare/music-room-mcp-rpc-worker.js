import baseWorker, { MusicRoom as BaseMusicRoom } from './music-room-worker.js';
import { createSongSearch } from '../music-song-search.js';
import { createSpotifySongSearchProvider } from '../music-song-search-spotify.js';

export class MusicRoom extends BaseMusicRoom {
  async getMcpState() { await this.ready; return this.endpoint.getState(); }
}

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const SONG_SCHEMA = { type: ['object', 'null'], properties: { key: { type: ['string', 'null'] }, provider: { type: ['string', 'null'] }, providerId: { type: ['string', 'null'] }, title: { type: 'string' }, artist: { type: 'string' }, duration: { type: ['number', 'null'] }, source: { type: ['string', 'null'] } }, additionalProperties: true };
const ROOM_STATE_TOOL = {
  name: 'get_room_state', title: 'Get music room state', description: 'Read the current canonical Detour music-room state. Read-only.',
  inputSchema: { type: 'object', properties: { roomId: { type: 'string', minLength: 1 } }, required: ['roomId'], additionalProperties: false },
  outputSchema: { type: 'object', properties: { roomId: { type: 'string' }, revision: { type: 'number' }, playing: { type: 'boolean' }, position: { type: 'number' }, projectedPosition: { type: 'number' }, song: SONG_SCHEMA, updatedAt: { type: ['string', 'null'] }, updatedBy: { type: ['string', 'null'] } }, required: ['roomId', 'revision', 'playing', 'position', 'projectedPosition', 'song', 'updatedAt', 'updatedBy'], additionalProperties: false },
  annotations: READ_ONLY
};
const SEARCH_TRACKS_TOOL = {
  name: 'search_tracks', title: 'Search tracks', description: 'Search the configured music catalog and return provider-neutral Detour song identities. Read-only.',
  inputSchema: { type: 'object', properties: { query: { type: 'string', minLength: 1 }, limit: { type: 'integer', minimum: 1, maximum: 10, default: 5 } }, required: ['query'], additionalProperties: false },
  outputSchema: { type: 'object', properties: { provider: { type: 'string' }, query: { type: 'string' }, songs: { type: 'array', items: { ...SONG_SCHEMA, type: 'object' } } }, required: ['provider', 'query', 'songs'], additionalProperties: false },
  annotations: READ_ONLY
};
const TOOLS = [ROOM_STATE_TOOL, SEARCH_TRACKS_TOOL];

const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const result = (id, value) => response({ jsonrpc: '2.0', id, result: value });
const error = (id, code, message) => response({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
const toolResult = value => ({ structuredContent: value, content: [{ type: 'text', text: JSON.stringify(value) }] });

function authorized(request, env) {
  const expected = String(env.MCP_READ_TOKEN || ''); if (!expected) return false;
  const url = new URL(request.url); const query = url.searchParams.get('token') || ''; const auth = request.headers.get('authorization') || ''; const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return query === expected || bearer === expected;
}
function sanitize(state, now = Date.now()) {
  const position = Number(state?.position) || 0; const anchor = Number(state?.playAt ?? state?.positionAt ?? now); const duration = Number(state?.song?.duration); let projectedPosition = position;
  if (state?.playing) projectedPosition += Math.max(0, now - anchor) / 1000; if (Number.isFinite(duration)) projectedPosition = Math.min(projectedPosition, duration);
  return { roomId: String(state?.roomId || ''), revision: Number(state?.revision) || 0, playing: Boolean(state?.playing), position, projectedPosition, song: state?.song ?? null, updatedAt: state?.updatedAt ?? null, updatedBy: state?.updatedBy ?? null };
}
function spotifySearch(env) {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) throw new Error('Spotify search is not configured');
  return createSongSearch({ providers: { spotify: createSpotifySongSearchProvider({ clientId: env.SPOTIFY_CLIENT_ID, clientSecret: env.SPOTIFY_CLIENT_SECRET }) } });
}
async function callTool(env, params) {
  if (params?.name === ROOM_STATE_TOOL.name) { const roomId = String(params?.arguments?.roomId || '').trim(); if (!roomId) return { isError: true, content: [{ type: 'text', text: 'roomId is required' }] }; return toolResult(sanitize(await env.MUSIC_ROOM.getByName(roomId).getMcpState())); }
  if (params?.name === SEARCH_TRACKS_TOOL.name) { const query = String(params?.arguments?.query || '').trim(); if (!query) return { isError: true, content: [{ type: 'text', text: 'query is required' }] }; const songs = await spotifySearch(env).search(query, { provider: 'spotify', limit: params?.arguments?.limit }); return toolResult({ provider: 'spotify', query, songs }); }
  return { isError: true, content: [{ type: 'text', text: 'Unknown tool' }] };
}
export async function handleMcpRequest(request, env) {
  if (!env.MCP_READ_TOKEN) return response({ error: 'MCP_READ_TOKEN is not configured' }, 503); if (!authorized(request, env)) return response({ error: 'Unauthorized' }, 401); if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  let message; try { message = await request.json(); } catch { return error(null, -32700, 'Parse error'); }
  if (!message || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') return error(message?.id, -32600, 'Invalid Request');
  if (message.method === 'notifications/initialized') return new Response(null, { status: 202 });
  if (message.method === 'initialize') return result(message.id, { protocolVersion: String(message.params?.protocolVersion || '2025-11-25'), capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'detour-music-room', version: '0.2.0' }, instructions: 'Read-only access to Detour room state and music catalog search.' });
  if (message.method === 'server/discover') return result(message.id, { supportedVersions: ['2026-07-28', '2025-11-25'], capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'detour-music-room', version: '0.2.0' }, instructions: 'Read-only access to Detour room state and music catalog search.', ttlMs: 300000, cacheScope: 'private' });
  if (message.method === 'tools/list') return result(message.id, { tools: TOOLS });
  if (message.method === 'tools/call') { try { return result(message.id, await callTool(env, message.params)); } catch (cause) { return result(message.id, { isError: true, content: [{ type: 'text', text: `Tool failed: ${cause?.message || 'unknown error'}` }] }); } }
  if (message.method === 'ping') return result(message.id, {}); return error(message.id, -32601, 'Method not found');
}
export default { async fetch(request, env, ctx) { if (new URL(request.url).pathname === '/mcp') return handleMcpRequest(request, env); return baseWorker.fetch(request, env, ctx); } };
