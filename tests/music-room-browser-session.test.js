import assert from 'node:assert/strict';
import { musicRoomWebSocketUrl } from '../music-room-browser-session.js';

assert.equal(
  musicRoomWebSocketUrl({ protocol: 'https:', host: 'detour.example' }, 'ours'),
  'wss://detour.example/music-room/ours'
);

assert.equal(
  musicRoomWebSocketUrl({ protocol: 'http:', host: 'localhost:8787' }, '糯糯 & 沈述'),
  'ws://localhost:8787/music-room/%E7%B3%AF%E7%B3%AF%20%26%20%E6%B2%88%E8%BF%B0'
);

assert.throws(() => musicRoomWebSocketUrl({ protocol: 'https:', host: '' }, 'ours'), /location\.host is required/);
assert.throws(() => musicRoomWebSocketUrl({ protocol: 'https:', host: 'detour.example' }, ''), /roomId is required/);

console.log('music browser room session tests passed');
