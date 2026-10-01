/* STONE TEMPLE TAO — arena 3D
 * Lottatori 3D stilizzati (corpo in stile cartoon, volto dalla foto della carta)
 * che eseguono attacchi e mosse speciali. Usa Three.js (r128).
 *
 * API: Arena3D.available() · Arena3D.play(spec) → Promise · Arena3D.skip()
 * spec = { attacker: {card,name,rank}, move: 'Nome mossa', label: 'testo banner',
 *          targets: [{card,name,rank,ally, out:{dmg,heal,dodge,immune,ko,stun,confuse,para}}],
 *          self: {dmg,heal,ko}, flags: {prodigy, formula, confused, counter} }
 */
(function () {
  'use strict';
  const T = window.THREE;

  // ------------------------------------------------------------ dati dei personaggi
  // colore della divisa e dei bordi per ogni carta
  const LOOK = {
    adriano: ['#c0521f', '#f0a040'], alessandro: ['#2f2f35', '#e8631c'], andrea: ['#4b2d7a', '#d4ae62'],
    annastella: ['#2f7d3a', '#9be15d'], carla: ['#7a3fa0', '#ff9a3d'], caterina: ['#5b2590', '#b04cff'],
    celeste: ['#2b3a6b', '#d4ae62'], chen: ['#8f1f1f', '#f2efe6'], chicca: ['#e8e2d6', '#e8631c'],
    christian: ['#26262b', '#e8631c'], elia: ['#5d6070', '#6fb3e6'], federica: ['#1a1a1f', '#ffd24a'],
    grazia: ['#8f1f1f', '#ffd24a'],
    katya: ['#161616', '#6fb3e6'], lorenzo: ['#141414', '#d8412f'], niccolo: ['#f2f2f2', '#e8631c'],
    samuele: ['#cfcac0', '#e8631c'], sara: ['#4a1466', '#b04cff'],
    strahinja: ['#2b4c8c', '#6fb3e6'], viola: ['#8c2b2b', '#ff9a3d'], vittorio: ['#151515', '#e8631c'],
    signorello: ['#a3161b', '#d4ae62'], remigio: ['#2a5aa8', '#d8412f'], nicole: ['#f2ede6', '#e89ab0'],
    annalisa: ['#e9f2ea', '#55b98a'], wangting: ['#6d6a5e', '#d4ae62'], zhenglei: ['#f4efe2', '#b04cff'],
  };
  const BELT = { M: '#d4ae62', I: '#111111', A: '#f2efe6', L: '#b04cff' };

  // come si anima ogni mossa: anim = gesto del corpo, fx = effetto, e = emoji, c = colore
  const MOVES = {
    'Attacco': { anim: 'basic', fx: 'burst', c: '#ffb347' },
    'Calma Sovrastante': { anim: 'meditate', fx: 'calm', e: '☯️', c: '#6fb3e6' },
    'Rimprovero Costruttivo': { anim: 'point', fx: 'drain', e: '☝️', c: '#d4ae62' },
    'Spallata del Prodigio': { anim: 'charge', fx: 'fire', e: '💥', c: '#ff5a1f' },
    'Addestramento Anticinese': { anim: 'powerup', fx: 'aura', e: '🔥', c: '#ffd24a' },
    'Perfezionismo Compulsivo': { anim: 'point', fx: 'orb', e: '🧐', c: '#a978e0' },
    'Disallineamento Temporale': { anim: 'powerup', fx: 'aura', e: '🧳', c: '#6fb3e6' },
    'Firma Urgente': { anim: 'cast', fx: 'papers', e: '📝', c: '#eadbc0' },
    'Annotazione Omnidirezionale': { anim: 'palm', fx: 'burst', e: '✒️', c: '#6fb3e6' },
    'Blocco Telematico': { anim: 'palm', fx: 'burst', e: '💻', c: '#38d6ff' },
    'Ventaglio Perforante': { anim: 'spin', fx: 'burst', e: '🪭', c: '#ff8fb1' },
    'Videopatia': { anim: 'cast', fx: 'flash', e: '📸', c: '#ffffff' },
    'Gomiti di Ferro': { anim: 'powerup', fx: 'metal', e: '🛡️', c: '#c9d3dd' },
    'Terza Persona Colloquiale': { anim: 'shout', fx: 'bubble', t: 'LEI', c: '#eadbc0' },
    'Mutandone Dirompente': { anim: 'sumo', fx: 'aura', e: '🩲', c: '#ff9a3d' },
    'Dolori Omnidirezionali': { anim: 'cast', fx: 'wave', e: '💢', c: '#d8412f' },
    'Organizzazione Confusionaria': { anim: 'punch', fx: 'burst', e: '🌀', c: '#6fb3e6' },
    "Dominio dell'Infante": { anim: 'summon', fx: 'kids', e: '🧟', c: '#7bd87b' },
    'Siculazione Distorta': { anim: 'shout', fx: 'bubble', t: '?!#@', c: '#ffb347' },
    "Berserker dell'Ingiustizia": { anim: 'powerup', fx: 'aura', e: '😤', c: '#ff3b30' },
    'Risposta Scazzata': { anim: 'shout', fx: 'shock', e: '🙄', c: '#6fb3e6' },
    'Che Voglia di Vivere': { anim: 'cast', fx: 'vortex', e: '😮‍💨', c: '#55b98a' },
    'Spaccaossa': { anim: 'kick', fx: 'burst', e: '🦴', c: '#eadbc0' },
    'Depressione Istantanea': { anim: 'point', fx: 'rain', e: '🌧️', c: '#7d8ba0' },
    'Sparizione Ultragenitoriale': { anim: 'vanish', fx: 'smoke', e: '💨', c: '#aaaaaa' },
    'Peluche Ipercoccoloso': { anim: 'throw', fx: 'lob', e: '🐼', c: '#ff8fb1' },
    'Pubblicità Fotogenica': { anim: 'punch', fx: 'flash', e: '📷', c: '#ffffff' },
    'Chioma Rinata': { anim: 'powerup', fx: 'aura', e: '✨', c: '#f5e27a' },
    'Incazzatura Interstellare': { anim: 'powerup', fx: 'lightning', e: '💥', c: '#b04cff' },
    'Intenditrice Seriale': { anim: 'cast', fx: 'aura', e: '🃏', c: '#d4ae62' },
    'Stupro Mentale': { anim: 'cast', fx: 'wave', e: '🧠', c: '#b04cff' },
    'Intenzione Fasulla': { anim: 'feint', fx: 'ghost', e: '👻', c: '#b04cff' },
    'Stato Confusionale': { anim: 'dance', fx: 'wave', e: '❓', c: '#a978e0' },
    'Bottiglia Eterna': { anim: 'cast', fx: 'orb', e: '🍾', c: '#55b98a' },
    'Apprendimento Fulmineo': { anim: 'cast', fx: 'orb', e: '⚡', c: '#ffd24a' },
    'T-shirt Magistrali': { anim: 'throw', fx: 'lob', e: '👕', c: '#eadbc0' },
    'Volto Marmoreo': { anim: 'meditate', fx: 'marble', e: '🗿', c: '#d8d8d8' },
    'Canto Apocalittico': { anim: 'shout', fx: 'wave', e: '🎤', c: '#ff3b30' },
    'Sudorazione Esplosiva': { anim: 'punch', fx: 'steam', e: '💦', c: '#9be15d' },
    'Piedi Lanosi': { anim: 'stomp', fx: 'fluff', e: '🧦', c: '#f2efe6' },
    'Ballo Dirompente': { anim: 'dance', fx: 'shock', e: '🕺', c: '#ff9a3d' },
    'Sussurro Eterno': { anim: 'summon', fx: 'kids', e: '⚔️', kid: '🪖', c: '#ffd24a' },
    'Demassazione Fecale': { anim: 'powerup', fx: 'aura', e: '💨', c: '#b08050' },
    'Potenziamento Tysoniano': { anim: 'powerup', fx: 'aura', e: '🥊', c: '#d8412f' },
    'Manutenzione Post-Apocalittica': { anim: 'cast', fx: 'calm', e: '🔧', c: '#55b98a' },
    'Cameraman Improvvisato': { anim: 'cast', fx: 'flash', e: '🎥', c: '#ffffff' },
    'Gentilezza Ultrapremurosa': { anim: 'cast', fx: 'calm', e: '🥰', c: '#ff8fb1' },
    'Saluto Caritatevole': { anim: 'shout', fx: 'wave', e: '✋', c: '#55b98a' },
    'Ribaltamento Psicosomatico': { anim: 'cast', fx: 'vortex', e: '🔄', c: '#a978e0' },
    'Creazione Marziale': { anim: 'meditate', fx: 'aura', e: '☯️', c: '#d4ae62' },
    'Discendenza Impetuosa': { anim: 'point', fx: 'orb', e: '🙇', c: '#d4ae62' },
    'Ciuffata Cosmica': { anim: 'dance', fx: 'shock', e: '🌌', c: '#b04cff' },
    'Forma Universale': { anim: 'cast', fx: 'calm', e: '🌀', c: '#f5e27a' },
  };

  // ------------------------------------------------------------ stato
  let renderer, scene, camera, clock, root, overlay, titleEl, subEl, flashEl, ctrlEl, back, ground, ready = false, failed = false;
  let running = false, speed = 1, skipping = false;
  const tweens = [], parts = [], updaters = [];
  const faceCache = {}, texCache = {};
  let toonGrad;
  let camBase, camLook, shakeT = 0, shakeAmp = 0;

  function available() {
    if (failed || !T) return false;
    if (ready) return true;
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) { return false; }
  }

  // ------------------------------------------------------------ utilità di animazione
  const ease = {
    io: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    lin: t => t,
    back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  };
  function tween(dur, fn, e) {
    return new Promise(res => tweens.push({ t: 0, dur: Math.max(0.001, dur), fn, e: e || ease.io, res }));
  }
  const wait = s => tween(s, () => {});
  const lerp = (a, b, t) => a + (b - a) * t;

  // ------------------------------------------------------------ texture disegnate a mano
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }
  function emojiTex(e) {
    const k = 'e:' + e;
    if (!texCache[k]) texCache[k] = canvasTex(128, 128, (x) => {
      x.font = '96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(e, 64, 72);
    });
    return texCache[k];
  }
  function textTex(text, color, bubble) {
    const k = 't:' + text + color + (bubble ? 'b' : '');
    const font = `bold ${bubble ? 58 : 76}px "Barlow Condensed","Arial Narrow",Impact,sans-serif`;
    const mc = document.createElement('canvas').getContext('2d'); mc.font = font;
    const tw = Math.max(256, Math.ceil(mc.measureText(text).width + 60));
    if (!texCache[k]) texCache[k] = canvasTex(tw, 128, (x, w, h) => {
      if (bubble) {
        x.fillStyle = '#fffaf0'; x.strokeStyle = '#140f0c'; x.lineWidth = 6;
        x.beginPath(); x.ellipse(w / 2, h / 2 - 8, w / 2 - 10, h / 2 - 22, 0, 0, Math.PI * 2); x.fill(); x.stroke();
        x.beginPath(); x.moveTo(60, 96); x.lineTo(40, 124); x.lineTo(90, 100); x.fill();
      }
      x.font = font;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      if (!bubble) { x.lineWidth = 10; x.strokeStyle = '#140f0c'; x.strokeText(text, w / 2, h / 2); }
      x.fillStyle = bubble ? '#140f0c' : color;
      x.fillText(text, w / 2, h / 2 - (bubble ? 8 : 0));
    });
    return texCache[k];
  }
  function sprite(tex, size, opts) {
    const m = new T.SpriteMaterial(Object.assign({ map: tex, transparent: true, depthWrite: false }, opts || {}));
    const s = new T.Sprite(m);
    s.scale.set(size * (tex.image.width / tex.image.height), size, 1);
    return s;
  }

  // Volto della carta per la testa 3D: la foto con i bordi sfumati (si fonde con la pelle del cranio),
  // più il colore della pelle (guancia) e dei capelli (parte alta della foto).
  // Dove sta il viso nel ritaglio img/teste: [centro x, centro y, larghezza del viso], in frazioni del lato,
  // più (facoltativo) il colore dei capelli quando dalla foto non si riesce a ricavarlo.
  const FACE = {
    adriano: [0.52, 0.68, 0.85], alessandro: [0.5, 0.62, 0.9], andrea: [0.62, 0.58, 0.5, '#231a16'], annalisa: [0.5, 0.64, 0.45, '#4a3a30'],
    annastella: [0.52, 0.62, 0.6], carla: [0.55, 0.62, 0.6], caterina: [0.6, 0.5, 0.6], celeste: [0.5, 0.66, 0.7],
    chen: [0.52, 0.58, 0.55, '#1d1612'], chicca: [0.6, 0.7, 0.4, '#2a1c14'], christian: [0.55, 0.85, 0.7, '#2b1f18'], elia: [0.5, 0.56, 0.45, '#4a3222'],
    federica: [0.68, 0.45, 0.28], grazia: [0.52, 0.8, 0.5, '#d9a95a'], katya: [0.5, 0.65, 0.45, '#d8d4d0'], lorenzo: [0.5, 0.72, 0.5, '#1e1712'],
    niccolo: [0.5, 0.62, 0.45, '#2a1f1a'], nicole: [0.52, 0.8, 0.55, '#8a6440'], remigio: [0.55, 0.72, 0.5], samuele: [0.33, 0.55, 0.45, '#2b2018'],
    sara: [0.5, 0.58, 0.45], signorello: [0.6, 0.58, 0.45], strahinja: [0.5, 0.42, 0.4], viola: [0.5, 0.56, 0.6, '#5a3a24'],
    vittorio: [0.45, 0.65, 0.7], wangting: [0.5, 0.55, 0.5], zhenglei: [0.5, 0.56, 0.5],
  };
  function faceTex(card) {
    if (faceCache[card]) return faceCache[card];
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const tex = new T.CanvasTexture(c);
    const info = { tex, skin: '#d9a47f', hair: '#2a1d16' };
    const x = c.getContext('2d', { willReadFrequently: true });
    const avg = (sx, sy, w, h) => {
      const d = x.getImageData(sx, sy, w, h).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      return `rgb(${r / n | 0},${g / n | 0},${b / n | 0})`;
    };
    const img = new Image();
    img.onload = () => {
      // la foto si sposta e si ingrandisce perché il viso cada al centro e largo sempre uguale
      const [cx, cy, fw, hairFix] = FACE[card] || [0.5, 0.6, 0.5];
      // capelli: dalla foto originale, sopra la fronte (se il viso tocca il bordo alto, la striscia in cima)
      try {
        x.drawImage(img, 0, 0, 256, 256);
        const hy = Math.max(0, cy - fw * 0.95) * 256, hh = Math.max(8, (cy - fw * 0.72) * 256 - hy);
        info.hair = avg(Math.max(0, (cx - fw * 0.2) * 256) | 0, hy | 0, Math.max(8, fw * 0.4 * 256) | 0, hh | 0);
        // se è venuto fuori lo sfondo colorato della carta (viola, rosa, blu) e non i capelli: castano scuro
        const hsl = {}; new T.Color(info.hair).getHSL(hsl);
        if (hsl.s > 0.25 && hsl.h > 0.47 && hsl.h < 0.95) info.hair = '#2a1d16';
        if (hairFix) info.hair = hairFix;
      } catch (e) { /* immagine non leggibile */ }
      x.clearRect(0, 0, 256, 256);
      const k = 127 / (fw * img.width);
      x.drawImage(img, 128 - cx * img.width * k, 140 - cy * img.height * k, img.width * k, img.height * k);
      try { info.skin = avg(108, 152, 40, 18); } catch (e) { /* immagine non leggibile */ }
      // maschera ovale sfumata: resta il viso, spariscono sfondo e bordi
      x.globalCompositeOperation = 'destination-in';
      x.save(); x.translate(128, 132); x.scale(0.8, 1);
      const m = x.createRadialGradient(0, 0, 0, 0, 0, 98);
      m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.68, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = m; x.fillRect(-160, -140, 320, 280);
      x.restore();
      x.globalCompositeOperation = 'source-over';
      tex.needsUpdate = true;
      (info.onLoad || []).forEach(f => f(info));
    };
    img.src = window.STT.img(`teste/${card}.jpg`);
    faceCache[card] = info;
    return info;
  }

  // Sfera con la foto proiettata di fronte (asse +x): dietro le coordinate escono dall'immagine
  // e cadono nella parte trasparente, così il volto compare solo davanti.
  // FACE_U / FACE_V: quanta parte della foto (da 0 a 1) copre il davanti della testa, in larghezza e in altezza
  const HEAD_R = 0.22, FACE_U = 0.62, FACE_V = 0.74;
  function faceGeo() {
    return geo('face', () => {
      const r = HEAD_R * 1.012;
      const gm = new T.SphereGeometry(r, 40, 30);
      const pos = gm.attributes.position, uv = gm.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
        if (px < r * 0.05) uv.setXY(i, pz >= 0 ? -0.2 : 1.2, 1.2);
        else uv.setXY(i, 0.5 - (pz / r) * 0.5 * FACE_U, 0.5 + (py / r) * 0.5 * FACE_V);
      }
      uv.needsUpdate = true;
      return gm;
    });
  }

  function toon(color) {
    return new T.MeshToonMaterial({ color, gradientMap: toonGrad });
  }

  // ------------------------------------------------------------ palestre (carte terreno)
  // Fondale 1024×512 e pavimento 1024×1024 disegnati a mano. Sul telefono in verticale si vede
  // solo la fascia centrale del fondale (circa dal 40% al 60%): lì va il soggetto principale.
  function templeLogo(x, cx, cy, s, col) {
    x.fillStyle = col;
    x.fillRect(cx - 46 * s, cy, 92 * s, 8 * s); x.fillRect(cx - 38 * s, cy - 8 * s, 76 * s, 8 * s);
    for (let i = 0; i < 3; i++) {
      const ww = (70 - i * 16) * s, yy = cy - (20 + i * 18) * s;
      x.fillRect(cx - ww / 2 + 8 * s, yy, ww - 16 * s, 12 * s);
      x.beginPath(); x.moveTo(cx - ww / 2 - 6 * s, yy + 2 * s); x.quadraticCurveTo(cx, yy - 12 * s, cx + ww / 2 + 6 * s, yy + 2 * s); x.lineTo(cx + ww / 2, yy + 6 * s); x.lineTo(cx - ww / 2, yy + 6 * s); x.fill();
    }
    x.beginPath(); x.arc(cx, cy - 78 * s, 4 * s, 0, Math.PI * 2); x.fill();
  }
  function grad(x, h, stops) { const g = x.createLinearGradient(0, 0, 0, h); stops.forEach(([k, c]) => g.addColorStop(k, c)); return g; }
  function kanji(x, t, px, py, size, col) { x.fillStyle = col; x.font = `bold ${size}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, px, py); }
  function scroll(x, px, py, ww, hh, t) {
    x.fillStyle = '#eadbc0'; x.fillRect(px - ww / 2, py, ww, hh);
    x.fillStyle = '#5a3320'; x.fillRect(px - ww / 2 - 6, py - 6, ww + 12, 8); x.fillRect(px - ww / 2 - 6, py + hh - 2, ww + 12, 8);
    kanji(x, t, px, py + hh / 2, ww * 0.7, '#140f0c');
  }
  function lantern(x, px, py, r) {
    const g = x.createRadialGradient(px, py, 2, px, py, r * 2.2); g.addColorStop(0, 'rgba(255,190,90,.55)'); g.addColorStop(1, 'rgba(255,190,90,0)');
    x.fillStyle = g; x.fillRect(px - r * 2.2, py - r * 2.2, r * 4.4, r * 4.4);
    x.fillStyle = '#d8412f'; x.beginPath(); x.ellipse(px, py, r, r * 1.2, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#d4ae62'; x.fillRect(px - r * 0.5, py - r * 1.35, r, r * 0.3); x.fillRect(px - r * 0.5, py + r * 1.1, r, r * 0.3);
    x.strokeStyle = '#1d110a'; x.lineWidth = 2; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, py - r * 1.3); x.stroke();
  }
  function trigram(x, bits, cx, cy, ang, s, col) {
    x.save(); x.translate(cx, cy); x.rotate(ang); x.fillStyle = col;
    bits.forEach((b, i) => {
      const yy = -s * 0.9 + i * s * 0.75;
      if (b) x.fillRect(-s, yy, s * 2, s * 0.42);
      else { x.fillRect(-s, yy, s * 0.82, s * 0.42); x.fillRect(s * 0.18, yy, s * 0.82, s * 0.42); }
    });
    x.restore();
  }
  function taiji(x, cx, cy, r, dark, light) {
    x.fillStyle = light; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    x.fillStyle = dark; x.beginPath(); x.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2); x.arc(cx, cy + r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true); x.arc(cx, cy - r / 2, r / 2, Math.PI / 2, -Math.PI / 2); x.fill();
    x.fillStyle = light; x.beginPath(); x.arc(cx, cy + r / 2, r / 7, 0, Math.PI * 2); x.fill();
    x.fillStyle = dark; x.beginPath(); x.arc(cx, cy - r / 2, r / 7, 0, Math.PI * 2); x.fill();
  }

  const PAINT = {
    // arena di sempre: tramonto, montagne e pagoda
    tempio: {
      bg(x, w, h) {
        x.fillStyle = grad(x, h, [[0, '#1b0f0b'], [0.45, '#6b2a12'], [0.7, '#e8631c'], [1, '#3a1a0e']]); x.fillRect(0, 0, w, h);
        x.fillStyle = '#ffcf7a'; x.globalAlpha = 0.85; x.beginPath(); x.arc(w * 0.62, h * 0.62, 70, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
        const ridge = (y0, amp, col, seed) => {
          x.fillStyle = col; x.beginPath(); x.moveTo(0, h);
          for (let i = 0; i <= 64; i++) { const px = i / 64 * w; x.lineTo(px, y0 - Math.abs(Math.sin(i * 0.7 + seed) * amp + Math.sin(i * 1.9 + seed * 2) * amp * 0.4)); }
          x.lineTo(w, h); x.fill();
        };
        ridge(h * 0.74, 70, '#3b1a10', 1); ridge(h * 0.84, 50, '#24110b', 3);
        x.fillStyle = '#140a07';
        const px = w * 0.24, py = h * 0.84;
        for (let i = 0; i < 4; i++) {
          const ww = 120 - i * 24, yy = py - 40 - i * 34;
          x.fillRect(px - ww / 2 + 14, yy, ww - 28, 34);
          x.beginPath(); x.moveTo(px - ww / 2 - 18, yy + 6); x.quadraticCurveTo(px, yy - 26, px + ww / 2 + 18, yy + 6); x.lineTo(px + ww / 2 - 6, yy + 12); x.lineTo(px - ww / 2 + 6, yy + 12); x.fill();
        }
        x.fillRect(px - 2, py - 200, 4, 40);
      },
      floor(x, w, h) {
        x.fillStyle = '#5a3a22'; x.fillRect(0, 0, w, h);
        for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#5f3e25' : '#553620'; x.fillRect(0, i * 64, w, 64); x.fillStyle = '#3a2414'; x.fillRect(0, i * 64, w, 3); }
        x.strokeStyle = '#e8631c'; x.lineWidth = 18; x.beginPath(); x.arc(w / 2, h / 2, 380, 0, Math.PI * 2); x.stroke();
        x.strokeStyle = '#d4ae62'; x.lineWidth = 5; x.beginPath(); x.arc(w / 2, h / 2, 352, 0, Math.PI * 2); x.stroke();
        x.fillStyle = 'rgba(234,219,192,.18)'; x.font = 'bold 300px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('道', w / 2, h / 2 + 10);
      },
    },
    // sede principale: sala di legno, stendardo della scuola, pergamene, lanterne e rastrelliera delle armi
    lancenigo: {
      bg(x, w, h) {
        x.fillStyle = grad(x, h, [[0, '#24150d'], [0.55, '#5a3320'], [1, '#2a1810']]); x.fillRect(0, 0, w, h);
        x.fillStyle = '#1d110a';
        for (let i = 0; i <= 8; i++) x.fillRect(i * w / 8 - 9, 0, 18, h * 0.8);
        x.fillRect(0, h * 0.1, w, 14);
        for (let i = 0; i < 64; i++) { x.fillStyle = i % 2 ? '#43281a' : '#382012'; x.fillRect(i * 16, h * 0.8, 15, h * 0.2); }
        // stendardo della scuola al centro
        const bx = w / 2, by = h * 0.17, bw = 150, bh = h * 0.56;
        x.fillStyle = '#e8631c'; x.fillRect(bx - bw / 2, by, bw, bh);
        x.fillStyle = '#140f0c'; x.fillRect(bx - bw / 2 + 7, by + 7, bw - 14, bh - 14);
        templeLogo(x, bx, by + 110, 1.15, '#eadbc0');
        x.fillStyle = '#e8631c'; x.font = 'bold 21px "Arial Narrow",Impact,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('STONE TEMPLE', bx, by + 140); x.fillText('TAO', bx, by + 164);
        kanji(x, '太極拳', bx, by + 214, 30, '#eadbc0');
        // pergamene, lanterne, rastrelliera
        scroll(x, w * 0.36, h * 0.2, 54, 150, '道'); scroll(x, w * 0.64, h * 0.2, 54, 150, '武');
        lantern(x, w * 0.43, h * 0.32, 16); lantern(x, w * 0.57, h * 0.32, 16);
        x.fillStyle = '#5a3320'; x.fillRect(w * 0.72, h * 0.25, 120, 10); x.fillRect(w * 0.72, h * 0.62, 120, 10);
        for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#c9d3dd' : '#8a5a2b'; x.fillRect(w * 0.72 + 10 + i * 19, h * 0.2 - (i % 2) * 10, 5, h * 0.48); }
        lantern(x, w * 0.2, h * 0.3, 18); scroll(x, w * 0.12, h * 0.22, 54, 150, '拳');
      },
      floor(x, w, h) {
        // tatami a incastro rossi e neri
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
          x.fillStyle = (r + c) % 2 ? '#7a1f1a' : '#1f1a18'; x.fillRect(c * 128, r * 128, 128, 128);
          x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(c * 128, r * 128, 128, 3); x.fillRect(c * 128, r * 128, 3, 128);
        }
        x.strokeStyle = '#e8631c'; x.lineWidth = 16; x.beginPath(); x.arc(w / 2, h / 2, 390, 0, Math.PI * 2); x.stroke();
        x.globalAlpha = 0.22; templeLogo(x, w / 2, h / 2 + 120, 3.2, '#eadbc0'); x.globalAlpha = 1;
      },
    },
    // palestrina delle medie: muri chiari, spalliere, canestro, finestroni
    priula: {
      dim: 0.72,
      bg(x, w, h) {
        x.fillStyle = grad(x, h, [[0, '#bfb69a'], [0.6, '#ddd6bd'], [1, '#c9c1a6']]); x.fillRect(0, 0, w, h);
        x.fillStyle = '#4f7d63'; x.fillRect(0, h * 0.6, w, h * 0.22);
        x.fillStyle = '#3d644f'; x.fillRect(0, h * 0.6, w, 6);
        // finestroni in alto
        for (let i = 0; i < 7; i++) {
          const fx = 40 + i * 140;
          x.fillStyle = grad(x, h * 0.3, [[0, '#9cc8ec'], [1, '#e6f2fa']]); x.fillRect(fx, h * 0.06, 110, h * 0.2);
          x.strokeStyle = '#7f8a8f'; x.lineWidth = 5; x.strokeRect(fx, h * 0.06, 110, h * 0.2);
          x.beginPath(); x.moveTo(fx + 55, h * 0.06); x.lineTo(fx + 55, h * 0.26); x.moveTo(fx, h * 0.16); x.lineTo(fx + 110, h * 0.16); x.stroke();
        }
        // spalliere
        x.fillStyle = '#b07a3e';
        for (let c = 0; c < 3; c++) {
          const sx = w * 0.27 + c * 50;
          x.fillRect(sx, h * 0.3, 6, h * 0.52); x.fillRect(sx + 40, h * 0.3, 6, h * 0.52);
          for (let r = 0; r < 12; r++) x.fillRect(sx, h * 0.32 + r * 21, 46, 4);
        }
        // canestro al centro
        const cx = w * 0.53;
        x.fillStyle = '#6d7377'; x.fillRect(cx - 4, h * 0.42, 8, 40);
        x.fillStyle = '#fafafa'; x.fillRect(cx - 70, h * 0.3, 140, 86); x.strokeStyle = '#d8412f'; x.lineWidth = 5; x.strokeRect(cx - 70, h * 0.3, 140, 86); x.strokeRect(cx - 26, h * 0.38, 52, 36);
        x.strokeStyle = '#e8631c'; x.lineWidth = 6; x.beginPath(); x.ellipse(cx, h * 0.5, 30, 7, 0, 0, Math.PI * 2); x.stroke();
        x.strokeStyle = '#f2f2f2'; x.lineWidth = 2;
        for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(cx + i * 9, h * 0.505); x.lineTo(cx + i * 6, h * 0.58); x.stroke(); }
        // orologio e corda
        x.fillStyle = '#fafafa'; x.beginPath(); x.arc(w * 0.44, h * 0.38, 24, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#333'; x.lineWidth = 4; x.stroke();
        x.beginPath(); x.moveTo(w * 0.44, h * 0.38); x.lineTo(w * 0.44, h * 0.38 - 15); x.moveTo(w * 0.44, h * 0.38); x.lineTo(w * 0.44 + 11, h * 0.38 + 4); x.stroke();
        x.strokeStyle = '#c9a66b'; x.lineWidth = 7; x.beginPath(); x.moveTo(w * 0.66, 0); x.quadraticCurveTo(w * 0.665, h * 0.5, w * 0.66, h * 0.78); x.stroke();
        x.fillStyle = '#9a6a3a'; x.fillRect(0, h * 0.82, w, h * 0.18);
      },
      floor(x, w, h) {
        x.fillStyle = '#c08a50'; x.fillRect(0, 0, w, h);
        for (let r = 0; r < 32; r++) for (let c = 0; c < 5; c++) {
          const off = (r % 2) * 100;
          x.fillStyle = `hsl(32, 45%, ${46 + ((r * 7 + c * 13) % 9)}%)`; x.fillRect(c * 220 - off, r * 32, 218, 30);
        }
        x.lineWidth = 9;
        x.strokeStyle = '#d8412f'; x.beginPath(); x.arc(w / 2, h / 2, 230, 0, Math.PI * 2); x.stroke();
        x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke();
        x.strokeStyle = '#2a5aa8'; x.strokeRect(70, 70, w - 140, h - 140);
        x.strokeStyle = '#ffd24a'; x.beginPath(); x.arc(w / 2, 70, 300, 0, Math.PI); x.stroke();
      },
    },
    // palestra del Maestro Liming Yue: mattoni rossi, finestra ad arco con la pioggia inglese, stendardi
    liming: {
      bg(x, w, h) {
        x.fillStyle = '#4a2219'; x.fillRect(0, 0, w, h);
        const bricks = ['#8a3a2a', '#7a3324', '#93402e', '#823728'];
        for (let r = 0; r < 24; r++) for (let c = -1; c < 17; c++) {
          x.fillStyle = bricks[(r * 5 + c * 3) & 3]; x.fillRect(c * 64 + (r % 2) * 32 + 2, r * 22 + 2, 60, 18);
        }
        // finestrone ad arco al centro
        const cx = w / 2, top = h * 0.12, ww = 170, hh = h * 0.6;
        const arch = () => { x.beginPath(); x.moveTo(cx - ww / 2, top + hh); x.lineTo(cx - ww / 2, top + ww / 2); x.arc(cx, top + ww / 2, ww / 2, Math.PI, 0); x.lineTo(cx + ww / 2, top + hh); x.closePath(); };
        x.fillStyle = grad(x, h, [[0, '#6f7c88'], [0.5, '#a9b5bf'], [1, '#c9d1d8']]); arch(); x.fill();
        x.save(); arch(); x.clip();
        x.strokeStyle = 'rgba(230,240,250,.55)'; x.lineWidth = 2;
        for (let i = 0; i < 70; i++) { const rx = cx - ww / 2 + ((i * 37) % ww), ry = top + ((i * 53) % hh); x.beginPath(); x.moveTo(rx, ry); x.lineTo(rx - 6, ry + 18); x.stroke(); }
        x.fillStyle = '#4b5a50'; x.beginPath(); x.moveTo(cx - ww / 2, top + hh); for (let i = 0; i <= 10; i++) x.lineTo(cx - ww / 2 + i * ww / 10, top + hh - 30 - Math.sin(i * 1.7) * 14); x.lineTo(cx + ww / 2, top + hh); x.fill();
        x.restore();
        x.strokeStyle = '#f2efe6'; x.lineWidth = 8; arch(); x.stroke();
        x.lineWidth = 4; x.beginPath(); x.moveTo(cx, top); x.lineTo(cx, top + hh); x.moveTo(cx - ww / 2, top + hh * 0.55); x.lineTo(cx + ww / 2, top + hh * 0.55); x.stroke();
        // stendardi ai lati
        [[0.37, '陈式'], [0.63, '太极']].forEach(([k, t]) => {
          const sx = w * k; x.fillStyle = '#8f1f1f'; x.fillRect(sx - 30, h * 0.18, 60, h * 0.5);
          x.fillStyle = '#d4ae62'; x.fillRect(sx - 30, h * 0.18, 60, 6); x.fillRect(sx - 30, h * 0.68 - 6, 60, 6);
          kanji(x, t[0], sx, h * 0.33, 40, '#f5e27a'); kanji(x, t[1], sx, h * 0.5, 40, '#f5e27a');
        });
        // festoni bianchi, rossi e blu
        for (let i = 0; i < 24; i++) { x.fillStyle = ['#c8202a', '#f2efe6', '#1f3a8a'][i % 3]; x.beginPath(); x.moveTo(i * 44, 18); x.lineTo(i * 44 + 40, 18); x.lineTo(i * 44 + 20, 50); x.fill(); }
        x.fillStyle = '#3b2a1e'; x.fillRect(0, h * 0.8, w, h * 0.2);
        x.fillStyle = '#2b1e15'; for (let i = 0; i < 16; i++) x.fillRect(i * 64, h * 0.8, 3, h * 0.2);
      },
      floor(x, w, h) {
        x.fillStyle = '#5a3d27'; x.fillRect(0, 0, w, h);
        for (let r = 0; r < 20; r++) for (let c = 0; c < 20; c++) {
          x.save(); x.translate(c * 56 + (r % 2) * 28, r * 56); x.rotate((r + c) % 2 ? Math.PI / 4 : -Math.PI / 4);
          x.fillStyle = `hsl(25, 38%, ${24 + ((r * 3 + c * 5) % 7)}%)`; x.fillRect(-36, -9, 72, 18); x.restore();
        }
        x.strokeStyle = 'rgba(242,239,230,.7)'; x.lineWidth = 6; x.strokeRect(90, 90, w - 180, h - 180);
        x.beginPath(); x.moveTo(90, h / 2); x.lineTo(w - 90, h / 2); x.stroke();
        x.strokeStyle = '#c8202a'; x.beginPath(); x.arc(w / 2, h / 2, 150, 0, Math.PI * 2); x.stroke();
      },
    },
    // Chenjiagou: cielo, colline di loess, museo con il tetto a pagoda, statue, piazza con il taiji e gli otto trigrammi
    chenjiagou: {
      dim: 0.62,
      bg(x, w, h) {
        x.fillStyle = grad(x, h, [[0, '#6aa7d8'], [0.55, '#dfe9e8'], [1, '#d9d2c0']]); x.fillRect(0, 0, w, h);
        x.fillStyle = 'rgba(255,255,255,.7)';
        [[0.2, 0.12], [0.55, 0.08], [0.82, 0.16]].forEach(([a, b]) => { x.beginPath(); x.ellipse(w * a, h * b, 70, 16, 0, 0, Math.PI * 2); x.fill(); });
        const ridge = (y0, amp, col, seed) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, h); for (let i = 0; i <= 48; i++) x.lineTo(i / 48 * w, y0 - Math.abs(Math.sin(i * 0.5 + seed)) * amp); x.lineTo(w, h); x.fill(); };
        ridge(h * 0.5, 40, '#c9b48a', 1); ridge(h * 0.58, 26, '#a8916a', 4);
        // alberi
        x.fillStyle = '#3f6b3a';
        for (let i = 0; i < 14; i++) { const tx = i < 7 ? w * 0.04 + i * 50 : w * 0.67 + (i - 7) * 50; x.beginPath(); x.arc(tx, h * 0.6, 30 + (i % 3) * 6, 0, Math.PI * 2); x.fill(); }
        // museo
        const cx = w / 2, base = h * 0.72;
        x.fillStyle = '#c9c4b8'; x.fillRect(cx - 190, base, 380, 22);
        for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#bdb7aa' : '#d4cfc3'; x.fillRect(cx - 120 + i * 6, base + 22 + i * 8, 240 - i * 12, 8); }
        x.fillStyle = '#e9e1cf'; x.fillRect(cx - 150, base - 70, 300, 70);
        x.fillStyle = '#a3241c'; for (let i = 0; i < 7; i++) x.fillRect(cx - 140 + i * 45, base - 70, 12, 70);
        const roof = (y, half, lift, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(cx - half - 24, y - lift); x.quadraticCurveTo(cx - half + 10, y, cx - half * 0.6, y - 4); x.lineTo(cx, y - 52); x.lineTo(cx + half * 0.6, y - 4); x.quadraticCurveTo(cx + half - 10, y, cx + half + 24, y - lift); x.lineTo(cx + half - 20, y + 10); x.lineTo(cx - half + 20, y + 10); x.fill(); };
        roof(base - 70, 190, 22, '#4b5550');
        x.fillStyle = '#e9e1cf'; x.fillRect(cx - 90, base - 150, 180, 40);
        roof(base - 150, 120, 18, '#3e4844');
        x.fillStyle = '#d4ae62'; x.fillRect(cx - 40, base - 104, 80, 26); kanji(x, '太极', cx, base - 91, 20, '#8f1f1f');
        // statue nelle posizioni del taiji
        x.fillStyle = '#8d877c';
        [0.31, 0.38, 0.62, 0.69].forEach((k, i) => {
          const sx = w * k, sy = h * 0.8; x.fillRect(sx - 16, sy, 32, 12);
          x.beginPath(); x.arc(sx, sy - 52, 7, 0, Math.PI * 2); x.fill();
          x.fillRect(sx - 7, sy - 44, 14, 26);
          x.save(); x.translate(sx, sy - 38); x.rotate(i % 2 ? -0.5 : 0.4); x.fillRect(0, -3, 26, 6); x.restore();
          x.save(); x.translate(sx, sy - 38); x.rotate(Math.PI + (i % 2 ? 0.3 : -0.6)); x.fillRect(0, -3, 22, 6); x.restore();
          x.fillRect(sx - 12, sy - 18, 7, 18); x.fillRect(sx + 4, sy - 18, 7, 18);
        });
        x.fillStyle = '#b8b3a8'; x.fillRect(0, h * 0.82, w, h * 0.18);
      },
      floor(x, w, h) {
        x.fillStyle = '#aaa59b'; x.fillRect(0, 0, w, h);
        for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) { x.fillStyle = `hsl(40, 6%, ${60 + ((r * 5 + c * 3) % 6)}%)`; x.fillRect(c * 64 + 2, r * 64 + 2, 60, 60); }
        const cx = w / 2, cy = h / 2;
        x.fillStyle = '#7d3a2a'; x.beginPath(); x.arc(cx, cy, 352, 0, Math.PI * 2); x.fill();
        taiji(x, cx, cy, 336, '#1e1e1e', '#efe9dc');
        const TRI = [[1, 1, 1], [0, 1, 1], [1, 0, 1], [0, 0, 1], [1, 1, 0], [0, 1, 0], [1, 0, 0], [0, 0, 0]];
        TRI.forEach((b, i) => { const a = i / 8 * Math.PI * 2; trigram(x, b, cx + Math.cos(a) * 430, cy + Math.sin(a) * 430, a + Math.PI / 2, 34, '#3a3530'); });
      },
    },
  };

  const SCENES = {};
  function sceneTex(id) {
    const k = PAINT[id] ? id : 'tempio';
    if (!SCENES[k]) SCENES[k] = { bg: canvasTex(1024, 512, PAINT[k].bg), floor: canvasTex(1024, 1024, PAINT[k].floor), dim: PAINT[k].dim || 1 };
    return SCENES[k];
  }
  // immagine della palestra per la carta terreno (ritaglio centrale del fondale)
  const artCache = {};
  function terrainArt(id) {
    if (!artCache[id] && PAINT[id]) {
      const full = document.createElement('canvas'); full.width = 1024; full.height = 512;
      PAINT[id].bg(full.getContext('2d'), 1024, 512);
      const c = document.createElement('canvas'); c.width = 320; c.height = 240;
      c.getContext('2d').drawImage(full, 256, 40, 512, 384, 0, 0, 320, 240);
      artCache[id] = c.toDataURL('image/jpeg', 0.82);
    }
    return artCache[id] || '';
  }

  // ------------------------------------------------------------ armi in mano ai lottatori
  // Nel pugno l'asse -y prosegue l'avambraccio: lame e aste puntano lì.
  function weaponMesh(id) {
    const g = new T.Group();
    const steel = toon('#dfe7ef'), wood = toon('#8a5a2b'), gold = toon('#d4ae62'), red = toon('#c8202a');
    const box = (sx, sy, sz, m, y) => { const b = new T.Mesh(new T.BoxGeometry(sx, sy, sz), m); b.position.y = y; g.add(b); return b; };
    const pole = (len, r, m, y) => { const c = new T.Mesh(new T.CylinderGeometry(r, r, len, 8), m); c.position.y = y; g.add(c); return c; };
    const tip = (y, m) => { const c = new T.Mesh(new T.ConeGeometry(0.045, 0.2, 8), m); c.rotation.x = Math.PI; c.position.y = y; g.add(c); return c; };
    if (id === 'jian' || id === 'shuangjian') { box(0.032, 0.72, 0.012, steel, -0.46); box(0.13, 0.025, 0.045, gold, -0.09); box(0.03, 0.12, 0.03, red, 0.0); }
    else if (id === 'dao' || id === 'shuangdao') { const b = box(0.06, 0.6, 0.012, steel, -0.4); b.rotation.z = 0.12; box(0.1, 0.03, 0.08, gold, -0.09); const t = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), red); t.position.y = 0.06; g.add(t); }
    else if (id === 'qiang') { pole(1.7, 0.017, wood, -0.5); tip(-1.43, steel); const t = new T.Mesh(new T.SphereGeometry(0.06, 8, 6), red); t.position.y = -1.28; g.add(t); }
    else if (id === 'dadao') { pole(1.6, 0.02, wood, -0.45); const b = box(0.2, 0.42, 0.014, steel, -1.3); b.position.x = 0.07; b.rotation.z = -0.1; box(0.06, 0.06, 0.06, gold, -1.08); }
    else if (id === 'qimeigun') { pole(1.3, 0.022, wood, -0.35); }
    else if (id === 'dagan') { pole(2.3, 0.026, wood, -0.65); }
    return g;
  }
  function equip(ch, id) {
    if (!id) return;
    ch.J.rf.add(weaponMesh(id));
    if (id === 'shuangjian' || id === 'shuangdao') ch.J.lf.add(weaponMesh(id));
  }

  // ------------------------------------------------------------ scena
  function init() {
    if (ready) return true;
    try {
      overlay = document.createElement('div');
      overlay.className = 'arena3d';
      overlay.innerHTML = '<div class="arena-title"><div class="arena-who"></div><div class="arena-move"></div></div><div class="arena-flash"></div><div class="arena-skip">Tocca per saltare</div><div class="arena-speed"></div>';
      overlay.hidden = true;
      document.body.appendChild(overlay);
      titleEl = overlay.querySelector('.arena-move');
      subEl = overlay.querySelector('.arena-who');
      flashEl = overlay.querySelector('.arena-flash');
      ctrlEl = overlay.querySelector('.arena-speed');
      overlay.addEventListener('click', e => { if (!e.target.closest('[data-act]')) skip(); });

      renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      overlay.insertBefore(renderer.domElement, overlay.firstChild);

      scene = new T.Scene();
      scene.background = new T.Color('#1b120d');
      scene.fog = new T.Fog('#1b120d', 12, 30);
      camera = new T.PerspectiveCamera(42, 1, 0.1, 100);
      clock = new T.Clock();

      toonGrad = new T.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, T.LuminanceFormat);
      toonGrad.minFilter = toonGrad.magFilter = T.NearestFilter;
      toonGrad.needsUpdate = true;

      scene.add(new T.HemisphereLight('#ffe8d0', '#3a2418', 0.8));
      const sun = new T.DirectionalLight('#fff0dc', 1.05); sun.position.set(-3, 8, 7);
      sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0008;
      Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 25 });
      scene.add(sun);
      const rim = new T.DirectionalLight('#e8631c', 0.9); rim.position.set(3, 4, -8); scene.add(rim);
      const fill = new T.DirectionalLight('#9fc4ff', 0.25); fill.position.set(4, 2, 6); scene.add(fill);

      // fondale e pavimento: cambiano con la palestra (carta terreno)
      const sc = sceneTex(null);
      back = new T.Mesh(new T.PlaneGeometry(40, 20), new T.MeshBasicMaterial({ map: sc.bg, fog: false }));
      back.position.set(0, 5, -14); scene.add(back);
      ground = new T.Mesh(new T.PlaneGeometry(12, 12), new T.MeshLambertMaterial({ map: sc.floor }));
      ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

      root = new T.Group(); scene.add(root);
      window.addEventListener('resize', resize);
      ready = true;
      return true;
    } catch (e) {
      failed = true;
      if (overlay) overlay.remove();
      return false;
    }
  }

  function resize() {
    if (!renderer || overlay.hidden) return;
    const w = overlay.clientWidth, h = overlay.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h;
    // in verticale allontana la camera per far stare tutti nell'inquadratura
    const narrow = Math.min(1, camera.aspect / 0.75); // 1 = abbastanza largo, meno = telefono in verticale
    camera.fov = 44;
    camBase = new T.Vector3(0, 2.9, 5.8 + (1 - narrow) * 3.6);
    camLook = new T.Vector3(0.05, 1.0, -0.4);
    camera.position.copy(camBase); camera.lookAt(camLook);
    camera.updateProjectionMatrix();
  }

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    let dt = Math.min(0.05, clock.getDelta()) * speed * (skipping ? 12 : 1);
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt;
      const p = Math.min(1, tw.t / tw.dur);
      tw.fn(tw.e(p), p);
      if (p >= 1) { tweens.splice(i, 1); tw.res(); }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.life += dt;
      const k = q.life / q.max;
      if (k >= 1) { q.obj.parent && q.obj.parent.remove(q.obj); parts.splice(i, 1); continue; }
      q.v.y -= (q.g || 0) * dt;
      q.obj.position.addScaledVector(q.v, dt);
      if (q.spin) { q.obj.rotation.x += q.spin * dt; q.obj.rotation.y += q.spin * dt; }
      if (q.obj.material) q.obj.material.opacity = (q.o || 1) * (1 - k);
      if (q.grow) q.obj.scale.multiplyScalar(1 + q.grow * dt);
    }
    for (const u of updaters) u(dt);
    if (shakeT > 0) {
      shakeT -= dt;
      camera.position.set(camBase.x + (Math.random() - .5) * shakeAmp, camBase.y + (Math.random() - .5) * shakeAmp, camBase.z);
    } else if (camBase) camera.position.copy(camBase);
    renderer.render(scene, camera);
  }

  // ------------------------------------------------------------ lottatore 3D
  const POSE0 = { hy: 0, hz: 0, ty: 0, tz: 0, hd: 0, ls: 0, lsx: 0, le: 0, rs: 0, rsx: 0, re: 0, lh: 0, lk: 0, rh: 0, rk: 0 };
  const P = {
    guard: { hy: -0.08, tz: -0.06, ls: 1.1, le: 1.0, rs: 0.35, re: 1.9, lh: 0.4, lk: -0.55, rh: -0.35, rk: -0.35 },
    punchWind: { hy: -0.1, ty: 0.35, tz: 0.05, ls: 1.2, le: 1.1, rs: -0.3, re: 2.1, lh: 0.45, lk: -0.6, rh: -0.4, rk: -0.3 },
    punch: { hy: -0.12, ty: -0.45, tz: -0.25, ls: 0.2, le: 1.9, rs: 1.6, re: 0.02, lh: 0.6, lk: -0.5, rh: -0.55, rk: -0.1 },
    kickWind: { hy: -0.02, tz: 0.15, ls: 0.9, le: 1.3, rs: 0.3, re: 1.9, lh: 1.2, lk: -1.9, rh: -0.1, rk: -0.2 },
    kick: { hy: 0.06, tz: 0.45, ls: 0.4, le: 1.4, rs: -0.4, re: 1.2, lh: 1.65, lk: -0.02, rh: -0.15, rk: -0.1 },
    palmWind: { hy: -0.1, tz: 0.15, ls: -0.4, le: 1.6, rs: -0.4, re: 1.6, lh: 0.4, lk: -0.6, rh: -0.4, rk: -0.3 },
    palm: { hy: -0.16, tz: -0.25, ls: 1.5, le: 0.05, rs: 1.45, re: 0.05, lh: 0.7, lk: -0.5, rh: -0.6, rk: -0.1 },
    run1: { hy: -0.04, tz: -0.5, ls: -0.8, le: 1.2, rs: 0.9, re: 1.3, lh: 0.9, lk: -0.4, rh: -0.6, rk: -1.2 },
    run2: { hy: -0.04, tz: -0.5, ls: 0.9, le: 1.3, rs: -0.8, re: 1.2, lh: -0.6, lk: -1.2, rh: 0.9, rk: -0.4 },
    shoulder: { hy: -0.15, tz: -0.75, ty: 0.6, ls: -0.2, le: 1.5, rs: 0.3, re: 1.8, lh: 0.8, lk: -0.4, rh: -0.7, rk: -0.2 },
    castWind: { hy: -0.05, tz: 0.25, ls: -1.2, le: 0.6, rs: -1.2, re: 0.6, lh: 0.3, lk: -0.3, rh: -0.3, rk: -0.2 },
    cast: { hy: -0.12, tz: -0.2, ls: 1.55, le: 0, rs: 1.5, re: 0, lh: 0.55, lk: -0.5, rh: -0.5, rk: -0.1 },
    point: { hy: -0.04, tz: -0.08, ls: 0.3, le: 1.5, lsx: -0.5, rs: 1.6, re: 0, hd: 0.1, lh: 0.25, lk: -0.2, rh: -0.25, rk: -0.1 },
    shoutWind: { hy: -0.1, tz: 0.3, hd: -0.2, ls: 0.6, le: 1.8, rs: 0.6, re: 1.8, lh: 0.3, lk: -0.4, rh: -0.3, rk: -0.3 },
    shout: { hy: -0.12, tz: -0.35, hd: 0.3, ls: -0.7, le: 0.3, rs: -0.7, re: 0.3, lsx: -0.5, rsx: 0.5, lh: 0.5, lk: -0.4, rh: -0.5, rk: -0.2 },
    throwWind: { hy: -0.05, tz: 0.35, ty: 0.4, ls: 0.8, le: 0.4, rs: 3.0, re: 0.9, lh: 0.4, lk: -0.3, rh: -0.3, rk: -0.3 },
    throw: { hy: -0.12, tz: -0.35, ty: -0.4, ls: 0.1, le: 1.0, rs: 1.2, re: 0.05, lh: 0.6, lk: -0.5, rh: -0.5, rk: -0.1 },
    power: { hy: -0.26, tz: 0.05, lsx: -1.4, ls: 0, le: 0, rsx: 1.4, rs: 0, re: 0, lh: 0.5, lk: -1.0, rh: -0.5, rk: -1.0 },
    flex: { hy: -0.22, hd: 0.25, lsx: -1.45, rsx: 1.45, ls: 0.1, le: 0, rs: 0.1, re: 0, lh: 0.45, lk: -0.9, rh: -0.45, rk: -0.9 },
    meditate: { hy: -0.3, ls: 1.0, le: 1.55, rs: 1.0, re: 1.55, lsx: -0.2, rsx: 0.2, lh: 0.35, lk: -1.1, rh: -0.35, rk: -1.1 },
    stomp: { hy: 0.04, tz: 0.1, ls: 0.3, le: 1.2, rs: 0.3, re: 1.2, lh: 1.4, lk: -1.6, rh: 0, rk: -0.1 },
    hit: { hy: -0.05, tz: 0.5, hd: -0.4, ls: -0.5, le: 0.8, rs: -0.6, re: 0.9, lh: 0.2, lk: -0.3, rh: -0.3, rk: -0.2 },
    ko: { hy: -0.62, tz: 1.45, hd: -0.3, ls: 2.4, le: 0.3, rs: 2.2, re: 0.4, lh: 1.3, lk: -0.2, rh: 1.1, rk: -0.6 },
    dizzy: { hy: -0.1, tz: 0.15, hd: 0.3, ls: 0.4, le: 0.6, rs: 0.3, re: 0.5, lh: 0.2, lk: -0.3, rh: -0.3, rk: -0.2 },
    win: { hy: 0, hd: 0.2, ls: 0.3, le: 1.8, rs: 3.0, re: 0.2, lh: 0.1, lk: -0.1, rh: -0.1, rk: -0.1 },
  };
  function pose(name) { return Object.assign({}, POSE0, P[name]); }

  // stoffa, pelle e scarpe con materiali "fisici": luci e ombre più naturali del cartone animato
  function cloth(color, rough) { return new T.MeshStandardMaterial({ color, roughness: rough === undefined ? 0.82 : rough, metalness: 0 }); }
  const lathe = (pts, seg) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), seg || 22);

  function fighter(d) {
    const look = LOOK[d.card] || ['#444', '#e8631c'];
    const g = new T.Group();
    const gi = cloth(look[0]);
    const pants = cloth(new T.Color(look[0]).multiplyScalar(0.72));
    const trim = cloth(look[1], 0.6);
    const face = faceTex(d.card);
    const skin = cloth(face.skin, 0.55);
    const hairM = cloth(face.hair, 0.9);
    (face.onLoad = face.onLoad || []).push(f => { skin.color.set(f.skin); hairM.color.set(f.hair); });
    const belt = cloth(BELT[d.rank] || BELT.A, 0.7);
    const shoe = cloth('#16110e', 0.55), sole = cloth('#efe9dc', 0.9);
    const mesh = (gm, m) => new T.Mesh(gm, m);
    const cyl = (r1, r2, h, m) => mesh(new T.CylinderGeometry(r1, r2, h, 18), m);
    const ball = (r, m) => mesh(new T.SphereGeometry(r, 20, 14), m);
    const J = {};

    const hips = new T.Group(); hips.position.y = 0.8; g.add(hips); J.hips = hips;
    const pelvis = ball(0.19, pants); pelvis.scale.set(0.8, 0.62, 1); hips.add(pelvis);
    const torso = new T.Group(); torso.position.y = 0.04; hips.add(torso); J.torso = torso;
    // busto a V (vita stretta, spalle larghe); il davanti è verso +x, le spalle sull'asse z
    const chest = mesh(lathe([[0.165, 0], [0.175, 0.08], [0.195, 0.2], [0.23, 0.36], [0.245, 0.45], [0.215, 0.52], [0.13, 0.565], [0.05, 0.58]]), gi);
    chest.scale.x = 0.7; torso.add(chest);
    // giacca da kung fu: colletto alla coreana, chiusura centrale e alamari
    const collar = cyl(0.085, 0.098, 0.075, trim); collar.position.y = 0.6; torso.add(collar);
    const placket = mesh(new T.BoxGeometry(0.02, 0.44, 0.024), trim); placket.position.set(0.158, 0.3, 0); placket.rotation.z = -0.1; torso.add(placket);
    for (let i = 0; i < 4; i++) {
      const fr = cyl(0.011, 0.011, 0.075, trim); fr.rotation.x = Math.PI / 2;
      fr.position.set(0.166 + i * 0.006, 0.2 + i * 0.085, 0); torso.add(fr);
    }
    // fascia in vita con le code che ondeggiano
    const sash = cyl(0.19, 0.185, 0.075, belt); sash.scale.x = 0.74; sash.position.y = 0.035; torso.add(sash);
    const knot = ball(0.035, belt); knot.position.set(0.12, 0.03, 0.1); torso.add(knot);
    const tails = new T.Group(); tails.position.set(0.12, 0.02, 0.11); torso.add(tails); J.sash = tails;
    [-0.18, 0.12].forEach((a, i) => { const tl = mesh(new T.BoxGeometry(0.045, 0.22 - i * 0.04, 0.012), belt); tl.position.y = -0.1 + i * 0.02; tl.rotation.z = a; tails.add(tl); });
    const neck = new T.Group(); neck.position.y = 0.58; torso.add(neck); J.neck = neck;
    const nk = cyl(0.058, 0.07, 0.12, skin); nk.position.y = 0.04; neck.add(nk);
    // testa 3D: cranio a uovo color pelle, volto della carta davanti, calotta di capelli e orecchie
    const head = new T.Group(); head.position.y = 0.28; head.scale.set(0.92, 1.08, 0.9); neck.add(head); J.head = head;
    head.add(mesh(new T.SphereGeometry(HEAD_R, 32, 24), skin));
    const fs = mesh(faceGeo(), new T.MeshStandardMaterial({ map: face.tex, emissiveMap: face.tex, emissive: '#ffffff', emissiveIntensity: 0.3, roughness: 0.6, transparent: true, depthWrite: false }));
    fs.renderOrder = 2; head.add(fs); J.face = fs;
    const cap = mesh(new T.SphereGeometry(HEAD_R * 1.05, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), hairM);
    cap.rotation.z = 0.62; head.add(cap);
    [1, -1].forEach(sd => { const ear = ball(HEAD_R * 0.2, skin); ear.scale.set(0.5, 1, 0.55); ear.position.set(-0.01, -0.01, sd * HEAD_R * 0.97); head.add(ear); });

    const arm = (side) => {
      const sh = new T.Group(); sh.position.set(0, 0.47, side * 0.25); torso.add(sh);
      sh.add(ball(0.088, gi));
      const up = cyl(0.082, 0.07, 0.3, gi); up.position.y = -0.14; sh.add(up);
      const el = new T.Group(); el.position.y = -0.3; sh.add(el);
      el.add(ball(0.07, gi));
      // manica larga che si apre verso il polso, con il bordo colorato
      const fa = cyl(0.066, 0.09, 0.24, gi); fa.position.y = -0.12; el.add(fa);
      const cuff = cyl(0.092, 0.092, 0.035, trim); cuff.position.y = -0.245; el.add(cuff);
      const wr = cyl(0.04, 0.042, 0.06, skin); wr.position.y = -0.27; el.add(wr);
      const fist = ball(0.068, skin); fist.scale.set(1, 1.15, 0.85); fist.position.y = -0.315; el.add(fist);
      return [sh, el, fist];
    };
    [J.ls, J.le, J.lf] = arm(1);
    [J.rs, J.re, J.rf] = arm(-1);
    const leg = (side) => {
      const hp = new T.Group(); hp.position.set(0, -0.06, side * 0.105); hips.add(hp);
      hp.add(ball(0.1, pants));
      const th = cyl(0.1, 0.084, 0.38, pants); th.position.y = -0.19; hp.add(th);
      const kn = new T.Group(); kn.position.y = -0.38; hp.add(kn);
      kn.add(ball(0.083, pants));
      // pantalone largo stretto alla caviglia, scarpa da kung fu con la suola bianca
      const sn = cyl(0.08, 0.094, 0.27, pants); sn.position.y = -0.14; kn.add(sn);
      const an = cyl(0.062, 0.066, 0.05, pants); an.position.y = -0.3; kn.add(an);
      const ft = new T.Group(); ft.position.set(0.04, -0.345, 0); kn.add(ft);
      const up = ball(0.07, shoe); up.scale.set(1.75, 0.62, 0.92); ft.add(up);
      const so = mesh(new T.BoxGeometry(0.235, 0.022, 0.12), sole); so.position.y = -0.03; ft.add(so);
      return [hp, kn, ft];
    };
    [J.lh, J.lk, J.lft] = leg(1);
    [J.rh, J.rk, J.rft] = leg(-1);

    // tutto il corpo proietta ombre vere; resta anche l'ombra morbida di contatto ai piedi
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const shadow = new T.Mesh(new T.CircleGeometry(0.42, 24), new T.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.3, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03; g.add(shadow);

    const ch = { d, g, J, pose: pose('guard'), mats: [gi, pants, trim, skin, belt, shoe], body: [chest, pelvis], idle: true, t: Math.random() * 6, face: fs, facing: 0 };
    ch.apply = () => applyPose(ch);
    applyPose(ch);
    return ch;
  }

  function applyPose(ch) {
    const p = ch.pose, J = ch.J;
    const b = ch.idle ? Math.sin(ch.t * 3) * 0.018 : 0;
    J.hips.position.y = 0.8 + p.hy + b;
    J.hips.rotation.z = p.hz;
    J.torso.rotation.set(0, p.ty, p.tz + b * 0.8);
    J.neck.rotation.z = p.hd;
    J.ls.rotation.set(p.lsx, 0, p.ls + b * 2); J.le.rotation.z = p.le;
    J.rs.rotation.set(p.rsx, 0, p.rs - b * 2); J.re.rotation.z = p.re;
    J.lh.rotation.z = p.lh; J.lk.rotation.z = p.lk;
    J.rh.rotation.z = p.rh; J.rk.rotation.z = p.rk;
    if (J.sash) J.sash.rotation.z = Math.sin(ch.t * 2.3) * 0.12 - p.tz * 0.6;
  }

  function toPose(ch, name, dur, e) {
    const from = Object.assign({}, ch.pose), to = typeof name === 'string' ? pose(name) : name;
    return tween(dur, t => { for (const k in to) ch.pose[k] = lerp(from[k], to[k], t); }, e || ease.io);
  }
  function moveTo(ch, x, z, dur, e, hop) {
    const x0 = ch.g.position.x, z0 = ch.g.position.z;
    return tween(dur, (t, raw) => {
      ch.g.position.x = lerp(x0, x, t); ch.g.position.z = lerp(z0, z, t);
      ch.g.position.y = hop ? Math.sin(raw * Math.PI) * hop : 0;
    }, e || ease.io);
  }
  function face(ch, x, z) { ch.facing = Math.atan2(-(z - ch.g.position.z), x - ch.g.position.x); ch.g.rotation.y = ch.facing; }
  function flashChar(ch, color) {
    const col = new T.Color(color);
    ch.mats.forEach(m => m.emissive && m.emissive.copy(col));
    ch.face.material.color.set(color);
    return tween(0.35, t => {
      ch.mats.forEach(m => m.emissive && m.emissive.copy(col).multiplyScalar(1 - t));
      ch.face.material.color.copy(col).lerp(new T.Color('#ffffff'), t);
    }, ease.lin);
  }
  function headPos(ch) { const v = new T.Vector3(); ch.face.getWorldPosition(v); return v; }
  function chestPos(ch) { const v = headPos(ch); v.y -= 0.55; return v; }
  function handPos(ch) { const v = new T.Vector3(); ch.J.rf.getWorldPosition(v); return v; }

  // ------------------------------------------------------------ effetti
  const geoCache = {}, shared = new Set();
  function geo(k, f) { if (!geoCache[k]) { geoCache[k] = f(); shared.add(geoCache[k]); } return geoCache[k]; }
  function burst(pos, color, n, spd, size) {
    for (let i = 0; i < n; i++) {
      const m = new T.Mesh(geo('oct', () => new T.OctahedronGeometry(1, 0)), new T.MeshBasicMaterial({ color, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      const s = (size || 0.06) * (0.6 + Math.random() * 0.8);
      m.scale.setScalar(s); m.position.copy(pos);
      const v = new T.Vector3(Math.random() - .5, Math.random() - .2, Math.random() - .5).normalize().multiplyScalar((spd || 3) * (0.4 + Math.random()));
      root.add(m);
      parts.push({ obj: m, v, life: 0, max: 0.45 + Math.random() * 0.35, g: 5, spin: 8 });
    }
  }
  function rise(pos, color, n, radius) {
    for (let i = 0; i < n; i++) {
      const m = new T.Mesh(geo('oct', () => new T.OctahedronGeometry(1, 0)), new T.MeshBasicMaterial({ color, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      m.scale.setScalar(0.035 + Math.random() * 0.04);
      const a = Math.random() * Math.PI * 2, r = (radius || 0.5) * (0.5 + Math.random() * 0.5);
      m.position.set(pos.x + Math.cos(a) * r, pos.y + Math.random() * 0.4, pos.z + Math.sin(a) * r);
      root.add(m);
      parts.push({ obj: m, v: new T.Vector3(0, 1.2 + Math.random() * 1.4, 0), life: 0, max: 0.7 + Math.random() * 0.5, spin: 4 });
    }
  }
  function pop(pos, tex, size, dur, dy) {
    const s = sprite(tex, size);
    s.position.copy(pos); root.add(s);
    const y0 = pos.y;
    return tween(dur || 1, (t, raw) => {
      const k = raw < 0.2 ? ease.back(raw / 0.2) : 1;
      s.scale.set(size * k * (tex.image.width / tex.image.height), size * k, 1);
      s.position.y = y0 + (dy === undefined ? 0.6 : dy) * raw;
      s.material.opacity = raw > 0.7 ? 1 - (raw - 0.7) / 0.3 : 1;
    }, ease.lin).then(() => root.remove(s));
  }
  function ring(pos, color, to, dur, flat, lookAt) {
    const m = new T.Mesh(geo('ring', () => new T.RingGeometry(0.85, 1, 48)), new T.MeshBasicMaterial({ color, transparent: true, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
    m.position.copy(pos);
    if (flat) m.rotation.x = -Math.PI / 2; else if (lookAt) m.lookAt(lookAt); else m.lookAt(camera.position);
    root.add(m);
    return tween(dur, t => { m.scale.setScalar(0.1 + to * t); m.material.opacity = 1 - t; }, ease.out).then(() => root.remove(m));
  }
  function orb(from, to, color, e, dur, arc) {
    const grp = new T.Group();
    const core = new T.Mesh(geo('orb', () => new T.SphereGeometry(0.16, 16, 12)), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: T.AdditiveBlending }));
    grp.add(core);
    let es = null;
    if (e) { es = sprite(emojiTex(e), 0.42); grp.add(es); }
    grp.position.copy(from); root.add(grp);
    return tween(dur || 0.45, (t) => {
      grp.position.lerpVectors(from, to, t);
      grp.position.y += Math.sin(t * Math.PI) * (arc || 0.3);
      core.scale.setScalar(0.8 + Math.sin(t * 20) * 0.15);
      if (Math.random() < 0.6) burst(grp.position, color, 1, 0.5, 0.035);
    }, ease.in).then(() => root.remove(grp));
  }
  function lob(from, to, e, dur, height) {
    const s = sprite(emojiTex(e), 0.55);
    s.position.copy(from); root.add(s);
    return tween(dur || 0.6, (t) => {
      s.position.lerpVectors(from, to, t);
      s.position.y += Math.sin(t * Math.PI) * (height || 1.2);
      s.material.rotation = t * 8;
    }, ease.lin).then(() => root.remove(s));
  }
  function lightning(a, b, color, dur) {
    const mat = new T.LineBasicMaterial({ color, transparent: true });
    const geoL = new T.BufferGeometry();
    const line = new T.Line(geoL, mat); root.add(line);
    const upd = () => {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const p = new T.Vector3().lerpVectors(a, b, i / 10);
        if (i && i < 10) p.add(new T.Vector3((Math.random() - .5) * .3, (Math.random() - .5) * .3, (Math.random() - .5) * .3));
        pts.push(p);
      }
      geoL.setFromPoints(pts);
    };
    return tween(dur || 0.4, t => { upd(); mat.opacity = 1 - t; }, ease.lin).then(() => { root.remove(line); geoL.dispose(); });
  }
  function screenFlash(color, strength) {
    flashEl.style.background = color;
    return tween(0.35, t => { flashEl.style.opacity = String((strength || 0.8) * (1 - t)); }, ease.out);
  }
  function shake(amp, dur) { shakeAmp = amp; shakeT = dur; }
  function orbit(ch, e, n, radius, dur) {
    const ss = [];
    for (let i = 0; i < n; i++) { const s = sprite(emojiTex(e), 0.22); root.add(s); ss.push(s); }
    let t = 0;
    const u = (dt) => {
      t += dt; const h = headPos(ch);
      ss.forEach((s, i) => { const a = t * 5 + i * Math.PI * 2 / n; s.position.set(h.x + Math.cos(a) * radius, h.y + 0.42 + Math.sin(t * 7 + i) * 0.04, h.z + Math.sin(a) * radius); });
    };
    updaters.push(u);
    return wait(dur).then(() => { updaters.splice(updaters.indexOf(u), 1); ss.forEach(s => root.remove(s)); });
  }
  function aura(ch, color, dur) {
    const light = new T.PointLight(color, 2.2, 3);
    const p = ch.g.position;
    light.position.set(p.x, 1.2, p.z + 0.3); root.add(light);
    const u = () => rise(new T.Vector3(p.x, 0.15, p.z), color, 2, 0.45);
    updaters.push(u);
    ring(new T.Vector3(p.x, 0.03, p.z), color, 1.4, 0.8, true);
    return tween(dur, t => { light.intensity = 2.2 * Math.sin(t * Math.PI); }, ease.lin).then(() => { updaters.splice(updaters.indexOf(u), 1); root.remove(light); });
  }
  function numberPop(ch, text, color, size) { return pop(headPos(ch).add(new T.Vector3(0, 0.35, 0)), textTex(text, color), size || 0.5, 1.1, 0.7); }

  // mini lottatori (Dominio dell'Infante)
  function kid(from, emoji) {
    const g = new T.Group();
    const body = new T.Mesh(geo('kidb', () => new T.CylinderGeometry(0.1, 0.12, 0.3, 8)), toon('#6b8f5a'));
    body.position.y = 0.2; g.add(body);
    const s = sprite(emojiTex(emoji || '🧟'), 0.38); s.position.y = 0.48; g.add(s);
    g.position.copy(from); root.add(g);
    return g;
  }

  // ------------------------------------------------------------ ologrammi (stile Yu-Gi-Oh)
  // Ogni lottatore sta sulla propria carta, appoggiata sul tatami, e si materializza da lì.
  const HOLO = '#7fe8ff';
  const RANK_GLOW = { M: '#d4ae62', I: '#6fb3e6', A: '#8fe0b5', L: '#b04cff' };
  function cardTex(card) {
    const k = 'c:' + card;
    if (!texCache[k]) {
      const cbs = [];
      const t = new T.TextureLoader().load(window.STT.img(`${card}.jpg`), () => cbs.forEach(f => f()));
      t.minFilter = T.LinearFilter; t.generateMipmaps = false;
      t.onReady = f => { if (t.image && t.image.width) f(); else cbs.push(f); };
      texCache[k] = t;
    }
    return texCache[k];
  }
  const cardAspect = t => (t.image && t.image.width ? t.image.height / t.image.width : 1.4);
  function holoTex() {
    if (!texCache.holo) texCache.holo = canvasTex(4, 128, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
      x.fillStyle = gr; x.fillRect(0, 0, w, h);
    });
    return texCache.holo;
  }
  const plane = () => geo('plane', () => new T.PlaneGeometry(1, 1));
  const addMat = (color, extra) => new T.MeshBasicMaterial(Object.assign({ color, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }, extra || {}));

  function cardPad(ch, width, lift) {
    const p = ch.g.position;
    const grp = new T.Group(); grp.position.set(p.x, lift, p.z);
    const tex = cardTex(ch.d.card);
    const card = new T.Mesh(plane(), new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0 }));
    const glow = new T.Mesh(plane(), addMat(RANK_GLOW[ch.d.rank] || HOLO, { opacity: 0 }));
    card.rotation.x = glow.rotation.x = -Math.PI / 2;
    card.position.y = 0.022; glow.position.y = 0.018;
    // finché l'immagine non è arrivata la carta resta invisibile (altrimenti sarebbe un rettangolo bianco)
    card.visible = false;
    const size = () => { const a = cardAspect(tex); card.scale.set(width, width * a, 1); glow.scale.set(width + 0.12, width * a + 0.12, 1); card.visible = !!(tex.image && tex.image.width); };
    size(); tex.onReady(size);
    grp.add(glow, card); root.add(grp);
    ch.pad = { grp, card, glow, base: glow.material.color.clone() };
  }

  // tinta olografica: 1 = tutto azzurro e trasparente, 0 = normale
  function holo(ch, k) {
    const c = new T.Color(HOLO);
    ch.mats.forEach(m => { m.emissive.copy(c).multiplyScalar(0.9 * k); m.transparent = k > 0; m.opacity = 1 - 0.55 * k; });
    ch.face.material.color.set('#ffffff').lerp(c, k);
    ch.face.material.opacity = 1 - 0.4 * k;
  }

  async function summon(ch, delay) {
    const { grp, card, glow } = ch.pad;
    const x = ch.g.position.x, z = ch.g.position.z;
    ch.g.scale.set(0.5, 0.01, 0.5); holo(ch, 1);
    await wait(delay);
    // la carta cala sul tatami
    await tween(0.12, t => { card.material.opacity = t; glow.material.opacity = 0.9 * t; grp.scale.setScalar(1.4 - 0.4 * t); }, ease.out);
    ring(new T.Vector3(x, 0.05, z), HOLO, 1.1, 0.4, true);
    // fascio di luce e ologramma che sale dalla carta
    const beam = new T.Mesh(geo('beam', () => new T.CylinderGeometry(0.36, 0.44, 2.3, 24, 1, true)), addMat(HOLO, { map: holoTex(), opacity: 0 }));
    beam.position.set(x, 1.15, z); root.add(beam);
    const scan = new T.Mesh(geo('ring', () => new T.RingGeometry(0.85, 1, 48)), addMat(HOLO));
    scan.rotation.x = -Math.PI / 2; scan.scale.setScalar(0.5); root.add(scan);
    await tween(0.34, (t, raw) => {
      beam.material.opacity = 0.55 * Math.sin(raw * Math.PI);
      ch.g.scale.set(lerp(0.5, 1, t), lerp(0.01, 1, t), lerp(0.5, 1, t));
      scan.position.set(x, 1.9 * raw, z); scan.material.opacity = 1 - raw * 0.7;
      holo(ch, 1 - raw);
    }, ease.out);
    root.remove(beam); root.remove(scan); beam.material.dispose(); scan.material.dispose();
    ch.g.scale.set(1, 1, 1); holo(ch, 0);
    glow.material.opacity = 0.35;
  }

  // mossa speciale: la carta si alza dal tatami e si attiva, come una carta magia
  async function activate(ch, color) {
    const tex = cardTex(ch.d.card), a = cardAspect(tex), W = 0.62;
    const grp = new T.Group();
    const frame = new T.Mesh(plane(), addMat(color));
    frame.scale.set(W + 0.12, W * a + 0.12, 1); frame.position.z = -0.01;
    const face = new T.Mesh(plane(), new T.MeshBasicMaterial({ map: tex, transparent: true, side: T.DoubleSide, depthWrite: false }));
    face.scale.set(W, W * a, 1); face.visible = !!(tex.image && tex.image.width);
    grp.add(frame, face); root.add(grp);
    const base = ch.pad.grp.position;
    const from = new T.Vector3(base.x, 0.05, base.z), to = new T.Vector3(base.x - 0.65, 1.6, base.z - 0.7);
    grp.position.copy(to); grp.lookAt(camera.position);
    const qTo = grp.quaternion.clone(), qFrom = new T.Quaternion().setFromEuler(new T.Euler(-Math.PI / 2, 0, 0));
    sfx('magic');
    await tween(0.3, t => { grp.position.lerpVectors(from, to, t); grp.quaternion.copy(qFrom).slerp(qTo, t); grp.scale.setScalar(lerp(0.6, 1, t)); }, ease.out);
    screenFlash(color, 0.35);
    ring(grp.position.clone(), color, 1.4, 0.45, false, camera.position);
    await tween(0.22, t => { frame.material.opacity = 0.6 + 0.4 * Math.sin(t * Math.PI * 4); }, ease.lin);
    // la carta si dissolve in scintille mentre parte la mossa
    burst(grp.position, color, 16, 2.4);
    tween(0.2, t => { grp.scale.setScalar(1 + t * 0.3); face.material.opacity = frame.material.opacity = 1 - t; }, ease.in)
      .then(() => { root.remove(grp); face.material.dispose(); frame.material.dispose(); });
  }

  function padFlash(ch, color) {
    if (!ch.pad) return;
    const m = ch.pad.glow.material, c = new T.Color(color);
    tween(0.45, t => { m.color.copy(c).lerp(ch.pad.base, t); m.opacity = lerp(0.95, 0.35, t); }, ease.out);
  }
  function padOff(ch) {
    if (!ch.pad) return;
    const { card, glow, grp } = ch.pad;
    burst(new T.Vector3(grp.position.x, 0.1, grp.position.z), RANK_GLOW[ch.d.rank] || HOLO, 14, 2);
    tween(0.5, t => { card.material.color.setScalar(1 - 0.65 * t); card.material.opacity = 1 - 0.5 * t; glow.material.opacity = 0.35 * (1 - t); }, ease.out);
  }
  // l'ologramma colpito "sfarfalla" per un istante
  function glitch(ch) {
    const h = ch.J.hips;
    return tween(0.16, (t, raw) => { const k = raw < 1 ? 0.07 : 0; h.position.x = (Math.random() - .5) * k; h.position.z = (Math.random() - .5) * k; holo(ch, raw < 1 && Math.random() < 0.5 ? 0.6 : 0); }, ease.lin);
  }

  // ------------------------------------------------------------ aure di energia per grado (stile Super Saiyan)
  // Allievo: alone bianco · Istruttore: fiamma blu · Maestro: fiamma d'oro con fulmini · Leggenda: viola e oro, enorme
  const KI = {
    A: { c: '#eafcff', s: 0.82, o: 0.22, sparks: 0, bolts: 0, hair: false },
    I: { c: '#45b4ff', s: 0.95, o: 0.38, sparks: 1, bolts: 0, hair: true },
    M: { c: '#ffd23f', s: 1.05, o: 0.46, sparks: 1.5, bolts: 0.9, hair: true },
    L: { c: '#b57bff', c2: '#ffd23f', s: 1.22, o: 0.55, sparks: 2.5, bolts: 2.4, hair: true },
  };
  // lingue di fuoco bianche (il colore lo dà il materiale), ripetute tre volte intorno al corpo
  function flameTex(seed) {
    const k = 'flame' + seed;
    if (!texCache[k]) {
      const t = canvasTex(128, 256, (x, w, h) => {
        for (let i = 0; i < 24; i++) {
          const fx = (i * 37 + seed * 23) % w, fw = 8 + (i * 13) % 14, fh = h * (0.45 + ((i * 29 + seed * 7) % 50) / 100);
          const gr = x.createLinearGradient(0, h, 0, h - fh);
          gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.55, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          x.fillStyle = gr;
          for (const dx of [-w, 0, w]) { // ripetuto ai bordi: la texture si richiude senza giunture
            x.beginPath(); x.moveTo(fx + dx - fw, h);
            x.quadraticCurveTo(fx + dx - fw * 0.4, h - fh * 0.55, fx + dx + ((i % 3) - 1) * 6, h - fh);
            x.quadraticCurveTo(fx + dx + fw * 0.4, h - fh * 0.55, fx + dx + fw, h); x.fill();
          }
        }
      });
      t.wrapS = T.RepeatWrapping; t.repeat.set(3, 1);
      texCache[k] = t;
    }
    return texCache[k];
  }
  // capelli a punte luminosi dietro il volto
  function spikeTex() {
    if (!texCache.spike) texCache.spike = canvasTex(256, 256, (x, w, h) => {
      const cx = w / 2, cy = h / 2 + 18;
      const gr = x.createRadialGradient(cx, cy, 30, cx, cy, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.beginPath();
      const n = 11;
      for (let i = 0; i <= n * 2; i++) {
        // punte più lunghe in alto, come i capelli che si drizzano
        const a = Math.PI + (i / (n * 2)) * Math.PI * 1.3 - Math.PI * 0.15;
        const up = Math.max(0, -Math.sin(a));
        const r = i % 2 ? 62 : 82 + up * 40;
        x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      x.closePath(); x.fill();
    });
    return texCache.spike;
  }
  const rv = k => new T.Vector3((Math.random() - 0.5) * k, (Math.random() - 0.3) * k, (Math.random() - 0.5) * k);
  // k = 1 piena potenza (chi agisce), meno = aura leggera. Restituisce { stop() }.
  function ki(ch, rank, k) {
    const K = KI[rank] || KI.A;
    const full = k >= 1;
    const grp = new T.Group(); ch.g.add(grp);
    const shape = geo('ki', () => new T.LatheGeometry([[0.26, 0], [0.44, 0.25], [0.54, 0.7], [0.52, 1.2], [0.4, 1.65], [0.22, 2.0], [0.03, 2.3]].map(([r, y]) => new T.Vector2(r, y)), 24));
    const shells = [[K.c, 1, 1, 0.35], [K.c2 || '#ffffff', 0.8, 0.65, -0.5]].map(([c, sc, op, spin], i) => {
      const map = flameTex(i + 1).clone(); map.needsUpdate = true; map.temp = true; // da liberare a fine scena
      const m = new T.Mesh(shape, addMat(c, { map, opacity: 0 }));
      m.scale.setScalar(sc * K.s); grp.add(m);
      return { m, op: op * K.o * k, sc: sc * K.s, spin };
    });
    let light = null, hair = null;
    if (full) { light = new T.PointLight(K.c, 0, 3.4); light.position.y = 1.1; grp.add(light); }
    if (full && K.hair) {
      hair = new T.Sprite(new T.SpriteMaterial({ map: spikeTex(), color: K.c2 || K.c, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0 }));
      hair.scale.set(0.95, 0.95, 1); hair.position.y = 0.32; hair.renderOrder = 1; ch.J.neck.add(hair);
    }
    let t = 0, on = 0, want = 1;
    const u = dt => {
      t += dt; on += (want - on) * Math.min(1, dt * (want ? 5 : 7));
      shells.forEach((sh, i) => {
        sh.m.material.opacity = sh.op * on * (0.8 + Math.random() * 0.3);
        sh.m.scale.set(sh.sc * (1 + Math.sin(t * 13 + i) * 0.04), sh.sc * (0.85 + on * 0.15 + Math.sin(t * 9 + i * 2) * 0.05), sh.sc * (1 + Math.cos(t * 11 + i) * 0.04));
        sh.m.material.map.offset.x += dt * sh.spin;
      });
      if (light) light.intensity = 2.6 * on * (0.85 + Math.random() * 0.3);
      if (hair) { hair.material.opacity = 0.9 * on; hair.material.rotation = Math.sin(t * 22) * 0.04; }
      const p = ch.g.position;
      if (on > 0.5 && K.sparks && Math.random() < K.sparks * k * dt * 5) rise(new T.Vector3(p.x, 0.15, p.z), K.c2 || K.c, 1, 0.45 * K.s);
      if (full && on > 0.6 && K.bolts && Math.random() < K.bolts * dt) { const c = chestPos(ch); lightning(c.clone().add(rv(0.6)), c.clone().add(rv(0.9)), K.c2 ? '#fff3b0' : '#ffffff', 0.12); }
      if (!want && on < 0.02) {
        updaters.splice(updaters.indexOf(u), 1);
        ch.g.remove(grp); if (hair) ch.J.neck.remove(hair);
        shells.forEach(sh => { sh.m.material.map.dispose(); sh.m.material.dispose(); });
      }
    };
    updaters.push(u);
    // accensione: onda d'urto a terra; Maestri e Leggende fanno tremare la scena
    if (full) {
      ring(new T.Vector3(ch.g.position.x, 0.05, ch.g.position.z), K.c, 2.3 * K.s, 0.55, true);
      sfx('buff');
      if (rank === 'M' || rank === 'L') shake(rank === 'L' ? 0.12 : 0.07, 0.3);
      if (rank === 'L') screenFlash(K.c, 0.3);
    }
    return { stop() { want = 0; } };
  }

  // suoni e vibrazione (audio.js), se presenti
  const sfx = (n, k) => { if (window.Sound) window.Sound.play(n, k); };
  const buzz = p => { if (window.Sound) window.Sound.buzz(p); };

  // ------------------------------------------------------------ reazioni del bersaglio
  async function react(ch, out, color) {
    if (!out) return;
    const pr = [];
    if (out.dmg) { sfx(out.dmg >= 45 ? 'bighit' : 'hit', out.dmg); buzz(out.dmg >= 45 ? 70 : 25); }
    if (out.dodge) sfx('dodge');
    if (out.immune) sfx('shield');
    if (out.heal) sfx('heal');
    if (out.stun) setTimeout(() => sfx('stun'), 200);
    else if (out.confuse) setTimeout(() => sfx('confuse'), 200);
    if (out.dodge) {
      const z0 = ch.g.position.z;
      pr.push(tween(0.35, (t, raw) => { ch.g.position.z = z0 + Math.sin(raw * Math.PI) * 0.7; }, ease.lin));
      pr.push(numberPop(ch, 'SCHIVATA', '#8fe0b5', 0.3));
    }
    if (out.immune) {
      const b = new T.Mesh(geo('shield', () => new T.SphereGeometry(0.85, 20, 14)), new T.MeshBasicMaterial({ color: '#6fb3e6', transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false }));
      b.position.set(ch.g.position.x, 0.95, ch.g.position.z); root.add(b);
      pr.push(tween(0.7, t => { b.material.opacity = 0.45 * (1 - t); b.scale.setScalar(1 + t * 0.2); }, ease.lin).then(() => root.remove(b)));
      pr.push(numberPop(ch, 'IMMUNE', '#6fb3e6', 0.3));
    }
    if (out.dmg) {
      burst(chestPos(ch), color || '#ffb347', 14, 3.2);
      burst(chestPos(ch), '#ffffff', 5, 2);
      shake(out.dmg > 45 ? 0.16 : 0.08, 0.22);
      glitch(ch).then(() => flashChar(ch, '#ff5a3c'));
      padFlash(ch, '#ff3b30');
      const back = -0.35;
      const x0 = ch.g.position.x, z0 = ch.g.position.z;
      const dx = Math.cos(ch.facing) * back, dz = -Math.sin(ch.facing) * back;
      ch.idle = false;
      pr.push(toPose(ch, 'hit', 0.12, ease.out).then(() => tween(0.25, t => { ch.g.position.x = x0 + dx * Math.sin(t * Math.PI); ch.g.position.z = z0 + dz * Math.sin(t * Math.PI); })));
      pr.push(numberPop(ch, '−' + out.dmg, '#ff6a50'));
    }
    if (out.heal) { padFlash(ch, '#8fe0b5'); rise(new T.Vector3(ch.g.position.x, 0.2, ch.g.position.z), '#8fe0b5', 16, 0.5); pr.push(numberPop(ch, '+' + out.heal, '#8fe0b5')); }
    if (out.stun) { pr.push(orbit(ch, '⭐', 3, 0.3, 1.1)); pr.push(wait(0.25).then(() => pop(headPos(ch).add(new T.Vector3(0, 1.05, 0)), textTex(out.para ? 'PARALISI' : 'STORDITO', '#ffd24a'), 0.3, 1.1, 0.15))); }
    if (out.confuse) { pr.push(orbit(ch, '❓', 3, 0.32, 1.1)); if (!out.stun) pr.push(wait(0.25).then(() => pop(headPos(ch).add(new T.Vector3(0, 1.05, 0)), textTex('CONFUSIONE', '#d4bdf5'), 0.3, 1.1, 0.15))); }
    if (out.buff) pr.push(pop(headPos(ch).add(new T.Vector3(0, 0.8, 0)), textTex(out.buff, '#8fe0b5'), 0.32, 1.1, 0.2));
    if (out.ko) {
      await wait(0.4);
      sfx('ko'); buzz([90, 50, 160]);
      ch.idle = false;
      pop(headPos(ch).add(new T.Vector3(0, 0.5, 0)), textTex('K.O.', '#ff6a50'), 0.6, 1.2, 0.3);
      await toPose(ch, 'ko', 0.45, ease.in);
      padOff(ch);
      if (ch.ki) ch.ki.stop();
      shake(0.1, 0.15);
      burst(new T.Vector3(ch.g.position.x, 0.1, ch.g.position.z), '#b8a88d', 12, 2);
      await Promise.all(pr);
      return;
    }
    await Promise.all(pr);
    if (out.stun || out.confuse) { await toPose(ch, 'dizzy', 0.25); ch.idle = true; }
    else { await toPose(ch, 'guard', 0.25); ch.idle = true; }
  }

  // ------------------------------------------------------------ coreografie
  async function melee(A, tg, kind, spec, M) {
    const tp = tg.ch.g.position;
    const home = A.g.position.clone();
    // si ferma davanti al bersaglio
    const dir = new T.Vector3(tp.x - home.x, 0, tp.z - home.z); const dist = dir.length(); dir.normalize();
    const stop = new T.Vector3().copy(home).addScaledVector(dir, dist - (kind === 'kick' || kind === 'spin' ? 1.05 : 0.85));
    A.idle = false;
    sfx('whoosh');
    if (kind === 'charge') {
      await toPose(A, 'run1', 0.12);
      const run = moveTo(A, stop.x, stop.z, 0.42, ease.in);
      const legs = (async () => { for (let i = 0; i < 3; i++) { await toPose(A, 'run2', 0.07, ease.lin); await toPose(A, 'run1', 0.07, ease.lin); } })();
      const trail = (dt) => burst(new T.Vector3(A.g.position.x, 0.4, A.g.position.z), M.c, 1, 0.8, 0.07);
      updaters.push(trail);
      await Promise.all([run, legs]);
      updaters.splice(updaters.indexOf(trail), 1);
      await toPose(A, 'shoulder', 0.08, ease.out);
    } else {
      await Promise.all([moveTo(A, stop.x, stop.z, 0.32, ease.io, 0.18), toPose(A, kind === 'kick' || kind === 'spin' ? 'kickWind' : kind === 'palm' ? 'palmWind' : 'punchWind', 0.32)]);
      if (kind === 'spin') {
        const f0 = A.facing;
        await Promise.all([tween(0.28, t => { A.g.rotation.y = f0 + t * Math.PI * 2; }, ease.in), toPose(A, 'kick', 0.28, ease.in)]);
        A.g.rotation.y = f0;
      } else await toPose(A, kind === 'kick' ? 'kick' : kind === 'palm' ? 'palm' : 'punch', 0.1, ease.out);
    }
    return { home };
  }

  // se una scena va storta si chiude comunque, e l'errore resta visibile in console
  async function play(spec) {
    try { return await playScene(spec); } catch (e) { console.error(e); return finish(); }
  }

  async function playScene(spec) {
    if (!init()) return;
    const M = MOVES[spec.move] || MOVES['Attacco'];
    let kind = M.anim;
    // con un'arma in mano l'attacco base è un affondo o un fendente girato
    if (kind === 'basic') kind = spec.attacker.weapon ? ['punch', 'spin', 'punch'][Math.floor(Math.random() * 3)] : ['punch', 'kick', 'palm', 'punch', 'spin'][Math.floor(Math.random() * 5)];

    // preparazione della scena
    overlay.hidden = false;
    document.body.classList.add('arena-open');
    subEl.textContent = spec.attacker.name;
    ctrlEl.innerHTML = spec.controls || '';
    titleEl.textContent = spec.label || spec.move;
    flashEl.style.opacity = '0';
    resize();
    const sc = sceneTex(spec.terrain);
    back.material.map = sc.bg; ground.material.map = sc.floor;
    // i pavimenti chiari sotto le luci calde dell'arena sarebbero accecanti
    ground.material.color.setScalar(sc.dim);
    while (root.children.length) root.remove(root.children[0]);
    tweens.length = 0; parts.length = 0; updaters.length = 0;
    skipping = false;
    speed = spec.speed || 1;

    const A = fighter(spec.attacker);
    equip(A, spec.attacker.weapon);
    A.g.position.set(-0.55, 0, 1.3);
    root.add(A.g);
    const tgs = spec.targets.slice(0, 5).map((t, i, arr) => {
      const ch = fighter(t);
      equip(ch, t.weapon);
      const n = arr.length;
      const spread = n === 1 ? [0] : Array.from({ length: n }, (_, k) => k / (n - 1) - 0.5);
      const s = spread[i];
      ch.g.position.set(0.55 + s * 1.6, 0, -1.5 - Math.abs(s) * 0.6 + (n > 3 && i % 2 ? 0.35 : 0));
      root.add(ch.g);
      return { ch, out: t.out, ally: t.ally };
    });
    const focus = tgs.length ? tgs.map(t => t.ch.g.position).reduce((a, b) => a.clone().add(b)).multiplyScalar(1 / tgs.length) : new T.Vector3(1, 0, -1);
    face(A, focus.x, focus.z);
    tgs.forEach(t => face(t.ch, A.g.position.x, A.g.position.z));
    const all = [A].concat(tgs.map(t => t.ch));
    const idle = (dt) => all.forEach(c => { c.t += dt; c.apply(); });
    updaters.push(idle);

    // ogni lottatore sulla sua carta (più piccole se i bersagli sono tanti)
    all.forEach((c, i) => cardPad(c, tgs.length > 3 && c !== A ? 0.46 : 0.72, i * 0.003));

    running = true; clock.getDelta(); loop();
    // ingresso: i lottatori si materializzano dalle carte
    overlay.classList.remove('show'); void overlay.offsetWidth; overlay.classList.add('show');
    await Promise.all(all.map((c, i) => summon(c, i * 0.04)));
    // aure di energia: chi agisce si carica, Maestri e Leggende coinvolti restano accesi
    A.ki = ki(A, spec.attacker.rank, 1);
    tgs.forEach(t => { if (t.ch.d.rank === 'M' || t.ch.d.rank === 'L') t.ch.ki = ki(t.ch, t.ch.d.rank, 0.35); });
    await wait(spec.move === 'Attacco' ? 0.15 : 0.3);
    // le mosse speciali attivano la carta di chi le usa
    if (spec.move !== 'Attacco' && !(spec.flags && spec.flags.confused)) await activate(A, M.c);

    const impactAll = async () => {
      await Promise.all(tgs.map(t => react(t.ch, t.out, M.c)));
    };

    // la confusione: si colpisce da solo
    if (spec.flags && spec.flags.confused) {
      A.idle = false;
      await toPose(A, 'punchWind', 0.25);
      orbit(A, '❓', 3, 0.3, 1.2);
      await tween(0.4, t => { A.g.rotation.y = A.facing + Math.sin(t * Math.PI * 3) * 0.8; }, ease.lin);
      await toPose(A, 'punch', 0.1);
      await react(A, spec.self, '#a978e0');
      await wait(0.3);
      return finish();
    }

    const melees = ['punch', 'kick', 'palm', 'spin', 'charge'];
    if (melees.includes(kind) && tgs.length) {
      const main = tgs[0];
      const { home } = await melee(A, main, kind, spec, M);
      const hitPos = chestPos(main.ch);
      if (M.e) pop(hitPos.clone().add(new T.Vector3(0, 0.3, 0)), emojiTex(M.e), 0.6, 0.8);
      if (M.fx === 'flash' || (spec.flags && spec.flags.prodigy)) screenFlash('#ffffff', 0.7);
      if (spec.flags && spec.flags.prodigy) { if (window.Sound) window.Sound.prodigy(); for (let i = 0; i < 6; i++) pop(hitPos.clone().add(new T.Vector3((Math.random() - .5) * 2, Math.random(), (Math.random() - .5))), emojiTex('🎵'), 0.4, 1); }
      if (M.fx === 'steam') rise(new T.Vector3(main.ch.g.position.x, 0.3, main.ch.g.position.z), M.c, 20, 0.5);
      if (M.fx === 'fire' || kind === 'charge') burst(hitPos, '#ff5a1f', 20, 4, 0.08);
      ring(hitPos, M.c, 1.2, 0.35);
      await Promise.all([impactAll(), (async () => { await wait(0.12); await Promise.all([toPose(A, 'guard', 0.3), moveTo(A, home.x, home.z, 0.35, ease.io, 0.15)]); A.idle = true; })()]);
    } else if (['cast', 'point', 'shout', 'throw', 'summon', 'dance'].includes(kind) && tgs.length) {
      A.idle = false;
      const wind = { cast: 'castWind', point: 'guard', shout: 'shoutWind', throw: 'throwWind', summon: 'castWind', dance: 'flex' }[kind];
      const hit = { cast: 'cast', point: 'point', shout: 'shout', throw: 'throw', summon: 'cast', dance: 'power' }[kind];
      if (kind === 'dance') {
        const f0 = A.facing;
        await Promise.all([toPose(A, 'flex', 0.25), tween(0.7, t => { A.g.rotation.y = f0 + t * Math.PI * 4; A.g.position.y = Math.abs(Math.sin(t * Math.PI * 3)) * 0.25; }, ease.io)]);
        A.g.rotation.y = f0; A.g.position.y = 0;
      } else {
        await toPose(A, wind, 0.3);
        if (M.e && kind !== 'throw') pop(headPos(A).add(new T.Vector3(0, 0.55, 0)), emojiTex(M.e), 0.5, 0.9, 0.3);
        if (spec.flags && spec.flags.formula) pop(headPos(A).add(new T.Vector3(0, 0.95, 0)), textTex(String(spec.flags.formula).toUpperCase().split(' ').slice(0, 4).join(' ') + '!', '#ffd24a'), 0.34, 1.3, 0.1);
        await toPose(A, hit, 0.14, ease.out);
      }
      const from = kind === 'shout' ? headPos(A) : handPos(A);
      sfx(M.fx === 'wave' || M.fx === 'hypno' || kind === 'shout' ? 'magic' : 'whoosh');
      // proiettili / onde verso ogni bersaglio
      await Promise.all(tgs.map(async (t, i) => {
        await wait(i * 0.08);
        const to = chestPos(t.ch);
        const fx = M.fx;
        if (fx === 'lob' || kind === 'throw') await lob(from, to, M.e || '✨', 0.55);
        else if (fx === 'bubble') { const s = sprite(textTex(M.t, '#000', true), 0.6); s.position.copy(from); root.add(s); await tween(0.45, tt => { s.position.lerpVectors(from, headPos(t.ch).add(new T.Vector3(0, 0.3, 0)), tt); }, ease.out); setTimeout(() => root.remove(s), 500 / speed); }
        else if (fx === 'wave' || fx === 'hypno') { for (let k = 0; k < 3; k++) { const p = new T.Vector3().lerpVectors(from, to, (k + 1) / 4); ring(p, M.c, 0.6 + k * 0.2, 0.45, false, to); await wait(0.07); } await orb(from, to, M.c, M.e, 0.3, 0.1); if (fx === 'hypno') for (let k = 0; k < 4; k++) { ring(to, k % 2 ? '#ffffff' : M.c, 1.3, 0.5); await wait(0.06); } }
        else if (fx === 'shock') { const gp = new T.Vector3(A.g.position.x, 0.04, A.g.position.z); if (i === 0) { ring(gp, M.c, 4.5, 0.6, true); shake(0.1, 0.3); } await wait(0.3); }
        else if (fx === 'papers') { for (let k = 0; k < 3; k++) { lob(from, to.clone().add(new T.Vector3(0, k * 0.15, 0)), '📄', 0.4, 0.5); await wait(0.05); } await lob(from, to, M.e, 0.4, 0.4); }
        else if (fx === 'spit') { pop(headPos(A).add(new T.Vector3(0, 0.55, 0)), emojiTex('🦙'), 0.5, 0.9, 0.2); await orb(from, to, '#e8f0d0', null, 0.4, 0.6); }
        else if (fx === 'rain') { await orb(from, headPos(t.ch).add(new T.Vector3(0, 0.9, 0)), M.c, null, 0.35, 0.3); const c = headPos(t.ch).add(new T.Vector3(0, 0.95, 0)); pop(c, emojiTex('🌧️'), 0.8, 1.1, 0); for (let k = 0; k < 14; k++) { const m = new T.Mesh(geo('drop', () => new T.BoxGeometry(0.02, 0.12, 0.02)), new T.MeshBasicMaterial({ color: '#8fb8ff', transparent: true })); m.position.set(c.x + (Math.random() - .5) * 0.6, c.y - 0.1, c.z + (Math.random() - .5) * 0.4); root.add(m); parts.push({ obj: m, v: new T.Vector3(0, -3, 0), life: 0, max: 0.4 + Math.random() * 0.4 }); } await wait(0.3); }
        else if (fx === 'vortex') { await orb(from, to, M.c, M.e, 0.4, 0.2); for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 4; burst(new T.Vector3(to.x + Math.cos(a) * 0.5, 0.2 + k * 0.06, to.z + Math.sin(a) * 0.5), M.c, 1, 0.3, 0.05); } }
        else if (fx === 'drain') { await orb(from, to, M.c, M.e, 0.35, 0.1); await orb(to, chestPos(A), '#6fb3e6', '🛡️', 0.45, 0.4); aura(A, M.c, 0.5); }
        else if (fx === 'kids') { const ks = [0, 1, 2].map(k => kid(new T.Vector3(A.g.position.x + (k - 1) * 0.3, 0, A.g.position.z + 0.2), M.kid)); await Promise.all(ks.map((kd, k) => { const p0 = kd.position.clone(); const p1 = new T.Vector3(t.ch.g.position.x + (k - 1) * 0.35, 0, t.ch.g.position.z + 0.4); return tween(0.55 + k * 0.05, (tt, raw) => { kd.position.lerpVectors(p0, p1, tt); kd.position.y = Math.abs(Math.sin(raw * Math.PI * 4)) * 0.12; }, ease.in).then(() => { burst(kd.position.clone().setY(0.4), M.c, 6, 2); root.remove(kd); }); })); }
        else if (fx === 'flash') { await orb(from, to, '#ffffff', M.e, 0.3, 0.1); screenFlash('#ffffff', 0.9); }
        else if (fx === 'calm') { await orb(from, to, M.c, M.e, 0.4, 0.3); ring(new T.Vector3(t.ch.g.position.x, 0.04, t.ch.g.position.z), M.c, 1.2, 0.6, true); }
        else await orb(from, to, M.c, M.e, 0.42, 0.3);
        burst(to, M.c, 10, 2.5);
        await react(t.ch, t.out, M.c);
      }));
      await toPose(A, 'guard', 0.3); A.idle = true;
    } else {
      // mosse su sé stessi: potenziamenti, trasformazioni, sparizione
      A.idle = false;
      const hp = () => headPos(A).add(new T.Vector3(0, 0.6, 0));
      if (kind === 'vanish') {
        await toPose(A, 'power', 0.2);
        burst(chestPos(A), '#cfcfcf', 30, 2.5, 0.1); pop(hp(), emojiTex('💨'), 0.8, 0.9);
        await tween(0.3, t => A.g.scale.setScalar(1 - t), ease.in);
        await wait(0.4);
        return finish();
      }
      if (kind === 'feint') {
        const ghost = fighter(spec.attacker); ghost.g.position.copy(A.g.position); ghost.g.rotation.y = A.facing; root.add(ghost.g);
        ghost.mats.forEach(m => { m.transparent = true; m.opacity = 0.35; }); ghost.face.material.opacity = 0.35;
        ghost.pose = pose('punch'); ghost.apply();
        const gx = A.g.position.x + Math.cos(A.facing) * 0.9, gz = A.g.position.z - Math.sin(A.facing) * 0.9;
        await Promise.all([moveTo(ghost, gx, gz, 0.35, ease.out), toPose(A, 'dizzy', 0.2)]);
        root.remove(ghost.g);
        pop(hp(), emojiTex(M.e), 0.6, 0.9);
        await tween(0.35, (t, raw) => { A.g.position.x = -0.55 - Math.sin(raw * Math.PI) * 0.4; }, ease.lin);
      } else {
        const p = kind === 'meditate' ? 'meditate' : kind === 'stomp' ? 'stomp' : 'power';
        sfx(kind === 'meditate' ? 'heal' : 'buff');
        await toPose(A, p, 0.3);
        if (M.e) pop(hp(), emojiTex(M.e), 0.65, 1.1, 0.35);
        const au = aura(A, M.c, 1.0);
        if (kind === 'sumo') await tween(0.4, t => { A.body.forEach(b => b.scale.x = 1 + t * 0.6); A.J.hips.scale.x = 1 + t * 0.3; }, ease.back);
        if (M.fx === 'fluff') { [A.J.lft, A.J.rft].forEach(f => { const w = new T.Mesh(geo('fluff', () => new T.SphereGeometry(0.16, 10, 8)), toon('#f7f3ea')); f.add(w); tween(0.4, t => w.scale.setScalar(t * 1.4), ease.back); }); await toPose(A, 'stomp', 0.2); await toPose(A, 'power', 0.12, ease.in); shake(0.14, 0.25); ring(new T.Vector3(A.g.position.x, 0.04, A.g.position.z), M.c, 2.2, 0.5, true); }
        if (M.fx === 'metal') { A.mats.forEach(m => m.color.lerp(new T.Color('#aab6c2'), 0.6)); ring(chestPos(A), '#dfe7ef', 1.3, 0.4); }
        if (M.fx === 'marble') { A.mats.forEach(m => m.color.lerp(new T.Color('#d8d8d8'), 0.8)); A.face.material.color.set('#c8c8c8'); }
        if (M.fx === 'lightning') for (let k = 0; k < 5; k++) { const c = chestPos(A); lightning(c, c.clone().add(new T.Vector3((Math.random() - .5) * 2, Math.random() * 1.5, (Math.random() - .5) * 2)), M.c, 0.35); await wait(0.08); }
        if (M.fx === 'dice') for (let k = 0; k < 3; k++) { lob(chestPos(A), chestPos(A).add(new T.Vector3((k - 1) * 0.6, 0.4, 0.3)), '🎲', 0.5, 0.8); await wait(0.08); }
        if (kind === 'flex' || kind === 'powerup' || kind === 'sumo') await toPose(A, 'flex', 0.25);
        await au;
        if (spec.self && (spec.self.heal || spec.self.buff)) await react(A, spec.self);
        // il resto della squadra (Calma Sovrastante sugli alleati)
        await impactAll();
      }
      await toPose(A, 'guard', 0.3); A.idle = true;
    }

    // contrattacco o danni subiti dall'attaccante
    if (spec.self && (spec.self.dmg || spec.self.ko) && !(spec.flags && spec.flags.confused)) {
      if (spec.flags && spec.flags.counter) { for (let k = 0; k < 3; k++) lob(chestPos(tgs[0] ? tgs[0].ch : A), chestPos(A), '🎲', 0.45, 0.8); await wait(0.45); }
      await react(A, spec.self, '#eadbc0');
    }
    await wait(0.35);
    return finish();
  }

  async function finish() {
    await tween(0.18, () => {});
    running = false;
    overlay.classList.remove('show');
    overlay.hidden = true;
    document.body.classList.remove('arena-open');
    while (root.children.length) {
      const o = root.children[0];
      root.remove(o);
      o.traverse && o.traverse(n => {
        if (n.geometry && !shared.has(n.geometry)) n.geometry.dispose();
        if (n.material && n.material.map && n.material.map.temp) n.material.map.dispose();
        if (n.material && n.material.dispose) n.material.dispose();
      });
    }
    tweens.length = 0; parts.length = 0; updaters.length = 0;
  }

  function skip() { skipping = true; }

  function setSpeed(k) { speed = k; }
  // scarica in anticipo le immagini delle carte della partita
  function preload(cards) { if (T) cards.forEach(cardTex); }

  window.Arena3D = { available, play, skip, setSpeed, preload, terrainArt, MOVES, LOOK, FACE };
})();
