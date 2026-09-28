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
    federico: ['#1f2a44', '#e8631c'], flavio: ['#3a3a3a', '#d8412f'], grazia: ['#8f1f1f', '#ffd24a'],
    katya: ['#161616', '#6fb3e6'], lorenzo: ['#141414', '#d8412f'], niccolo: ['#f2f2f2', '#e8631c'],
    oksana: ['#5b2d82', '#b04cff'], samuele: ['#cfcac0', '#e8631c'], sara: ['#4a1466', '#b04cff'],
    strahinja: ['#2b4c8c', '#6fb3e6'], viola: ['#8c2b2b', '#ff9a3d'], vittorio: ['#151515', '#e8631c'],
  };
  const BELT = { M: '#d4ae62', I: '#111111', A: '#f2efe6' };

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
    'Delirio Onnipotente': { anim: 'cast', fx: 'hypno', e: '🌀', c: '#ff3b30' },
    'Fuckgammon': { anim: 'powerup', fx: 'dice', e: '🎲', c: '#eadbc0' },
    'Stupro Mentale': { anim: 'cast', fx: 'wave', e: '🧠', c: '#b04cff' },
    'Intenzione Fasulla': { anim: 'feint', fx: 'ghost', e: '👻', c: '#b04cff' },
    "Sputo dell'Ultralama": { anim: 'shout', fx: 'spit', e: '🦙', c: '#dfe8c8' },
    'Rettifica Genealogica': { anim: 'cast', fx: 'lob', e: '⭐', c: '#d4ae62' },
    'Domanda Ossessiva Compulsiva': { anim: 'point', fx: 'orb', e: '❓', c: '#ff9a3d' },
    'Stato Confusionale': { anim: 'dance', fx: 'wave', e: '❓', c: '#a978e0' },
    'Bottiglia Eterna': { anim: 'cast', fx: 'orb', e: '🍾', c: '#55b98a' },
    'Apprendimento Fulmineo': { anim: 'cast', fx: 'orb', e: '⚡', c: '#ffd24a' },
    'T-shirt Magistrali': { anim: 'throw', fx: 'lob', e: '👕', c: '#eadbc0' },
    'Volto Marmoreo': { anim: 'meditate', fx: 'marble', e: '🗿', c: '#d8d8d8' },
    'Canto Apocalittico': { anim: 'shout', fx: 'wave', e: '🎤', c: '#ff3b30' },
    'Sudorazione Esplosiva': { anim: 'punch', fx: 'steam', e: '💦', c: '#9be15d' },
    'Piedi Lanosi': { anim: 'stomp', fx: 'fluff', e: '🧦', c: '#f2efe6' },
    'Ballo Dirompente': { anim: 'dance', fx: 'shock', e: '🕺', c: '#ff9a3d' },
  };

  // ------------------------------------------------------------ stato
  let renderer, scene, camera, clock, root, overlay, titleEl, subEl, flashEl, ready = false, failed = false;
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

  function faceTex(card, trim) {
    if (faceCache[card]) return faceCache[card];
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const tex = new T.CanvasTexture(c);
    const info = { tex, skin: '#d9a47f' };
    const x = c.getContext('2d');
    const draw = (img) => {
      x.clearRect(0, 0, 256, 256);
      x.save(); x.beginPath(); x.arc(128, 128, 118, 0, Math.PI * 2); x.clip();
      if (img) x.drawImage(img, 0, 0, 256, 256); else { x.fillStyle = '#d9a47f'; x.fillRect(0, 0, 256, 256); }
      x.restore();
      x.lineWidth = 12; x.strokeStyle = trim; x.beginPath(); x.arc(128, 128, 120, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 4; x.strokeStyle = '#140f0c'; x.beginPath(); x.arc(128, 128, 126, 0, Math.PI * 2); x.stroke();
      tex.needsUpdate = true;
    };
    draw(null);
    const img = new Image();
    img.onload = () => {
      draw(img);
      // colore della pelle preso dalla guancia della foto
      try {
        const d = x.getImageData(100, 150, 56, 30).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
        info.skin = `rgb(${r / n | 0},${g / n | 0},${b / n | 0})`;
        (info.onSkin || []).forEach(f => f(info.skin));
      } catch (e) { /* immagine non leggibile */ }
    };
    img.src = `img/teste/${card}.jpg`;
    faceCache[card] = info;
    return info;
  }

  function toon(color) {
    return new T.MeshToonMaterial({ color, gradientMap: toonGrad });
  }

  // ------------------------------------------------------------ scena
  function init() {
    if (ready) return true;
    try {
      overlay = document.createElement('div');
      overlay.className = 'arena3d';
      overlay.innerHTML = '<div class="arena-title"><div class="arena-who"></div><div class="arena-move"></div></div><div class="arena-flash"></div><div class="arena-skip">Tocca per saltare</div>';
      overlay.hidden = true;
      document.body.appendChild(overlay);
      titleEl = overlay.querySelector('.arena-move');
      subEl = overlay.querySelector('.arena-who');
      flashEl = overlay.querySelector('.arena-flash');
      overlay.addEventListener('click', skip);

      renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
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

      scene.add(new T.HemisphereLight('#ffe8d0', '#3a2418', 0.65));
      const sun = new T.DirectionalLight('#fff0dc', 0.75); sun.position.set(-3, 8, 7); scene.add(sun);
      const rim = new T.DirectionalLight('#e8631c', 0.8); rim.position.set(3, 4, -8); scene.add(rim);

      // fondale: tramonto, montagne e pagoda
      const bg = canvasTex(1024, 512, (x, w, h) => {
        const gr = x.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, '#1b0f0b'); gr.addColorStop(0.45, '#6b2a12'); gr.addColorStop(0.7, '#e8631c'); gr.addColorStop(1, '#3a1a0e');
        x.fillStyle = gr; x.fillRect(0, 0, w, h);
        x.fillStyle = '#ffcf7a'; x.globalAlpha = 0.85; x.beginPath(); x.arc(w * 0.62, h * 0.62, 70, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
        const ridge = (y0, amp, col, seed) => {
          x.fillStyle = col; x.beginPath(); x.moveTo(0, h);
          for (let i = 0; i <= 64; i++) { const px = i / 64 * w; x.lineTo(px, y0 - Math.abs(Math.sin(i * 0.7 + seed) * amp + Math.sin(i * 1.9 + seed * 2) * amp * 0.4)); }
          x.lineTo(w, h); x.fill();
        };
        ridge(h * 0.74, 70, '#3b1a10', 1); ridge(h * 0.84, 50, '#24110b', 3);
        // pagoda
        x.fillStyle = '#140a07';
        const px = w * 0.24, py = h * 0.84;
        for (let i = 0; i < 4; i++) {
          const ww = 120 - i * 24, yy = py - 40 - i * 34;
          x.fillRect(px - ww / 2 + 14, yy, ww - 28, 34);
          x.beginPath(); x.moveTo(px - ww / 2 - 18, yy + 6); x.quadraticCurveTo(px, yy - 26, px + ww / 2 + 18, yy + 6); x.lineTo(px + ww / 2 - 6, yy + 12); x.lineTo(px - ww / 2 + 6, yy + 12); x.fill();
        }
        x.fillRect(px - 2, py - 200, 4, 40);
      });
      const back = new T.Mesh(new T.PlaneGeometry(40, 20), new T.MeshBasicMaterial({ map: bg, fog: false }));
      back.position.set(0, 5, -14); scene.add(back);

      // tatami della palestra
      const floor = canvasTex(1024, 1024, (x, w, h) => {
        x.fillStyle = '#5a3a22'; x.fillRect(0, 0, w, h);
        for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#5f3e25' : '#553620'; x.fillRect(0, i * 64, w, 64); x.fillStyle = '#3a2414'; x.fillRect(0, i * 64, w, 3); }
        x.strokeStyle = '#e8631c'; x.lineWidth = 18; x.beginPath(); x.arc(w / 2, h / 2, 380, 0, Math.PI * 2); x.stroke();
        x.strokeStyle = '#d4ae62'; x.lineWidth = 5; x.beginPath(); x.arc(w / 2, h / 2, 352, 0, Math.PI * 2); x.stroke();
        x.fillStyle = 'rgba(234,219,192,.18)'; x.font = 'bold 300px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('道', w / 2, h / 2 + 10);
      });
      const ground = new T.Mesh(new T.PlaneGeometry(12, 12), new T.MeshLambertMaterial({ map: floor }));
      ground.rotation.x = -Math.PI / 2; scene.add(ground);

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

  function fighter(d) {
    const look = LOOK[d.card] || ['#444', '#e8631c'];
    const g = new T.Group();
    const gi = toon(look[0]);
    const pants = toon(new T.Color(look[0]).multiplyScalar(0.72));
    const trim = toon(look[1]);
    const face = faceTex(d.card, look[1]);
    const skin = toon(face.skin);
    (face.onSkin = face.onSkin || []).push(c => skin.color.set(c));
    const belt = toon(BELT[d.rank] || BELT.A);
    const cyl = (r1, r2, h, m) => { const x = new T.Mesh(new T.CylinderGeometry(r1, r2, h, 12), m); return x; };
    const ball = (r, m) => new T.Mesh(new T.SphereGeometry(r, 14, 10), m);
    const J = {};

    const hips = new T.Group(); hips.position.y = 0.8; g.add(hips); J.hips = hips;
    const pelvis = cyl(0.19, 0.17, 0.2, pants); pelvis.scale.z = 0.8; hips.add(pelvis);
    const torso = new T.Group(); torso.position.y = 0.06; hips.add(torso); J.torso = torso;
    const chest = cyl(0.23, 0.18, 0.52, gi); chest.position.y = 0.28; chest.scale.z = 0.78; torso.add(chest);
    const collar = new T.Mesh(new T.TorusGeometry(0.14, 0.035, 6, 16), trim); collar.rotation.x = Math.PI / 2; collar.position.y = 0.54; torso.add(collar);
    const bl = cyl(0.195, 0.195, 0.075, belt); bl.position.y = 0.04; bl.scale.z = 0.82; torso.add(bl);
    const knot = new T.Mesh(new T.BoxGeometry(0.06, 0.16, 0.05), belt); knot.position.set(0.17, -0.03, 0.06); knot.rotation.z = 0.3; torso.add(knot);
    const neck = new T.Group(); neck.position.y = 0.56; torso.add(neck); J.neck = neck;
    const nk = cyl(0.07, 0.08, 0.14, skin); nk.position.y = 0.04; neck.add(nk);
    const fs = new T.Sprite(new T.SpriteMaterial({ map: face.tex, transparent: true }));
    fs.scale.set(0.82, 0.82, 1); fs.position.y = 0.36; neck.add(fs); J.face = fs;

    const arm = (side) => {
      const sh = new T.Group(); sh.position.set(0, 0.46, side * 0.27); torso.add(sh);
      const up = cyl(0.075, 0.065, 0.3, gi); up.position.y = -0.14; sh.add(up);
      const cuff = cyl(0.08, 0.08, 0.05, trim); cuff.position.y = -0.29; sh.add(cuff);
      const el = new T.Group(); el.position.y = -0.3; sh.add(el);
      const fa = cyl(0.06, 0.055, 0.27, gi); fa.position.y = -0.13; el.add(fa);
      const fist = ball(0.085, skin); fist.position.y = -0.3; el.add(fist);
      return [sh, el, fist];
    };
    [J.ls, J.le, J.lf] = arm(1);
    [J.rs, J.re, J.rf] = arm(-1);
    const leg = (side) => {
      const hp = new T.Group(); hp.position.set(0, -0.06, side * 0.11); hips.add(hp);
      const th = cyl(0.095, 0.08, 0.38, pants); th.position.y = -0.19; hp.add(th);
      const kn = new T.Group(); kn.position.y = -0.38; hp.add(kn);
      const sn = cyl(0.075, 0.065, 0.34, pants); sn.position.y = -0.17; kn.add(sn);
      const ft = new T.Mesh(new T.BoxGeometry(0.22, 0.07, 0.11), toon('#1a1512')); ft.position.set(0.05, -0.37, 0); kn.add(ft);
      return [hp, kn, ft];
    };
    [J.lh, J.lk, J.lft] = leg(1);
    [J.rh, J.rk, J.rft] = leg(-1);

    const shadow = new T.Mesh(new T.CircleGeometry(0.42, 20), new T.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.38, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; g.add(shadow);

    const ch = { d, g, J, pose: pose('guard'), mats: [gi, pants, trim, skin, belt], body: [chest, pelvis], idle: true, t: Math.random() * 6, face: fs, facing: 0 };
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
  function kid(from) {
    const g = new T.Group();
    const body = new T.Mesh(geo('kidb', () => new T.CylinderGeometry(0.1, 0.12, 0.3, 8)), toon('#6b8f5a'));
    body.position.y = 0.2; g.add(body);
    const s = sprite(emojiTex('🧟'), 0.38); s.position.y = 0.48; g.add(s);
    g.position.copy(from); root.add(g);
    return g;
  }

  // ------------------------------------------------------------ reazioni del bersaglio
  async function react(ch, out, color) {
    if (!out) return;
    const pr = [];
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
      flashChar(ch, '#ff5a3c');
      const back = -0.35;
      const x0 = ch.g.position.x, z0 = ch.g.position.z;
      const dx = Math.cos(ch.facing) * back, dz = -Math.sin(ch.facing) * back;
      ch.idle = false;
      pr.push(toPose(ch, 'hit', 0.12, ease.out).then(() => tween(0.25, t => { ch.g.position.x = x0 + dx * Math.sin(t * Math.PI); ch.g.position.z = z0 + dz * Math.sin(t * Math.PI); })));
      pr.push(numberPop(ch, '−' + out.dmg, '#ff6a50'));
    }
    if (out.heal) { rise(new T.Vector3(ch.g.position.x, 0.2, ch.g.position.z), '#8fe0b5', 16, 0.5); pr.push(numberPop(ch, '+' + out.heal, '#8fe0b5')); }
    if (out.stun) { pr.push(orbit(ch, '⭐', 3, 0.3, 1.1)); pr.push(wait(0.25).then(() => pop(headPos(ch).add(new T.Vector3(0, 1.05, 0)), textTex(out.para ? 'PARALISI' : 'STORDITO', '#ffd24a'), 0.3, 1.1, 0.15))); }
    if (out.confuse) { pr.push(orbit(ch, '❓', 3, 0.32, 1.1)); if (!out.stun) pr.push(wait(0.25).then(() => pop(headPos(ch).add(new T.Vector3(0, 1.05, 0)), textTex('CONFUSIONE', '#d4bdf5'), 0.3, 1.1, 0.15))); }
    if (out.buff) pr.push(pop(headPos(ch).add(new T.Vector3(0, 0.8, 0)), textTex(out.buff, '#8fe0b5'), 0.32, 1.1, 0.2));
    if (out.ko) {
      await wait(0.4);
      ch.idle = false;
      pop(headPos(ch).add(new T.Vector3(0, 0.5, 0)), textTex('K.O.', '#ff6a50'), 0.6, 1.2, 0.3);
      await toPose(ch, 'ko', 0.45, ease.in);
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

  async function play(spec) {
    if (!init()) return;
    const M = MOVES[spec.move] || MOVES['Attacco'];
    let kind = M.anim;
    if (kind === 'basic') kind = ['punch', 'kick', 'palm', 'punch', 'spin'][Math.floor(Math.random() * 5)];

    // preparazione della scena
    overlay.hidden = false;
    document.body.classList.add('arena-open');
    subEl.textContent = spec.attacker.name;
    titleEl.textContent = spec.label || spec.move;
    flashEl.style.opacity = '0';
    resize();
    while (root.children.length) root.remove(root.children[0]);
    tweens.length = 0; parts.length = 0; updaters.length = 0;
    skipping = false;
    speed = spec.speed || 1;

    const A = fighter(spec.attacker);
    A.g.position.set(-0.55, 0, 1.3);
    root.add(A.g);
    const tgs = spec.targets.slice(0, 5).map((t, i, arr) => {
      const ch = fighter(t);
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

    running = true; clock.getDelta(); loop();
    // ingresso
    overlay.classList.remove('show'); void overlay.offsetWidth; overlay.classList.add('show');
    await wait(0.35);

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
      if (spec.flags && spec.flags.prodigy) { for (let i = 0; i < 6; i++) pop(hitPos.clone().add(new T.Vector3((Math.random() - .5) * 2, Math.random(), (Math.random() - .5))), emojiTex('🎵'), 0.4, 1); }
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
        if (spec.flags && spec.flags.formula) pop(headPos(A).add(new T.Vector3(0, 0.95, 0)), textTex('FATE TIRI FATE TITI!', '#ffd24a'), 0.34, 1.3, 0.1);
        await toPose(A, hit, 0.14, ease.out);
      }
      const from = kind === 'shout' ? headPos(A) : handPos(A);
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
        else if (fx === 'kids') { const ks = [0, 1, 2].map(k => kid(new T.Vector3(A.g.position.x + (k - 1) * 0.3, 0, A.g.position.z + 0.2))); await Promise.all(ks.map((kd, k) => { const p0 = kd.position.clone(); const p1 = new T.Vector3(t.ch.g.position.x + (k - 1) * 0.35, 0, t.ch.g.position.z + 0.4); return tween(0.55 + k * 0.05, (tt, raw) => { kd.position.lerpVectors(p0, p1, tt); kd.position.y = Math.abs(Math.sin(raw * Math.PI * 4)) * 0.12; }, ease.in).then(() => { burst(kd.position.clone().setY(0.4), M.c, 6, 2); root.remove(kd); }); })); }
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

    // contrattacco o danni subiti dall'attaccante (Fuckgammon)
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
        if (n.material && n.material.dispose) n.material.dispose();
      });
    }
    tweens.length = 0; parts.length = 0; updaters.length = 0;
  }

  function skip() { skipping = true; }

  window.Arena3D = { available, play, skip, MOVES };
})();
