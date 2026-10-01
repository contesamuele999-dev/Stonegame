/* Service worker: salva il gioco sul telefono per aprirlo anche senza internet. */
const CACHE = 'stonetao-v7';
const FILES = [
  "./",
  "index.html",
  "engine.js",
  "ui.js",
  "arena3d.js",
  "cloud.js",
  "audio.js",
  "net.js",
  "vendor/three.min.js",
  "vendor/peerjs.min.js",
  "manifest.webmanifest",
  "img/adriano.jpg",
  "img/alessandro.jpg",
  "img/andrea.jpg",
  "img/annalisa.jpg",
  "img/annastella.jpg",
  "img/carla.jpg",
  "img/caterina.jpg",
  "img/celeste.jpg",
  "img/chen.jpg",
  "img/chicca.jpg",
  "img/christian.jpg",
  "img/elia.jpg",
  "img/federica.jpg",
  "img/grazia.jpg",
  "img/favicon.ico",
  "img/icona-192.png",
  "img/icona-512.png",
  "img/icona-maskable.png",
  "img/katya.jpg",
  "img/lorenzo.jpg",
  "img/niccolo.jpg",
  "img/nicole.jpg",
  "img/remigio.jpg",
  "img/retro.jpg",
  "img/samuele.jpg",
  "img/sara.jpg",
  "img/signorello.jpg",
  "img/strahinja.jpg",
  "img/viola.jpg",
  "img/vittorio.jpg",
  "img/wangting.jpg",
  "img/zhenglei.jpg",
  "img/volti/adriano.jpg",
  "img/volti/alessandro.jpg",
  "img/volti/andrea.jpg",
  "img/volti/annalisa.jpg",
  "img/volti/annastella.jpg",
  "img/volti/carla.jpg",
  "img/volti/caterina.jpg",
  "img/volti/celeste.jpg",
  "img/volti/chen.jpg",
  "img/volti/chicca.jpg",
  "img/volti/christian.jpg",
  "img/volti/elia.jpg",
  "img/volti/federica.jpg",
  "img/volti/grazia.jpg",
  "img/volti/katya.jpg",
  "img/volti/lorenzo.jpg",
  "img/volti/niccolo.jpg",
  "img/volti/nicole.jpg",
  "img/volti/remigio.jpg",
  "img/volti/samuele.jpg",
  "img/volti/sara.jpg",
  "img/volti/signorello.jpg",
  "img/volti/strahinja.jpg",
  "img/volti/viola.jpg",
  "img/volti/vittorio.jpg",
  "img/volti/wangting.jpg",
  "img/volti/zhenglei.jpg",
  "img/teste/adriano.jpg",
  "img/teste/alessandro.jpg",
  "img/teste/andrea.jpg",
  "img/teste/annalisa.jpg",
  "img/teste/annastella.jpg",
  "img/teste/carla.jpg",
  "img/teste/caterina.jpg",
  "img/teste/celeste.jpg",
  "img/teste/chen.jpg",
  "img/teste/chicca.jpg",
  "img/teste/christian.jpg",
  "img/teste/elia.jpg",
  "img/teste/federica.jpg",
  "img/teste/grazia.jpg",
  "img/teste/katya.jpg",
  "img/teste/lorenzo.jpg",
  "img/teste/niccolo.jpg",
  "img/teste/nicole.jpg",
  "img/teste/remigio.jpg",
  "img/teste/samuele.jpg",
  "img/teste/sara.jpg",
  "img/teste/signorello.jpg",
  "img/teste/strahinja.jpg",
  "img/teste/viola.jpg",
  "img/teste/vittorio.jpg",
  "img/teste/wangting.jpg",
  "img/teste/zhenglei.jpg"
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Prima la rete (così gli aggiornamenti arrivano subito), la copia salvata se si è offline.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
