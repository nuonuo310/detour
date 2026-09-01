import assert from 'node:assert/strict';
import { createSpotifySongSearchProvider } from '../music-song-search-spotify.js';

const calls = [];
const fetchImpl = async (input, init = {}) => {
  const url = String(input);
  calls.push({ url, init });
  if (url.includes('/api/token')) return new Response(JSON.stringify({ access_token: 'token-1', expires_in: 3600 }), { status: 200 });
  return new Response(JSON.stringify({ tracks: { items: [{ id: 'track-1', name: '晴天', artists: [{ name: '周杰伦' }], duration_ms: 269000, external_urls: { spotify: 'https://open.spotify.com/track/track-1' } }] } }), { status: 200 });
};

const provider = createSpotifySongSearchProvider({ clientId: 'client', clientSecret: 'secret', fetchImpl });
const first = await provider.search('晴天 周杰伦', { limit: 3 });
const second = await provider.search('晴天', { limit: 2 });
assert.equal(first[0].id, 'track-1');
assert.equal(calls.filter(call => call.url.includes('/api/token')).length, 1, 'access token should be reused');
const searchCalls = calls.filter(call => call.url.includes('/v1/search'));
assert.equal(searchCalls.length, 2);
assert.match(searchCalls[0].url, /type=track/);
assert.match(searchCalls[0].url, /limit=3/);
assert.equal(searchCalls[0].init.headers.authorization, 'Bearer token-1');
assert.equal(second.length, 1);
console.log('spotify song search provider tests passed');
