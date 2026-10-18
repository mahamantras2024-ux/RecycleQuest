const V='rq-v1',CORE=['/','/index.html','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.pathname.startsWith('/api/'))return;
  // pages: network first, fall back to cache (offline)
  if(r.mode==='navigate'){e.respondWith(fetch(r).then(x=>{caches.open(V).then(c=>c.put('/index.html',x.clone()));return x}).catch(()=>caches.match('/index.html')));return}
  // everything else (incl. Google Fonts): cache first, then network
  e.respondWith(caches.match(r).then(h=>h||fetch(r).then(x=>{if(x.ok||x.type==='opaque')caches.open(V).then(c=>c.put(r,x.clone()));return x})))
});
