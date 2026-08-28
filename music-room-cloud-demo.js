import { createWebSocketRoomClient } from './music-room-websocket-client.js';
import { createMockPlayer } from './music-room-mock-player.js';
import { bindRoomClientToPlayer } from './music-room-player-client.js';

const songs = {
  A: { provider:'mock', providerId:'song-a', key:'mock:song-a', title:'Song A', artist:'Detour', duration:300 },
  B: { provider:'mock', providerId:'song-b', key:'mock:song-b', title:'Song B', artist:'Detour', duration:180 }
};

const $ = id => document.getElementById(id);
let room = null;
let player = null;
let binding = null;
let timer = null;

function render() {
  if (!room || !player) return;
  const state = room.getState();
  binding?.sync(state);
  const currentTime = room.getPosition();
  const p = player.getState();
  $('song').textContent = p.song ? `${p.song.title} — ${p.song.artist}` : 'No song';
  $('state').textContent = `${p.playing ? 'Playing' : 'Paused'} · ${currentTime.toFixed(1)}s`;
  $('revision').textContent = `revision ${state.revision} · updated by ${state.updatedBy || 'nobody'} · clock ${room.getServiceClockOffset().toFixed(0)}ms`;
  $('seek').max = String(p.song?.duration || 300);
  $('seek').value = String(Math.min(currentTime, Number($('seek').max)));
}

function connect() {
  const url = $('url').value.trim();
  if (!url) {
    $('connection').textContent = 'Enter deployed room WebSocket URL';
    return;
  }

  clearInterval(timer);
  room?.close();
  player = createMockPlayer({ id:`${$('client').value}-cloud-player` });
  binding = null;
  $('connection').textContent = 'Connecting…';

  room = createWebSocketRoomClient({
    url,
    roomId: decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || ''),
    clientId: $('client').value,
    onOpen: () => { $('connection').textContent = 'Connected'; render(); },
    onClose: () => { $('connection').textContent = 'Reconnecting…'; },
    onState: state => { binding?.sync(state); render(); }
  });

  binding = bindRoomClientToPlayer({ room, player });
  render();
  timer = setInterval(render, 250);
}

$('connect').addEventListener('click', connect);
$('songA').addEventListener('click', () => room?.send({ type:'song', song:songs.A, playing:true }));
$('songB').addEventListener('click', () => room?.send({ type:'song', song:songs.B, playing:true }));
$('play').addEventListener('click', () => room?.send({ type:'play' }));
$('pause').addEventListener('click', () => room?.send({ type:'pause' }));
$('seekButton').addEventListener('click', () => room?.send({ type:'seek', position:Number($('seek').value) }));
