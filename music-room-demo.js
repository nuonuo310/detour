import { createBroadcastRoom } from './music-room-sync.js';
import { createMockPlayer } from './music-room-mock-player.js';

const roomId = 'detour-together-demo';
const authorityId = 'shenshu';
const songs = {
  A: { provider:'mock', providerId:'song-a', title:'Song A', artist:'Detour', duration:300 },
  B: { provider:'mock', providerId:'song-b', title:'Song B', artist:'Detour', duration:180 }
};

const $ = id => document.getElementById(id);
let room;
let player;
let timer;

function render() {
  if (!room || !player) return;
  const state = room.getState();
  const currentTime = room.getPosition();
  player.applyRoomState(state, currentTime);
  const p = player.getState();
  $('song').textContent = p.song ? `${p.song.title} — ${p.song.artist}` : 'No song';
  $('state').textContent = `${p.playing ? 'Playing' : 'Paused'} · ${p.currentTime.toFixed(1)}s`;
  $('revision').textContent = `revision ${state.revision} · updated by ${state.updatedBy}`;
  $('seek').max = String(p.song?.duration || 300);
  $('seek').value = String(Math.min(currentTime, Number($('seek').max)));
}

function connect() {
  clearInterval(timer);
  room?.close();
  const clientId = $('client').value;
  player = createMockPlayer({ id:`${clientId}-demo-player` });
  room = createBroadcastRoom({ roomId, clientId, authorityId, onState: render });
  render();
  room.requestSync();
  timer = setInterval(render, 250);
}

$('client').addEventListener('change', connect);
$('reconnect').addEventListener('click', connect);
$('songA').addEventListener('click', () => room.send({ type:'song', song:songs.A, playing:true }));
$('songB').addEventListener('click', () => room.send({ type:'song', song:songs.B, playing:true }));
$('play').addEventListener('click', () => room.send({ type:'play' }));
$('pause').addEventListener('click', () => room.send({ type:'pause' }));
$('seekButton').addEventListener('click', () => room.send({ type:'seek', position:Number($('seek').value) }));

connect();
