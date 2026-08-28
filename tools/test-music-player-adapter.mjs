import assert from 'node:assert/strict';
import { createMockPlayer } from '../music-room-mock-player.js';
import { applyPlayerSync, planPlayerSync } from '../music-room-player-adapter.js';

const song = { key:'mock:song-a', provider:'mock', providerId:'song-a', title:'Song A', artist:'Detour', duration:300 };

assert.deepEqual(
  planPlayerSync({ song:null, playing:false, currentTime:0 }, { song, playing:true, position:12 }, 12),
  [{ type:'load', song, currentTime:12, playing:true }]
);

assert.deepEqual(
  planPlayerSync({ song, playing:true, currentTime:12.2 }, { song, playing:true, position:12.5 }, 12.5),
  []
);

const hardSeek = planPlayerSync({ song, playing:true, currentTime:10 }, { song, playing:true, position:12 }, 12);
assert.equal(hardSeek.length, 1);
assert.equal(hardSeek[0].type, 'seek');
assert.equal(hardSeek[0].currentTime, 12);
assert.equal(hardSeek[0].drift, 2);

assert.deepEqual(
  planPlayerSync({ song, playing:true, currentTime:12 }, { song, playing:false, position:12 }, 12),
  [{ type:'pause' }]
);

assert.deepEqual(
  planPlayerSync({ song, playing:false, currentTime:12 }, { song, playing:true, position:12 }, 12),
  [{ type:'play' }]
);

const player = createMockPlayer();
let actions = applyPlayerSync(player, { song, playing:true, position:30 }, 30);
assert.equal(actions[0].type, 'load');
assert.equal(player.getState().playing, true);
assert.equal(player.getState().currentTime, 30);

const historyLength = player.getHistory().length;
actions = applyPlayerSync(player, { song, playing:true, position:30.2 }, 30.2);
assert.deepEqual(actions, []);
assert.equal(player.getHistory().length, historyLength);

actions = applyPlayerSync(player, { song, playing:false, position:45 }, 45);
assert.deepEqual(actions.map(action => action.type), ['seek', 'pause']);
assert.equal(player.getState().currentTime, 45);
assert.equal(player.getState().playing, false);

console.log('music player adapter tests passed');
