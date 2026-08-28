import assert from 'node:assert/strict';
import { createRoomState } from '../music-room-sync.js';
import { createMockPlayer } from '../music-room-mock-player.js';
import { bindRoomClientToPlayer } from '../music-room-player-client.js';

let state = createRoomState({ roomId: 'ours', authorityId: 'room-service', now: 1000 });
let now = 1000;
const room = {
  getState: () => state,
  getPosition: () => state.playing ? state.position + (now - state.positionAt) / 1000 : state.position
};
const player = createMockPlayer();
const syncs = [];
const binding = bindRoomClientToPlayer({ room, player, onSync: actions => syncs.push(actions) });
assert.equal(binding.getPlayerState().song, null);

state = {
  ...state,
  revision: 1,
  song: { key:'mock:song-a', provider:'mock', providerId:'song-a', title:'Song A', artist:'Detour', duration:300 },
  playing: true,
  position: 12,
  positionAt: 1000,
  updatedAt: 1000,
  updatedBy: 'nuonuo'
};
binding.sync(state);
assert.equal(player.getState().song.key, 'mock:song-a');
assert.equal(player.getState().playing, true);
assert.equal(player.getState().currentTime, 12);

now = 4000;
player.seek(0);
binding.sync(state);
assert.equal(player.getState().currentTime, 15, 'player follows projected room position');

state = { ...state, revision: 2, playing: false, position: 15, positionAt: 4000, updatedAt: 4000, updatedBy: 'shenshu' };
binding.sync(state);
assert.equal(player.getState().playing, false);
assert.ok(syncs.length >= 4);

console.log('music room player client tests passed');
