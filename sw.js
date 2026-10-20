/* Service worker: salva il gioco sul telefono per aprirlo anche senza internet. */
const CACHE = 'stonetao-v34';
const FILES = [
  "./",
  "index.html",
  "versione.json",
  "engine.js",
  "ui.js",
  "arena3d.js",
  "cloud.js",
  "mondo.js",
  "storia.js",
  "novita.js",
  "audio.js",
  "voce.js",
  "net.js",
  "vendor/three.min.js",
  "vendor/peerjs.min.js",
  "manifest.webmanifest",
  "img/adriano.jpg",
  "img/alessandro.jpg",
  "img/andrea.jpg",
  "img/annalisa.jpg",
  "img/annastella.jpg",
  "img/caterina.jpg",
  "img/celeste.jpg",
  "img/chen.jpg",
  "img/chicca.jpg",
  "img/christian.jpg",
  "img/elia.jpg",
  "img/federica.jpg",
  "img/gatto.jpg",
  "img/giulia.jpg",
  "img/grazia.jpg",
  "img/favicon.ico",
  "img/icona-192.png",
  "img/icona-512.png",
  "img/icona-maskable.png",
  "img/katya.jpg",
  "img/liming.jpg",
  "img/lorenzo.jpg",
  "img/niccolo.jpg",
  "img/nicole.jpg",
  "img/remigio.jpg",
  "img/ruben.jpg",
  "img/simone.jpg",
  "img/roberto.jpg",
  "img/margherita.jpg",
  "img/retro.jpg",
  "img/samuele.jpg",
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
  "img/volti/caterina.jpg",
  "img/volti/celeste.jpg",
  "img/volti/chen.jpg",
  "img/volti/chicca.jpg",
  "img/volti/christian.jpg",
  "img/volti/elia.jpg",
  "img/volti/federica.jpg",
  "img/volti/gatto.jpg",
  "img/volti/giulia.jpg",
  "img/volti/grazia.jpg",
  "img/volti/katya.jpg",
  "img/volti/liming.jpg",
  "img/volti/lorenzo.jpg",
  "img/volti/niccolo.jpg",
  "img/volti/nicole.jpg",
  "img/volti/remigio.jpg",
  "img/volti/ruben.jpg",
  "img/volti/simone.jpg",
  "img/volti/roberto.jpg",
  "img/volti/margherita.jpg",
  "img/volti/samuele.jpg",
  "img/volti/signorello.jpg",
  "img/volti/strahinja.jpg",
  "img/volti/viola.jpg",
  "img/volti/vittorio.jpg",
  "img/volti/wangting.jpg",
  "img/volti/zhenglei.jpg",
  "audio/liming/aquila.mp3",
  "audio/liming/aquila2.mp3",
  "audio/liming/bum.mp3",
  "audio/liming/iii.mp3",
  "audio/liming/iii2.mp3",
  "audio/liming/pah.mp3",
  "audio/liming/richiamo.mp3",
  "audio/liming/shuaa1.mp3",
  "audio/liming/shuaa2.mp3",
  "audio/liming/shuum.mp3",
  "audio/liming/sus1.mp3",
  "audio/liming/sus2.mp3",
  "audio/liming/taaan.mp3",
  "audio/liming/tin.mp3",
  "audio/liming/vuum.mp3",
  "audio/liming/yah.mp3",
  "audio/liming/zss.mp3",
];

self.addEventListener('install', e => {
  // cache: 'reload': la copia per l'uso offline arriva sempre fresca dal sito, mai dalla cache del browser
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

// Aggiornamento forzato. Dalla versione 30 ci pensa la pagina (ui.js controlla versione.json e si ricarica da sola);
// le pagine ancora aperte con una versione più vecchia (senza quel controllo) le ricarica il service worker, una volta sola.
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(async keys => {
    const old = keys.filter(k => k !== CACHE);
    await Promise.all(old.map(k => caches.delete(k)));
    await self.clients.claim();
    if (!old.some(k => +(/v(\d+)$/.exec(k) || [])[1] < 30)) return;
    const wins = await self.clients.matchAll({ type: 'window' });
    await Promise.all(wins.map(c => c.navigate(c.url).catch(() => {})));
  }));
});

// Prima la rete (cosÃ¬ gli aggiornamenti arrivano subito), la copia salvata se si Ã¨ offline.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // l'audio arriva a pezzi (Range): lo lascio al browser, i telefoni non lo suonano se passa da qui
  if (e.request.headers.has('range') || e.request.destination === 'audio') return;
  e.respondWith(
    // cache: 'no-cache' → il browser chiede sempre al server se il file è cambiato (niente copie vecchie di 10 minuti)
    fetch(e.request, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
