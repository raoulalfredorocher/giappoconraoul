// Offline: the app shell is cached. Page = network first (updates arrive at once), cache when offline.
const V='hira-f042181d';
const SHELL=['./','index.html','config.js','manifest.webmanifest','icons/icon-192.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).catch(()=>{}));});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==V)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  const lib=u.hostname==='www.gstatic.com'||u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com';
  if(u.origin!==location.origin&&!lib)return;
  e.respondWith((async()=>{const c=await caches.open(V);
    if(lib){const hit=await c.match(r);if(hit)return hit;const res=await fetch(r);if(res.ok||res.type==='opaque')c.put(r,res.clone());return res;}
    try{const res=await fetch(r);if(res.ok)c.put(r,res.clone());return res;}catch(x){return (await c.match(r,{ignoreSearch:true}))||(await c.match('index.html'))||Response.error();}})());});
