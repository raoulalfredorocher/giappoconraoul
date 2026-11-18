// Offline: la pagina e app.js si prendono dalla rete (aggiornamenti subito), dalla cache se manca la rete.
const V='jca-c1f7f86a';
const SHELL=['./','index.html','app.js','config.js','manifest.webmanifest','icons/icon-192.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).catch(()=>{}));});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==V)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  const lib=u.hostname==='www.gstatic.com'||u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com';
  if(u.origin!==location.origin&&!lib)return;
  if(u.pathname.endsWith('.pdf'))return;
  e.respondWith((async()=>{const c=await caches.open(V);
    if(lib){const hit=await c.match(r);if(hit)return hit;const res=await fetch(r);if(res.ok||res.type==='opaque')c.put(r,res.clone());return res;}
    try{const res=await fetch(r,{cache:'no-cache'});if(res.ok)c.put(r,res.clone());return res;}catch(x){return (await c.match(r,{ignoreSearch:true}))||(await c.match('index.html'))||Response.error();}})());});
