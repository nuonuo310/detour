import assert from 'node:assert/strict';
import { createMediaElementPlayer } from '../music-room-media-element-player.js';

const listeners = new Map();
const media = {
  src: '', paused: true, ended: false, currentTime: 0, readyState: 1,
  loadCalls: 0, playCalls: 0, pauseCalls: 0,
  load() { this.loadCalls += 1; },
  play() { this.paused = false; this.playCalls += 1; return Promise.resolve(); },
  pause() { this.paused = true; this.pauseCalls += 1; },
  removeAttribute(name) { if (name === 'src') this.src = ''; },
  addEventListener(type, fn) { listeners.set(type, fn); }
};

const song = { key: 'mock:a', title: 'A', duration: 300 };
const player = createMediaElementPlayer({
  media,
  resolveSource: async value => ({ src: '/audio/' + value.key + '.mp3' })
});

await player.load(song, { currentTime: 42.5, playing: true });
assert.equal(media.src, '/audio/mock:a.mp3');
assert.equal(media.currentTime, 42.5);
assert.equal(media.playCalls, 1);
assert.deepEqual(player.getState(), { song, playing: true, currentTime: 42.5 });

player.seek(88);
assert.equal(media.currentTime, 88);
player.pause();
assert.equal(player.getState().playing, false);
player.play();
assert.equal(player.getState().playing, true);

await player.load(null);
assert.equal(player.getState().song, null);
assert.equal(media.src, '');

console.log('media element room player tests passed');
