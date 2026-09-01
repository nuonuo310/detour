import assert from 'node:assert/strict';
import { handleMcpRequest } from '../cloudflare/music-room-mcp-protocol.js';

const token = 'test-read-token';
const roomState = {
  roomId: 'ours', revision: 7, playing: false, position: 42,
  song: { key: 'spotify:track:1', provider: 'spotify', providerId: '1', title: 'Song A', artist: 'Detour', duration: 180, source: 'spotify:track:1' },
  updatedAt: '2026-09-01T00:00:00.000Z', updatedBy: 'user'
};
const env = {
  MCP_READ_TOKEN: token,
  MUSIC_ROOM: { getByName(roomId) { assert.equal(roomId, 'ours'); return { async getMcpState() { return roomState; } }; } }
};

async function rpc(method, params, testEnv = env) {
  const response = await handleMcpRequest(new Request(`https://example.test/mcp?token=${token}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  }), testEnv);
  assert.equal(response.status, 200);
  return response.json();
}

const listed = await rpc('tools/list');
assert.deepEqual(listed.result.tools.map(tool => tool.name), ['get_room_state']);
const roomTool = listed.result.tools[0];
assert.equal(roomTool.annotations.readOnlyHint, true);
assert.equal(roomTool.outputSchema.type, 'object');
assert.equal(roomTool.outputSchema.properties.song.type[0], 'object');
assert.equal(roomTool.outputSchema.properties.song.type[1], 'null');

const called = await rpc('tools/call', { name: 'get_room_state', arguments: { roomId: 'ours' } });
assert.equal(called.result.isError, undefined);
assert.equal(called.result.structuredContent.roomId, 'ours');
assert.equal(called.result.structuredContent.revision, 7);
assert.equal(called.result.structuredContent.song.providerId, '1');
assert.deepEqual(JSON.parse(called.result.content[0].text), called.result.structuredContent);

const hiddenSearch = await rpc('tools/call', { name: 'search_tracks', arguments: { query: '晴天' } });
assert.equal(hiddenSearch.result.isError, true);
assert.equal(hiddenSearch.result.content[0].text, 'Unknown tool');

const configured = await rpc('tools/list', undefined, { ...env, SPOTIFY_CLIENT_ID: 'client', SPOTIFY_CLIENT_SECRET: 'secret' });
assert.deepEqual(configured.result.tools.map(tool => tool.name), ['get_room_state', 'search_tracks']);
const searchTool = configured.result.tools[1];
assert.equal(searchTool.outputSchema.properties.songs.items.type, 'object');
assert.equal(searchTool.outputSchema.properties.songs.items.properties.providerId.type[0], 'string');

console.log('music room MCP contract tests passed');
