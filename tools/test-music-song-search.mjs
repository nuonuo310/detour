import assert from 'node:assert/strict';
import { createSongSearch } from '../music-song-search.js';

const calls = [];
const search = createSongSearch({
  providers: {
    spotify: {
      async search(query, options) {
        calls.push({ query, options });
        return [{
          id: 'track-1',
          name: 'Song A',
          artists: [{ name: 'Detour' }],
          duration_ms: 123000,
          external_urls: { spotify: 'https://open.spotify.com/track/track-1' }
        }];
      }
    }
  }
});

const [song] = await search.search(' Song A ', { provider: 'spotify', limit: 99 });
assert.deepEqual(calls, [{ query: 'Song A', options: { limit: 10 } }]);
assert.equal(song.provider, 'spotify');
assert.equal(song.providerId, 'track-1');
assert.equal(song.key, 'spotify:track-1');
assert.equal(song.title, 'Song A');
assert.equal(song.artist, 'Detour');
assert.equal(song.duration, 123);
assert.equal(song.source, 'https://open.spotify.com/track/track-1');

await assert.rejects(() => search.search('   '), /query is required/);
await assert.rejects(() => search.search('Song A', { provider: 'unknown' }), /unsupported song search provider/);

console.log('music song search tests passed');
