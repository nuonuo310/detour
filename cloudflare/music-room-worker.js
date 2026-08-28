import { DurableObject } from 'cloudflare:workers';
import { createRoomAuthorityEndpoint } from '../music-room-authority-endpoint.js';

const STATE_KEY = 'canonical-room-state';
const TEST_TONE_PATH = '/music-room-test-tone.wav';

const parseMessage = message => {
  if (typeof message !== 'string') return null;
  try { return JSON.parse(message); } catch { return null; }
};

const makeTestTone = () => {
  const sampleRate = 8000, seconds = 4, samples = sampleRate * seconds;
  const bytes = new Uint8Array(44 + samples * 2);
  const view = new DataView(bytes.buffer);
  const text = (offset, value) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + samples * 2, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i += 1) {
    const envelope = Math.min(1, i / 240) * Math.min(1, (samples - i) / 240);
    view.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * 440 * i / sampleRate) * 5000 * envelope), true);
  }
  return bytes;
};

const acceptancePage = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Detour · 一起听发声验收</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:720px;margin:32px auto;padding:0 18px}button,input,select{font:inherit}button{padding:8px 12px;margin:4px}.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.card{border:1px solid #ccc;border-radius:12px;padding:16px;margin:16px 0}.muted{opacity:.65;font-size:14px}input[type=range]{width:min(320px,70vw)}audio{width:100%;margin-top:12px}</style></head>
<body><h1>一起听 · 发声验收</h1><p class="muted">这是链路测试音，不代表最终音乐来源。两台设备进入同一房间后，播放、暂停和进度由房间共同控制。</p>
<div class="row"><label>房间 <input id="room" value="audible-test"></label><label>客户端 <select id="client"><option value="shenshu">Shenshu</option><option value="nuonuo">Nuonuo</option></select></label><button id="connect">连接</button></div>
<div class="card"><div id="connection">未连接</div><div id="song">No song</div><div id="state">Paused · 0.0s</div><div id="revision" class="muted">revision 0</div><audio id="audio" controls playsinline></audio></div>
<div class="row"><button id="tone">载入测试音</button><button id="play">播放</button><button id="pause">暂停</button></div><div class="row"><input id="seek" type="range" min="0" max="4" value="0" step="0.1"><button id="seekButton">拖到这里</button></div>
<script>
const $=id=>document.getElementById(id),audio=$('audio');const tone={provider:'test',providerId:'detour-tone',key:'test:detour-tone',title:'Detour Test Tone',artist:'Detour',duration:4};
let ws=null,state=null,offset=0,retryTimer=null,heartbeatTimer=null,watchdogTimer=null,generation=0,shouldReconnect=false,lastMessage=0,retryCount=0,lastSongKey=null,applying=false;
const projected=()=>{if(!state)return 0;const now=Date.now()+offset,base=Number(state.position)||0;if(!state.playing)return base;return Math.min(base+Math.max(0,now-Number(state.positionAt||now))/1000,Number(state.song?.duration)||Infinity)};
const render=()=>{if(!state)return;const pos=projected();$('song').textContent=state.song?state.song.title:'No song';$('state').textContent=(state.playing?'Playing':'Paused')+' · '+pos.toFixed(1)+'s';$('revision').textContent='revision '+state.revision+' · updated by '+(state.updatedBy||'nobody');$('seek').max=String(state.song?.duration||4);$('seek').value=String(Math.min(pos,Number($('seek').max)))};
const applyMedia=async()=>{if(!state)return;applying=true;try{const key=state.song?.key||null,target=projected();if(key!==lastSongKey){lastSongKey=key;if(!key){audio.pause();audio.removeAttribute('src');audio.load();return}audio.src='${TEST_TONE_PATH}';audio.load();await new Promise(resolve=>audio.readyState>=1?resolve():audio.addEventListener('loadedmetadata',resolve,{once:true}))}if(Math.abs((audio.currentTime||0)-target)>.35)audio.currentTime=Math.min(target,audio.duration||target);if(state.playing){try{await audio.play()}catch{$('connection').textContent='已连接 · 点一下播放允许声音'}}else audio.pause()}finally{applying=false}};
const sendJson=m=>{if(ws?.readyState===1){ws.send(JSON.stringify(m));return true}return false},sendIntent=i=>sendJson({kind:'intent',intent:{...i,clientId:$('client').value}});
const startHeartbeat=()=>{clearInterval(heartbeatTimer);clearInterval(watchdogTimer);heartbeatTimer=setInterval(()=>sendJson({kind:'ping',clientId:$('client').value}),15000);watchdogTimer=setInterval(()=>{if(ws?.readyState===1&&Date.now()-lastMessage>35000)ws.close(4000,'heartbeat timeout')},5000)};
const scheduleReconnect=g=>{if(!shouldReconnect||g!==generation||retryTimer)return;retryCount++;$('connection').textContent='重连中…';retryTimer=setTimeout(()=>{retryTimer=null;if(shouldReconnect&&g===generation)openSocket(g)},Math.min(5000,750*Math.pow(1.6,retryCount-1)))};
const openSocket=g=>{const room=$('room').value.trim()||'audible-test',scheme=location.protocol==='https:'?'wss:':'ws:',socket=new WebSocket(scheme+'//'+location.host+'/music-room/'+encodeURIComponent(room));ws=socket;$('connection').textContent=retryCount?'正在重连…':'连接中…';socket.onopen=()=>{if(g!==generation){socket.close();return}retryCount=0;lastMessage=Date.now();$('connection').textContent='已连接';sendJson({kind:'hello',clientId:$('client').value});startHeartbeat()};socket.onmessage=async e=>{if(g!==generation)return;lastMessage=Date.now();try{const m=JSON.parse(e.data);if(Number.isFinite(Number(m.serverNow)))offset=Number(m.serverNow)-Date.now();if(m.kind==='snapshot'){state=m.state;render();await applyMedia()}}catch{}};socket.onclose=e=>{if(g!==generation)return;clearInterval(heartbeatTimer);clearInterval(watchdogTimer);if(shouldReconnect){$('connection').textContent='重连中… ('+e.code+')';scheduleReconnect(g)}else $('connection').textContent='已断开'};socket.onerror=()=>{if(g===generation)$('connection').textContent='连接异常，准备重连…'}};
$('connect').onclick=()=>{generation++;shouldReconnect=true;retryCount=0;clearTimeout(retryTimer);if(ws&&ws.readyState<2)ws.close(1000,'reconnect requested');openSocket(generation)};$('tone').onclick=()=>sendIntent({type:'song',song:tone,playing:false});$('play').onclick=()=>sendIntent({type:'play'});$('pause').onclick=()=>sendIntent({type:'pause'});$('seekButton').onclick=()=>sendIntent({type:'seek',position:Number($('seek').value)});
audio.addEventListener('play',()=>{if(!applying)sendIntent({type:'play'})});audio.addEventListener('pause',()=>{if(!applying&&state?.playing)sendIntent({type:'pause'})});audio.addEventListener('seeked',()=>{if(!applying&&state?.song)sendIntent({type:'seek',position:audio.currentTime})});setInterval(render,250);
</script></body></html>`;

export class MusicRoom extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.roomId=null; this.endpoint=null; this.ready=this.ctx.blockConcurrencyWhile(async()=>{const stored=await this.ctx.storage.get(STATE_KEY);if(stored?.roomId)this.roomId=stored.roomId;this.endpoint=this.createEndpoint(stored||undefined)}); }
  createEndpoint(initialState){return createRoomAuthorityEndpoint({roomId:initialState?.roomId||this.roomId||'pending-room',authorityId:'room-service',initialState,publish:message=>this.broadcast(message)})}
  async fetch(request){await this.ready;if(request.headers.get('Upgrade')!=='websocket')return new Response('Expected WebSocket',{status:426});const url=new URL(request.url),roomId=url.searchParams.get('roomId');if(!roomId)return new Response('roomId is required',{status:400});if(!this.roomId||this.roomId==='pending-room'){this.roomId=roomId;this.endpoint=createRoomAuthorityEndpoint({roomId,authorityId:'room-service',publish:message=>this.broadcast(message)});await this.ctx.storage.put(STATE_KEY,this.endpoint.getState())}else if(roomId!==this.roomId)return new Response('roomId mismatch',{status:409});const pair=new WebSocketPair(),[client,server]=Object.values(pair);this.ctx.acceptWebSocket(server);return new Response(null,{status:101,webSocket:client})}
  async webSocketMessage(ws,rawMessage){await this.ready;const message=parseMessage(rawMessage);if(!message)return;if(message.kind==='ping'){try{ws.send(JSON.stringify({kind:'pong',serverNow:Date.now()}))}catch{}return}const changed=this.endpoint.handle(message);if(changed&&message.kind==='intent')await this.ctx.storage.put(STATE_KEY,this.endpoint.getState())}
  webSocketClose(){}
  broadcast(message){const payload=JSON.stringify(message);for(const socket of this.ctx.getWebSockets()){try{if(socket.readyState===1)socket.send(payload)}catch{}}}
}

export default {fetch(request,env){const url=new URL(request.url);if(url.pathname==='/music-room-demo')return new Response(acceptancePage,{headers:{'content-type':'text/html; charset=utf-8'}});if(url.pathname===TEST_TONE_PATH)return new Response(makeTestTone(),{headers:{'content-type':'audio/wav','cache-control':'public, max-age=86400'}});const match=url.pathname.match(/^\/music-room\/([^/]+)$/);if(!match)return new Response('Not found',{status:404});if(request.headers.get('Upgrade')!=='websocket')return new Response('Expected WebSocket',{status:426});const roomId=decodeURIComponent(match[1]),stub=env.MUSIC_ROOM.getByName(roomId),upstream=new URL(request.url);upstream.searchParams.set('roomId',roomId);return stub.fetch(new Request(upstream,request))}};
