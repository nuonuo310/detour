import { DurableObject } from 'cloudflare:workers';
import { createRoomAuthorityEndpoint } from '../music-room-authority-endpoint.js';

const STATE_KEY = 'canonical-room-state';

const parseMessage = message => {
  if (typeof message !== 'string') return null;
  try {
    return JSON.parse(message);
  } catch {
    return null;
  }
};

const acceptancePage = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Detour · 一起听云端验收</title>
  <style>
    body{font:16px/1.5 system-ui,sans-serif;max-width:720px;margin:32px auto;padding:0 18px}button,input,select{font:inherit}button{padding:8px 12px;margin:4px}.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.card{border:1px solid #ccc;border-radius:12px;padding:16px;margin:16px 0}.muted{opacity:.65;font-size:14px}input[type=range]{width:min(320px,70vw)}
  </style>
</head>
<body>
  <h1>一起听 · 云端验收</h1>
  <p class="muted">电脑和手机打开这个页面，使用同一个房间名、不同客户端，然后在任意一边操作。</p>
  <div class="row">
    <label>房间 <input id="room" value="ours"></label>
    <label>客户端 <select id="client"><option value="shenshu">Shenshu</option><option value="nuonuo">Nuonuo</option></select></label>
    <button id="connect">连接</button>
  </div>
  <div class="card">
    <div id="connection">未连接</div>
    <div id="song">No song</div>
    <div id="state">Paused · 0.0s</div>
    <div id="revision" class="muted">revision 0</div>
  </div>
  <div class="row">
    <button id="songA">Song A</button><button id="songB">Song B</button>
    <button id="play">播放</button><button id="pause">暂停</button>
  </div>
  <div class="row"><input id="seek" type="range" min="0" max="300" value="0" step="1"><button id="seekButton">拖到这里</button></div>
<script>
const songs={A:{provider:'mock',providerId:'song-a',key:'mock:song-a',title:'Song A',artist:'Detour',duration:300},B:{provider:'mock',providerId:'song-b',key:'mock:song-b',title:'Song B',artist:'Detour',duration:180}};
const $=id=>document.getElementById(id);
let ws=null,state=null,offset=0,timer=null,retryTimer=null,heartbeatTimer=null,watchdogTimer=null,connectionGeneration=0,shouldReconnect=false,lastServerMessageAt=0,retryCount=0;
const projected=()=>{if(!state)return 0;const now=Date.now()+offset;const base=Number(state.position)||0;if(!state.playing)return base;const next=base+Math.max(0,now-Number(state.positionAt||now))/1000;return Math.min(next,Number(state.song?.duration)||next)};
const render=()=>{if(!state)return;const pos=projected();$('song').textContent=state.song?state.song.title+' — '+state.song.artist:'No song';$('state').textContent=(state.playing?'Playing':'Paused')+' · '+pos.toFixed(1)+'s';$('revision').textContent='revision '+state.revision+' · updated by '+(state.updatedBy||'nobody');$('seek').max=String(state.song?.duration||300);$('seek').value=String(Math.min(pos,Number($('seek').max)))};
const sendJson=message=>{if(ws?.readyState===1){ws.send(JSON.stringify(message));return true}return false};
const sendIntent=intent=>sendJson({kind:'intent',intent:{...intent,clientId:$('client').value}});
const clearConnectionTimers=()=>{clearTimeout(retryTimer);clearInterval(heartbeatTimer);clearInterval(watchdogTimer);retryTimer=null;heartbeatTimer=null;watchdogTimer=null};
const startHeartbeat=()=>{clearInterval(heartbeatTimer);clearInterval(watchdogTimer);heartbeatTimer=setInterval(()=>sendJson({kind:'ping',clientId:$('client').value}),15000);watchdogTimer=setInterval(()=>{if(ws?.readyState===1&&Date.now()-lastServerMessageAt>35000)ws.close(4000,'heartbeat timeout')},5000)};
const scheduleReconnect=generation=>{if(!shouldReconnect||generation!==connectionGeneration||retryTimer)return;retryCount+=1;const delay=Math.min(5000,750*Math.pow(1.6,retryCount-1));$('connection').textContent='重连中…';retryTimer=setTimeout(()=>{retryTimer=null;if(shouldReconnect&&generation===connectionGeneration)openSocket(generation)},delay)};
const openSocket=generation=>{const room=$('room').value.trim()||'ours';const scheme=location.protocol==='https:'?'wss:':'ws:';const socket=new WebSocket(scheme+'//'+location.host+'/music-room/'+encodeURIComponent(room));ws=socket;$('connection').textContent=retryCount?'正在重连…':'连接中…';socket.addEventListener('open',()=>{if(generation!==connectionGeneration){socket.close();return}retryCount=0;lastServerMessageAt=Date.now();$('connection').textContent='已连接';sendJson({kind:'hello',clientId:$('client').value});startHeartbeat()});socket.addEventListener('message',event=>{if(generation!==connectionGeneration)return;lastServerMessageAt=Date.now();try{const message=JSON.parse(event.data);if(message.kind==='pong'){if(Number.isFinite(Number(message.serverNow)))offset=Number(message.serverNow)-Date.now();return}if(message.kind!=='snapshot')return;if(Number.isFinite(Number(message.serverNow)))offset=Number(message.serverNow)-Date.now();state=message.state;render()}catch{}});socket.addEventListener('close',()=>{if(generation!==connectionGeneration)return;clearInterval(heartbeatTimer);clearInterval(watchdogTimer);heartbeatTimer=null;watchdogTimer=null;if(shouldReconnect)scheduleReconnect(generation);else $('connection').textContent='已断开'});socket.addEventListener('error',()=>{if(generation===connectionGeneration)$('connection').textContent='连接异常，准备重连…'})};
const connect=()=>{connectionGeneration+=1;const generation=connectionGeneration;shouldReconnect=true;retryCount=0;clearConnectionTimers();if(ws&&ws.readyState<2)ws.close(1000,'reconnect requested');openSocket(generation);clearInterval(timer);timer=setInterval(render,250)};
$('connect').onclick=connect;$('songA').onclick=()=>sendIntent({type:'song',song:songs.A,playing:true});$('songB').onclick=()=>sendIntent({type:'song',song:songs.B,playing:true});$('play').onclick=()=>sendIntent({type:'play'});$('pause').onclick=()=>sendIntent({type:'pause'});$('seekButton').onclick=()=>sendIntent({type:'seek',position:Number($('seek').value)});
</script>
</body>
</html>`;

export class MusicRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.roomId = null;
    this.endpoint = null;
    this.ready = this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get(STATE_KEY);
      if (stored?.roomId) this.roomId = stored.roomId;
      this.endpoint = this.createEndpoint(stored || undefined);
    });
  }

  createEndpoint(initialState) {
    return createRoomAuthorityEndpoint({
      roomId: initialState?.roomId || this.roomId || 'pending-room',
      authorityId: 'room-service',
      initialState,
      publish: message => this.broadcast(message)
    });
  }

  async fetch(request) {
    await this.ready;
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const url = new URL(request.url);
    const roomId = url.searchParams.get('roomId');
    if (!roomId) return new Response('roomId is required', { status: 400 });

    if (!this.roomId || this.roomId === 'pending-room') {
      this.roomId = roomId;
      this.endpoint = createRoomAuthorityEndpoint({
        roomId,
        authorityId: 'room-service',
        publish: message => this.broadcast(message)
      });
      await this.ctx.storage.put(STATE_KEY, this.endpoint.getState());
    } else if (roomId !== this.roomId) {
      return new Response('roomId mismatch', { status: 409 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, rawMessage) {
    await this.ready;
    const message = parseMessage(rawMessage);
    if (!message) return;

    if (message.kind === 'ping') {
      ws.send(JSON.stringify({ kind: 'pong', serverNow: Date.now() }));
      return;
    }

    const changed = this.endpoint.handle(message);
    if (changed && message.kind === 'intent') {
      await this.ctx.storage.put(STATE_KEY, this.endpoint.getState());
    }
  }

  webSocketClose() {
    // Cloudflare already closed the socket; nothing else to do here.
  }

  broadcast(message) {
    const payload = JSON.stringify(message);
    for (const socket of this.ctx.getWebSockets()) socket.send(payload);
  }
}

export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/music-room-demo') {
      return new Response(acceptancePage, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }

    const match = url.pathname.match(/^\/music-room\/([^/]+)$/);
    if (!match) return new Response('Not found', { status: 404 });
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const roomId = decodeURIComponent(match[1]);
    const stub = env.MUSIC_ROOM.getByName(roomId);
    const upstream = new URL(request.url);
    upstream.searchParams.set('roomId', roomId);
    return stub.fetch(new Request(upstream, request));
  }
};
