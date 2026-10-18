const V='rq-v3',CORE=['/','/index.html','/config.js','/runtime.js','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.pathname.startsWith('/api/'))return;
  // pages: network first, fall back to cache (offline)
  if(r.mode==='navigate'){e.respondWith(fetch(r).then(x=>{caches.open(V).then(c=>c.put('/index.html',x.clone()));return x}).catch(()=>caches.match('/index.html')));return}
  // our own scripts/config/manifest: network first so updates (e.g. config.js) always arrive
  if(u.origin===location.origin&&/\.(js|webmanifest|html)$/.test(u.pathname)){e.respondWith(fetch(r).then(x=>{if(x.ok)caches.open(V).then(c=>c.put(r,x.clone()));return x}).catch(()=>caches.match(r)));return}
  // everything else (icons, Google Fonts, library CDN): cache first, then network
  e.respondWith(caches.match(r).then(h=>h||fetch(r).then(x=>{if(x.ok||x.type==='opaque')caches.open(V).then(c=>c.put(r,x.clone()));return x})))
});
