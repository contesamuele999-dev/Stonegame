/* STONE TEMPLE TAO — Modalità Storia
 * Un viaggio a piedi in stile gioco di ruolo portatile: città, percorsi, grotte e palestre su una griglia di caselle.
 * Tutta la grafica è pixel art disegnata dal codice (nessuna immagine in più). Mappe, personaggi e trama stanno
 * in mondo.js; le sfide usano il motore e lo schermo di gioco di sempre (STT.UI.storyBattle, in ui.js).
 */
(function () {
  'use strict';
  const S = window.STT, M = window.MONDO;
  const TS = 16;          // lato di una casella in pixel del gioco
  const STEP = 230;       // millisecondi per un passo (di corsa la metà)
  const MAXLV = 10;
  const SAVE = 'stt_storia';
  const OL = '#26202c';   // contorno della pixel art

  // ------------------------------------------------------------ utilità
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rng(seed) {
    return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), seed | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };
  function shade(hex, k) { // k > 0 schiarisce, k < 0 scurisce
    const n = parseInt(hex.slice(1), 16), f = v => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k));
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('');
  }
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  // piccola immagine scritta a lettere: ogni lettera è un colore, il punto è trasparente
  function pat(g, rows, x, y, col) {
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = col[r[i]]; if (c) R(g, c, x + i, y + j, 1, 1); } });
  }
  const fmt = t => String(t).replace(/\{n\}/g, s ? s.name : '').replace(/\{r\}/g, M.RIVAL);
  const sfx = n => { if (window.Sound) Sound.play(n); };
  const setTrack = t => { if (window.Sound && Sound.setTrack) Sound.setTrack(t); };

  // ------------------------------------------------------------ caselle (16×16)
  const GREEN = new Set('.,*vTKYfr'.split(''));
  const WET = new Set(['~', 'b']);
  function grass(g, v) {
    R(g, '#86d06a', 0, 0, 16, 16);
    const r = rng(v * 7919 + 3);
    for (let i = 0; i < [1, 2, 3, 0][v]; i++) {
      const x = 1 + Math.floor(r() * 12), y = 2 + Math.floor(r() * 11);
      R(g, '#62ad4c', x, y + 1, 1, 2); R(g, '#62ad4c', x + 2, y, 1, 3);
    }
    if (v === 2) for (let i = 0; i < 3; i++) R(g, '#b2e88e', 2 + Math.floor(r() * 12), 2 + Math.floor(r() * 12), 1, 1);
  }
  const TALL = ['o..o..o.', 'lo.lo.lo', 'llollolm', 'mllmllmm', 'mmlmmlmm', 'mmmmmmmm', 'dmmdmmdm', 'dddddddd'];
  const TALL_C = { o: '#2c662c', l: '#76cc5c', m: '#4ea446', d: '#367f36' };
  function tall(g) { R(g, '#367f36', 0, 0, 16, 16); for (const [x, y] of [[0, 0], [8, 0], [-4, 8], [4, 8], [12, 8]]) pat(g, TALL, x, y, TALL_C); }
  function dirt(g, v, f, n) {
    R(g, '#e6cc92', 0, 0, 16, 16);
    const r = rng(v * 131 + 5);
    for (let i = 0; i < 5; i++) R(g, '#cdae74', Math.floor(r() * 16), Math.floor(r() * 16), 1, 1);
    for (let i = 0; i < 4; i++) R(g, '#f5e6c0', Math.floor(r() * 16), Math.floor(r() * 16), 1, 1);
    if (GREEN.has(n.u)) R(g, '#cdae74', 0, 0, 16, 1);
    if (GREEN.has(n.d)) R(g, '#cdae74', 0, 15, 16, 1);
    if (GREEN.has(n.l)) R(g, '#cdae74', 0, 0, 1, 16);
    if (GREEN.has(n.r)) R(g, '#cdae74', 15, 0, 1, 16);
  }
  function pave(g) {
    R(g, '#dcd3c3', 0, 0, 16, 16);
    R(g, '#efe9de', 0, 0, 16, 1); R(g, '#efe9de', 0, 8, 16, 1);
    R(g, '#bdb09a', 0, 7, 16, 1); R(g, '#bdb09a', 0, 15, 16, 1);
    R(g, '#bdb09a', 3, 0, 1, 7); R(g, '#bdb09a', 11, 0, 1, 7); R(g, '#bdb09a', 7, 8, 1, 7); R(g, '#bdb09a', 15, 8, 1, 7);
  }
  function water(g, v, f, n) {
    R(g, '#5aa8ee', 0, 0, 16, 16);
    const o = f ? 3 : 0;
    R(g, '#4890dc', 2 + o, 4, 5, 1); R(g, '#4890dc', 9 - o, 11, 5, 1);
    R(g, '#c6e8ff', 3 + o, 3, 3, 1); R(g, '#c6e8ff', 10 - o, 10, 3, 1);
    const land = ch => ch !== undefined && !WET.has(ch);
    if (land(n.u)) { R(g, '#3a74c4', 0, 0, 16, 2); R(g, '#a6d6fa', 0, 2, 16, 1); }
    if (land(n.l)) R(g, '#3a74c4', 0, 0, 2, 16);
    if (land(n.r)) R(g, '#3a74c4', 14, 0, 2, 16);
    if (land(n.d)) R(g, '#a6d6fa', 0, 15, 16, 1);
  }
  function flowers(g, v, f) {
    grass(g, 3);
    const col = ['#f05a5a', '#ffffff', '#f6a0c8', '#ffe066'][v];
    for (const [x, y] of [[4, 4], [11, 7], [6, 12]]) {
      R(g, '#3f8a3a', x, y + 2, 1, 2);
      if (f) { R(g, col, x - 1, y - 1, 1, 1); R(g, col, x + 1, y - 1, 1, 1); R(g, col, x - 1, y + 1, 1, 1); R(g, col, x + 1, y + 1, 1, 1); }
      else { R(g, col, x - 1, y, 1, 1); R(g, col, x + 1, y, 1, 1); R(g, col, x, y - 1, 1, 1); R(g, col, x, y + 1, 1, 1); }
      R(g, '#f8b830', x, y, 1, 1);
    }
  }
  const TREE = [
    '....oooooooo....', '..oolllmmmmmoo..', '.olllllmmmmmmmo.', '.ollllmmmmmmmmo.', 'olllmmmmmmmmmddo', 'ollmmmmmlmmmmddo',
    'ommmmmmllmmmmddo', 'ommmmmmmmmmmdddo', 'ommmlmmmmmmddddo', 'ommllmmmmmdddddo', '.ommmmmmmdddddo.', '.odmmmmdddddddo.',
    '..oodddddddddo..', '....ooottTooo...', '....ssotToss....', '.....ootTToo....',
  ];
  const treeOf = (o, d, m, l) => g => { grass(g, 3); pat(g, TREE, 0, 0, { o, d, m, l, t: '#8a5a34', T: '#5e3a20', s: '#62ad4c' }); };
  function bamboo(g) {
    grass(g, 0);
    for (const x of [1, 6, 11]) {
      R(g, '#3f7a30', x, 0, 4, 16); R(g, '#6ab04c', x + 1, 0, 2, 16); R(g, '#a6d67a', x + 1, 0, 1, 16);
      for (const y of [3, 9, 14]) R(g, '#2f5e24', x, y, 4, 1);
    }
    R(g, '#4f9a3c', 4, 1, 3, 1); R(g, '#4f9a3c', 9, 6, 3, 1); R(g, '#4f9a3c', 14, 11, 2, 1);
  }
  function fence(g) {
    grass(g, 0);
    R(g, '#6b4426', 0, 4, 16, 3); R(g, '#d6a066', 0, 4, 16, 2);
    R(g, '#6b4426', 0, 10, 16, 3); R(g, '#d6a066', 0, 10, 16, 2);
    for (const x of [2, 12]) { R(g, '#6b4426', x - 1, 2, 4, 13); R(g, '#c8925a', x, 2, 2, 12); R(g, '#e8b880', x, 2, 1, 12); }
  }
  function ledge(g, v) {
    grass(g, v);
    R(g, '#b6e88e', 0, 9, 16, 1); R(g, '#5a9a44', 0, 10, 16, 3); R(g, '#3e7a34', 0, 13, 16, 1);
    for (const x of [2, 7, 12]) R(g, '#3e7a34', x, 10, 1, 3);
  }
  const ROCK = [
    '................', '................', '................', '......oooo......', '....oollllooo...', '...ollllmmmmmo..',
    '..olllmmmmmmmmo.', '..ollmmmmmmmmdo.', '.olmmmmmmmmmddo.', '.ommmmmmmmmdddo.', '.ommmmmmmdddddo.', '.odmmmmdddddddo.',
    '..oddddddddddo..', '...oooooooooo...', '....ssssssss....', '................',
  ];
  function rock(g) { grass(g, 1); pat(g, ROCK, 0, 0, { o: '#3e3e44', l: '#e2e2da', m: '#b4b4ae', d: '#86867e', s: '#62ad4c' }); }
  function boulder(g, v) { caveFloor(g, v); pat(g, ROCK, 0, 0, { o: '#2e2018', l: '#c8a882', m: '#a0805e', d: '#7a5c40', s: '#76604a' }); }
  function caveFloor(g, v) {
    R(g, '#8a7058', 0, 0, 16, 16);
    const r = rng(v * 31 + 9);
    for (let i = 0; i < 6; i++) R(g, '#76604a', Math.floor(r() * 16), Math.floor(r() * 16), 1, 1);
    for (let i = 0; i < 4; i++) R(g, '#a08870', Math.floor(r() * 16), Math.floor(r() * 16), 1, 1);
    if (v === 3) { R(g, '#5e4a38', 6, 9, 3, 2); R(g, '#b49c80', 6, 9, 2, 1); }
  }
  // pareti di roccia (falesia all'aperto, grotta): faccia verticale dove sotto c'è un passaggio
  const cliff = (k, top, speck, face, crack, base, lip) => (g, v, f, n) => {
    const r = rng(v * 17 + 1);
    if (n.d === k || n.d === undefined) {
      R(g, top, 0, 0, 16, 16);
      for (let i = 0; i < 6; i++) R(g, speck, Math.floor(r() * 16), Math.floor(r() * 16), 2, 1);
    } else {
      R(g, face, 0, 0, 16, 16);
      for (let i = 0; i < 3; i++) { const x = 2 + Math.floor(r() * 12); R(g, crack, x, 2 + Math.floor(r() * 4), 1, 6 + Math.floor(r() * 5)); }
      R(g, base, 0, 13, 16, 3);
      if (n.u !== k) R(g, lip, 0, 0, 16, 2);
    }
    if (n.l !== undefined && n.l !== k && n.l !== 'O') R(g, OL, 0, 0, 1, 16);
    if (n.r !== undefined && n.r !== k && n.r !== 'O') R(g, OL, 15, 0, 1, 16);
  };
  const mountain = cliff('M', '#c9a46c', '#b08a54', '#a87c4c', '#7c5634', '#5e4028', '#dcbc88');
  const caveWall = cliff('#', '#3e3028', '#33271f', '#7a6450', '#54402e', '#3a2a1e', '#927a62');
  function caveMouth(g, v) {
    mountain(g, v, 0, { d: '.', u: 'M', l: 'M', r: 'M' });
    R(g, OL, 3, 3, 10, 13); R(g, '#140c08', 4, 4, 8, 12); R(g, OL, 4, 3, 8, 1);
  }
  function bridge(g, v, f, n) {
    R(g, '#c99a62', 0, 0, 16, 16);
    if (n.u === '~' || n.d === '~') { // il ponte attraversa da est a ovest: assi verticali, parapetti sopra e sotto
      for (let x = 3; x < 16; x += 4) R(g, '#9a6e3e', x, 0, 1, 16);
      if (n.u === '~') { R(g, '#6b4426', 0, 0, 16, 3); R(g, '#e0b47e', 0, 0, 16, 1); }
      if (n.d === '~') { R(g, '#6b4426', 0, 13, 16, 3); R(g, '#e0b47e', 0, 13, 16, 1); }
    } else {
      for (let y = 3; y < 16; y += 4) R(g, '#9a6e3e', 0, y, 16, 1);
      if (n.l === '~') { R(g, '#6b4426', 0, 0, 3, 16); R(g, '#e0b47e', 0, 0, 1, 16); }
      if (n.r === '~') { R(g, '#6b4426', 13, 0, 3, 16); R(g, '#e0b47e', 13, 0, 1, 16); }
    }
  }
  function wall(g, v, f, n) {
    R(g, '#efe2c4', 0, 0, 16, 16);
    for (let x = 1; x < 16; x += 4) R(g, '#e3d2ac', x, 0, 1, 16);
    if (n.d !== 'W') { R(g, '#c89a6a', 0, 11, 16, 1); R(g, '#9a7048', 0, 12, 16, 4); }
    if (n.u !== 'W') R(g, '#5a4636', 0, 0, 16, 2);
  }
  function wood(g, v) {
    R(g, '#dcae70', 0, 0, 16, 16);
    for (let y = 3; y < 16; y += 4) R(g, '#c4925a', 0, y, 16, 1);
    const o = v % 2 ? 5 : 11;
    for (let y = 0; y < 16; y += 4) R(g, '#b8864e', (o + (y % 8 ? 6 : 0)) % 16, y, 1, 3);
  }
  function tatami(g, v) {
    R(g, '#d6cb80', 0, 0, 16, 16);
    if (v % 2) for (let y = 1; y < 16; y += 2) R(g, '#c8bc6c', 0, y, 16, 1);
    else for (let x = 1; x < 16; x += 2) R(g, '#c8bc6c', x, 0, 1, 16);
    R(g, '#5c7a44', 0, 0, 16, 1); R(g, '#5c7a44', 0, 0, 1, 16);
  }
  function rug(g, v, f, n) {
    R(g, '#c8483a', 0, 0, 16, 16);
    for (const [x, y] of [[4, 4], [11, 4], [4, 11], [11, 11], [7, 7]]) R(g, '#e07a5a', x, y, 2, 2);
    if (n.u !== 'R') R(g, '#e8c060', 0, 0, 16, 2);
    if (n.d !== 'R') R(g, '#e8c060', 0, 14, 16, 2);
    if (n.l !== 'R') R(g, '#e8c060', 0, 0, 2, 16);
    if (n.r !== 'R') R(g, '#e8c060', 14, 0, 2, 16);
  }
  function shelf(g, v) {
    R(g, '#6e4426', 0, 0, 16, 16); R(g, '#a06a3e', 1, 1, 14, 14);
    const r = rng(v + 40), cols = ['#c8483a', '#3a78d8', '#e8c060', '#55b98a', '#a978e0', '#f0f0e8'];
    for (const y of [1, 6, 11]) {
      R(g, '#6e4426', 1, y + 4, 14, 1);
      for (let x = 2; x < 14; x += 2) if (r() < 0.8) R(g, cols[Math.floor(r() * cols.length)], x, y + (r() < 0.3 ? 1 : 0), 2, 4 - (r() < 0.3 ? 1 : 0));
    }
  }
  function table(g) {
    wood(g, 0);
    R(g, '#0002', 1, 12, 14, 3); R(g, '#5e3a20', 2, 10, 2, 4); R(g, '#5e3a20', 12, 10, 2, 4);
    R(g, OL, 0, 2, 16, 9); R(g, '#c88a50', 1, 3, 14, 7); R(g, '#e0a868', 1, 3, 14, 1); R(g, '#9a6638', 1, 9, 14, 1);
  }
  function plant(g, v) {
    wood(g, v);
    R(g, OL, 4, 9, 8, 7); R(g, '#c86a3a', 5, 10, 6, 5); R(g, '#e08a5a', 5, 10, 6, 1);
    pat(g, ['...oo.oo...', '..ollolllo.', '.ollmllmmlo', '.olmmmmmmmo', '..ommmmmmo.', '...oooooo..'], 2, 4, { o: '#1f4a2a', l: '#62bf5a', m: '#3f9a48' });
  }
  function bedTop(g) { wood(g, 0); R(g, OL, 1, 1, 14, 15); R(g, '#8a5a34', 2, 2, 12, 14); R(g, '#f4f4f0', 3, 3, 10, 13); R(g, '#ffffff', 4, 4, 8, 5); R(g, '#c8c8d0', 4, 8, 8, 1); R(g, '#5a8ad8', 3, 12, 10, 4); R(g, '#7aa6ea', 3, 12, 10, 1); }
  function bedLow(g) { wood(g, 0); R(g, OL, 1, 0, 14, 15); R(g, '#5a8ad8', 2, 0, 12, 12); R(g, '#4a74c0', 2, 9, 12, 3); R(g, '#8a5a34', 2, 12, 12, 2); }
  function counter(g) {
    R(g, '#8a5a34', 0, 0, 16, 16); R(g, '#c8925a', 0, 0, 16, 6); R(g, '#e0b07a', 0, 0, 16, 1); R(g, '#6e4426', 0, 6, 16, 1);
    for (const x of [3, 8, 13]) R(g, '#7a4c2c', x, 8, 1, 7);
  }
  function mat(g) { wood(g, 1); R(g, OL, 1, 3, 14, 11); R(g, '#a03a2e', 2, 4, 12, 9); R(g, '#d86a50', 3, 5, 10, 1); R(g, '#d86a50', 3, 11, 10, 1); }
  function tfloor(g) {
    R(g, '#cdbfa6', 0, 0, 16, 16); R(g, '#ddd2bc', 0, 0, 16, 1); R(g, '#ddd2bc', 0, 8, 16, 1);
    R(g, '#ab9b82', 0, 7, 16, 1); R(g, '#ab9b82', 0, 15, 16, 1); R(g, '#ab9b82', 7, 0, 1, 7); R(g, '#ab9b82', 15, 8, 1, 7);
  }
  function twall(g, v, f, n) {
    if (n.d === 'G' || n.d === undefined) { // in cima al muro: tegole scure
      R(g, '#4a2420', 0, 0, 16, 16);
      for (let y = 1; y < 16; y += 4) R(g, '#6a3a30', 0, y, 16, 2);
      for (let x = 3; x < 16; x += 4) R(g, '#3a1a18', x, 0, 1, 16);
    } else {
      R(g, '#b8322a', 0, 0, 16, 16); R(g, '#e0b040', 0, 2, 16, 2); R(g, '#f4d070', 0, 2, 16, 1);
      R(g, '#d24a3a', 0, 5, 16, 1); R(g, '#8a2420', 0, 12, 16, 4);
    }
  }
  const LANTERN = [
    '................', '......oooo......', '.....ommmmo.....', '....ommmmmmo....', '...oooooooooo...', '.....oyyyyo.....',
    '.....oyrryo.....', '.....oyyyyo.....', '....oooooooo....', '......omo.......', '......omo.......', '.....ommmo......',
    '....ommmmmo.....', '...ommmmmmmo....', '...ooooooooo....', '................',
  ];
  function lantern(g) { tfloor(g); pat(g, LANTERN, 0, 0, { o: '#3a3a40', m: '#a8a8a0', y: '#ffd860', r: '#ff8a3a' }); }
  function lamp(g) {
    pave(g);
    pat(g, ['......oooo......', '.....oyyyyo.....', '.....oyyyyo.....', '......oooo......'], 0, 0, { o: '#202028', y: '#ffe08a' });
    R(g, '#202028', 7, 4, 2, 10); R(g, '#484858', 7, 4, 1, 10); R(g, '#202028', 5, 14, 6, 2);
  }
  function phone(g) {
    pave(g);
    R(g, OL, 3, 0, 10, 16); R(g, '#d0302a', 4, 1, 8, 14); R(g, '#f0f0e8', 5, 2, 6, 1);
    for (const y of [4, 8]) { R(g, '#bfe0f0', 5, y, 2, 3); R(g, '#bfe0f0', 9, y, 2, 3); }
    R(g, '#a02420', 4, 13, 8, 2);
  }
  function voidT(g) { R(g, '#000', 0, 0, 16, 16); }

  // ch: { p: pittore, v: varianti, a: animata, n: guarda i vicini, solid }
  const TILES = {
    '.': { p: grass, v: 4 }, ',': { p: tall }, ':': { p: dirt, v: 4, n: 1 }, '=': { p: pave }, '*': { p: flowers, v: 4, a: 1 },
    '~': { p: water, a: 1, n: 1, solid: 1 }, 'T': { p: treeOf('#1f4a2a', '#2e7a3a', '#3f9a48', '#62bf5a'), solid: 1 },
    'K': { p: treeOf('#7a3050', '#d2789c', '#eea0bf', '#ffd2e4'), solid: 1 }, 'Y': { p: bamboo, solid: 1 },
    'f': { p: fence, solid: 1 }, 'v': { p: ledge, v: 4, solid: 1 }, 'r': { p: rock, solid: 1 }, 'o': { p: boulder, v: 4, solid: 1 },
    'M': { p: mountain, v: 4, n: 1, solid: 1 }, 'O': { p: caveMouth }, '#': { p: caveWall, v: 4, n: 1, solid: 1 }, 'c': { p: caveFloor, v: 4 },
    'b': { p: bridge, n: 1 }, 'W': { p: wall, n: 1, solid: 1 }, 'w': { p: wood, v: 2 }, 'm': { p: tatami, v: 2 }, 'R': { p: rug, n: 1 },
    'x': { p: shelf, v: 4, solid: 1 }, 'q': { p: table, solid: 1 }, 'p': { p: plant, solid: 1 }, 'l': { p: bedTop, solid: 1 }, 'j': { p: bedLow, solid: 1 },
    'k': { p: counter, solid: 1 }, 'e': { p: mat }, 'g': { p: tfloor }, 'G': { p: twall, n: 1, solid: 1 }, 'L': { p: lantern, solid: 1 },
    'i': { p: lamp, solid: 1 }, 'U': { p: phone, solid: 1 }, '0': { p: voidT, solid: 1 },
  };
  const tileCache = new Map();
  let animF = 0;
  function tileImg(x, y, edge) {
    let ch = tileAt(x, y);
    if (ch === undefined) ch = edge;
    const T = TILES[ch] || TILES['0'];
    const v = T.v ? hash(x, y) % T.v : 0, f = T.a ? animF : 0;
    let key = ch + v + f, n = {};
    if (T.n) { n = { u: tileAt(x, y - 1), d: tileAt(x, y + 1), l: tileAt(x - 1, y), r: tileAt(x + 1, y) }; key += [n.u, n.d, n.l, n.r].map(c => c || '_').join(''); }
    let c = tileCache.get(key);
    if (!c) { c = cv(TS, TS); T.p(c.getContext('2d'), v, f, n); tileCache.set(key, c); }
    return c;
  }

  // ------------------------------------------------------------ edifici (disegnati una volta per mappa)
  function taijitu(g, cx, cy, r) {
    for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
      const d = Math.hypot(x, y);
      if (d > r + 0.5) continue;
      let c = d > r - 0.6 ? OL : x < 0 ? '#ffffff' : OL;
      if (d <= r - 0.6) {
        if (Math.hypot(x, y + r / 2) < r / 2) c = '#ffffff';
        if (Math.hypot(x, y - r / 2) < r / 2) c = OL;
        if (Math.hypot(x, y + r / 2) < 1) c = OL;
        if (Math.hypot(x, y - r / 2) < 1) c = '#ffffff';
      }
      R(g, c, cx + x, cy + y, 1, 1);
    }
  }
  function roofGable(g, W, h, col) {
    const dark = shade(col, -0.3), light = shade(col, 0.25);
    R(g, OL, 0, 0, W, h + 1); R(g, col, 1, 1, W - 2, h - 2);
    for (let y = 4, k = 0; y < h - 2; y += 4, k++) { R(g, dark, 1, y, W - 2, 1); for (let x = k % 2 ? 4 : 8; x < W - 2; x += 8) R(g, dark, x, y - 3, 1, 3); }
    R(g, light, 1, 1, W - 2, 2); R(g, dark, 1, h - 2, W - 2, 2);
  }
  function roofPagoda(g, W, h, col) {
    const dark = shade(col, -0.35), light = shade(col, 0.3), y0 = Math.round(h * 0.45);
    const tier = (top, bot, x0, x1) => {
      for (let y = top; y < bot; y++) {
        const ins = Math.round((bot - 1 - y) * 0.7), l = x0 + ins, w = x1 - x0 - ins * 2;
        R(g, OL, l, y, w, 1); R(g, y >= bot - 2 ? dark : (y - top) % 3 === 1 ? light : col, l + 1, y, w - 2, 1);
      }
      R(g, OL, x0, bot - 5, 3, 4); R(g, light, x0 + 1, bot - 4, 1, 2); R(g, OL, x1 - 3, bot - 5, 3, 4); R(g, light, x1 - 2, bot - 4, 1, 2);
    };
    const w2 = Math.round(W * 0.6), x2 = Math.round((W - w2) / 2);
    R(g, '#3a2018', x2 + 2, y0 - 3, w2 - 4, 4);
    tier(y0, h, 0, W);
    tier(1, y0 - 1, x2, x2 + w2);
    R(g, '#e0b040', x2 + 2, y0 - 1, w2 - 4, 1);
  }
  const BCACHE = new Map();
  function building(b) {
    const key = [b.k, b.w, b.h, b.door, b.roof || ''].join('|');
    if (BCACHE.has(key)) return BCACHE.get(key);
    const W = b.w * TS, H = b.h * TS, c = cv(W, H), g = c.getContext('2d');
    const k = b.k, asian = k === 'dojo' || k === 'tempio' || k === 'palestra';
    const roofH = Math.round(H * (k === 'aeroporto' ? 0.32 : 0.52));
    const wallC = k === 'dojo' ? '#6e3a22' : k === 'tempio' ? '#b8322a' : k === 'aeroporto' ? '#eef2f6' : b.wall || '#f3e7cc';
    R(g, OL, 1, roofH - 2, W - 2, H - roofH + 2);
    R(g, wallC, 2, roofH, W - 4, H - roofH - 1);
    R(g, shade(wallC, -0.18), 2, H - 4, W - 4, 3);
    const dx = b.door * TS + 3;
    // finestre o colonne, lasciando libera la porta
    for (let i = 0; i < b.w; i++) {
      if (Math.abs(i - b.door) < 1) continue;
      const x = i * TS;
      if (asian) { R(g, OL, x + (i ? 0 : 2), roofH, 4, H - roofH - 1); R(g, '#c8322a', x + (i ? 1 : 3), roofH, 2, H - roofH - 1); }
      if (k === 'aeroporto') continue;
      if (H - roofH >= 22 || !asian) {
        const wy = roofH + Math.max(3, Math.round((H - roofH - 12) / 2) - 3);
        R(g, OL, x + 4, wy, 9, 8); R(g, k === 'tempio' ? '#3a2018' : '#8fd0ff', x + 5, wy + 1, 7, 6);
        if (k !== 'tempio') { R(g, '#ffffff', x + 6, wy + 2, 2, 1); R(g, '#d8f0ff', x + 5, wy + 4, 7, 1); }
        if (asian) R(g, '#e0b040', x + 8, wy + 1, 1, 6);
      }
    }
    if (k === 'aeroporto') {
      R(g, OL, 2, roofH + 3, W - 4, 9); R(g, '#7ab8e8', 3, roofH + 4, W - 6, 7);
      for (let x = 8; x < W - 4; x += 8) R(g, '#3a5a7a', x, roofH + 4, 1, 7);
      R(g, '#c6e4fa', 3, roofH + 4, W - 6, 1);
    }
    // porta
    const doorC = k === 'bottega' || k === 'aeroporto' ? '#9fd4ff' : asian ? '#b8322a' : '#8a5a34';
    R(g, OL, dx - 1, H - 15, 12, 15); R(g, doorC, dx, H - 14, 10, 14);
    if (k === 'bottega' || k === 'aeroporto') { R(g, '#3a5a8a', dx + 4, H - 14, 2, 14); R(g, '#ffffff', dx + 1, H - 12, 2, 1); }
    else if (asian) { R(g, '#e0b040', dx + 2, H - 9, 2, 2); R(g, '#e0b040', dx + 6, H - 9, 2, 2); R(g, '#8a2420', dx + 4, H - 14, 2, 14); }
    else { R(g, shade(doorC, -0.3), dx + 1, H - 13, 8, 1); R(g, '#e0b040', dx + 7, H - 7, 2, 2); }
    // tetto
    if (k === 'aeroporto') { R(g, OL, 0, 0, W, roofH); R(g, '#9aa8b8', 1, 1, W - 2, roofH - 2); R(g, '#c4d0dc', 1, 1, W - 2, 2); R(g, '#7a8898', 1, roofH - 3, W - 2, 2); }
    else if (asian) roofPagoda(g, W, roofH, b.roof || (k === 'dojo' ? '#e8631c' : k === 'tempio' ? '#2f7a72' : '#3a8a5a'));
    else roofGable(g, W, roofH, b.roof || '#d8503c');
    // insegne
    const sx = Math.round(W / 2);
    if (k === 'bottega') { R(g, OL, sx - 8, roofH - 6, 16, 11); R(g, '#2a5ab0', sx - 7, roofH - 5, 14, 9); R(g, '#ffffff', sx - 3, roofH - 4, 6, 7); R(g, '#e8631c', sx - 3, roofH - 4, 6, 2); }
    if (asian) { R(g, OL, sx - 8, Math.round(roofH * 0.45) - 8, 17, 15); R(g, '#e0b040', sx - 7, Math.round(roofH * 0.45) - 7, 15, 13); taijitu(g, sx, Math.round(roofH * 0.45) - 1, 5); }
    if (k === 'aeroporto') { R(g, OL, sx - 9, 2, 18, 9); R(g, '#ffffff', sx - 8, 3, 16, 7); pat(g, ['....o.....', 'oooooooooo', '....o.....', '...oo.....'], sx - 5, 4, { o: '#2a5ab0' }); }
    BCACHE.set(key, c);
    return c;
  }

  // ------------------------------------------------------------ personaggi: pixel art 16×20 con i colori a scelta
  // o contorno · h/H/g capelli (base, luce, ombra) · s/S pelle · e occhi · c giacca · d dettagli · b cintura · p pantaloni · k scarpe
  const FRONT = ['........', '....oooo', '..oohhhh', '.ohhhhhH', '.ohhhhHH', 'ohhhhhhh', 'ohhhhhhh', 'ohhghhhh', 'ohhsssss', 'ohsssess', 'ohsssess', '.oSsssss', '..ooSsss', '..occcdd', '.occcccd', '.occcccd', '.osbbbbb'];
  const BACK = ['........', '....oooo', '..oohhhh', '.ohhhhhh', '.ohhhhhh', 'ohhhhhHh', 'ohhhhHhh', 'ohhhhhhh', 'ohhhhhhh', 'ohghhhhh', 'ohgghhhh', '.oggghhh', '..oogggg', '..occccc', '.occcccc', '.occcccc', '.osbbbbb'];
  const LEGS = { stand: ['..oppppp', '..oppppo', '..okkkko'], lift: ['..oppppo', '..okkkko', '........'] };
  const SIDE = [
    '................', '......oooo......', '....oohhhhoo....', '...ohhhhHHhho...', '..ohhhhhHhhhho..', '.ohhhhhhhhhhhho.',
    '.ohhhhhhhhhhhho.', '.ohhhhhhhhhhgho.', '.osshhhhhhhhgho.', '.osesshhhhhhgho.', '.osesshhhhhggo..', '..oSssshhhggo...',
    '...ooSsssooo....', '....occcdcco....', '...occcccdcco...', '...occsscdcco...', '....obbbbbbo....',
  ];
  const SIDE_LEGS = { stand: ['....oppppo......', '....oppppo......', '...okkkkko......'], walk: ['...oppppppo.....', '..oppo.oppo.....', '.okko..okkko....'] };
  const SHEETS = new Map();
  function sheet(L) {
    const key = JSON.stringify(L);
    if (SHEETS.has(key)) return SHEETS.get(key);
    const sk = L.s || '#f2c8a0';
    const col = { o: OL, h: L.h, H: shade(L.h, 0.3), g: shade(L.h, -0.3), s: sk, S: shade(sk, -0.18), e: OL,
      c: L.c, d: L.d || shade(L.c, 0.55), b: L.b || OL, p: L.p || shade(L.c, -0.45), k: L.k || OL };
    const mirror = rows => rows.map(r => r + r.split('').reverse().join(''));
    const set = (rows, r, c, ch) => { rows[r] = rows[r].slice(0, c) + ch + rows[r].slice(c + 1); };
    const front = mirror(FRONT), back = mirror(BACK), side = SIDE.slice();
    if (L.style === 'long') {
      for (let r = 11; r <= 14; r++) { set(front, r, 0, 'o'); set(front, r, 1, 'h'); set(front, r, 15, 'o'); set(front, r, 14, 'h'); }
      for (let r = 12; r <= 15; r++) back[r] = '.ohhhhhhhhhhhho.';
      for (let r = 10; r <= 14; r++) { set(side, r, 10, 'h'); set(side, r, 11, 'h'); set(side, r, 12, 'g'); set(side, r, 13, 'o'); }
    }
    if (L.style === 'bun') {
      for (const rows of [front, back]) { for (let c = 6; c <= 9; c++) { set(rows, 0, c, 'o'); set(rows, 1, c, 'H'); } }
      for (let c = 10; c <= 12; c++) { set(side, 0, c, 'o'); set(side, 1, c, 'H'); }
      set(side, 1, 13, 'o');
    }
    const legs = (l, r) => l.map((row, i) => row + r[i].split('').reverse().join(''));
    const mk = rows => { const c = cv(16, 20); pat(c.getContext('2d'), rows, 0, 0, col); return c; };
    const fs = legs(LEGS.stand, LEGS.stand), f1 = legs(LEGS.lift, LEGS.stand), f2 = legs(LEGS.stand, LEGS.lift);
    const sh = {
      down: [mk(front.concat(fs)), mk(front.concat(f1)), mk(front.concat(f2))],
      up: [mk(back.concat(fs)), mk(back.concat(f1)), mk(back.concat(f2))],
      left: [mk(side.concat(SIDE_LEGS.stand)), mk(side.concat(SIDE_LEGS.walk)), mk(side.concat(SIDE_LEGS.stand))],
    };
    SHEETS.set(key, sh);
    return sh;
  }
  const BUBBLE = ['.oooooo.', 'owwwwwwo', 'owwrrwwo', 'owwrrwwo', 'owwrrwwo', 'owwwwwwo', 'owwrrwwo', 'owwwwwwo', '.oooooo.', '...oo...'];
  function signImg() {
    const c = cv(16, 16), g = c.getContext('2d');
    R(g, '#0002', 4, 14, 9, 2); R(g, OL, 7, 8, 3, 7); R(g, '#8a5a34', 8, 8, 1, 7);
    R(g, OL, 1, 1, 15, 9); R(g, '#d8a868', 2, 2, 13, 7); R(g, '#f0c890', 2, 2, 13, 1); R(g, '#9a6e3e', 4, 4, 9, 1); R(g, '#9a6e3e', 4, 6, 7, 1);
    return c;
  }
  function scrollImg(f) {
    const c = cv(16, 16), g = c.getContext('2d');
    R(g, '#0003', 3, 12, 10, 2); R(g, OL, 3, 5, 10, 7); R(g, '#f4e6c0', 4, 6, 8, 5); R(g, '#d8c08a', 4, 10, 8, 1);
    R(g, '#e8d4a0', 3, 6, 1, 5); R(g, '#e8d4a0', 12, 6, 1, 5); R(g, '#c8322a', 7, 5, 2, 7);
    if (f) { R(g, '#ffffff', 11, 3, 1, 3); R(g, '#ffffff', 10, 4, 3, 1); }
    return c;
  }
  const SIGN_IMG = signImg(), SCROLL_IMG = [scrollImg(0), scrollImg(1)];

  // ------------------------------------------------------------ stato del viaggio (salvato sul telefono)
  let s = null;
  function fresh() {
    return { v: 1, name: 'Allievo', look: null, map: 'casa_mia', x: 5, y: 3, dir: 'down', money: 500, scrolls: 0,
      cards: {}, team: [], badges: [], flags: {}, seen: [], back: null, check: { map: 'lancenigo', x: 11, y: 9 }, time: 0 };
  }
  function readSave() { try { const v = JSON.parse(localStorage.getItem(SAVE)); return v && v.v === 1 ? v : null; } catch (e) { return null; } }
  function save() {
    if (!s || !MAP) return;
    if (!P.mv) { s.map = MAP.id; s.x = P.x; s.y = P.y; s.dir = P.dir; }
    try { localStorage.setItem(SAVE, JSON.stringify(s)); } catch (e) { /* memoria piena o non disponibile */ }
  }
  const teamCost = ids => ids.reduce((t, id) => t + (S.CARD[id] ? S.CARD[id].cost : 0), 0);
  const xpNeed = lv => 40 + 30 * lv;
  const statAt = (id, lv) => { const c = S.CARD[id], k = 1 + 0.04 * (lv - 1); return { hp: Math.round(c.hp * k), atk: Math.round(c.atk * k), def: Math.round(c.def * k) }; };
  function seen(id) { if (!s.seen.includes(id)) s.seen.push(id); }
  function addCard(id, lv) {
    const c = s.cards[id];
    if (c) c.n++;
    else s.cards[id] = { n: 1, lv: lv || 1, xp: 0 };
    seen(id);
    if (!s.team.includes(id) && s.team.length < S.TEAM_SIZE && teamCost(s.team.concat(id)) <= S.BUDGET) s.team.push(id);
    if (S.UI && S.UI.unlockCards) S.UI.unlockCards([id]);
  }
  function removeCard(id) {
    const c = s.cards[id];
    if (!c) return;
    if (--c.n <= 0) { delete s.cards[id]; s.team = s.team.filter(x => x !== id); }
  }

  // ------------------------------------------------------------ mappa corrente
  let MAP = null;
  const P = { x: 0, y: 0, dir: 'down', mv: null, step: 0, px: 0, py: 0, hop: 0, look: null };
  let npcs = [];
  const tileAt = (x, y) => (MAP && y >= 0 && y < MAP.H && x >= 0 && x < MAP.W ? MAP.rows[y][x] : undefined);
  const trKey = n => `tr:${MAP.id}:${n.def.id}`;
  const beaten = n => !!s.flags[trKey(n)];
  function visible(d) {
    if (d.where && !(s.back && (s.back.room || s.back.map) === d.where)) return false; // case con lo stesso interno: chi c'è dipende dalla porta
    if (d.show && !d.show(s)) return false;
    if (d.hide && d.hide(s)) return false;
    if (d.trainer && d.trainer.vanish && s.flags[`tr:${MAP.id}:${d.id}`]) return false;
    return true;
  }
  function enterMap(id, x, y, dir) {
    const d = M.maps[id];
    MAP = { id, def: d, rows: d.tiles, W: d.tiles[0].length, H: d.tiles.length, bld: [], items: [], signs: d.signs || [] };
    MAP.edge = d.edge || (d.inside ? '0' : 'T');
    MAP.block = d.tiles.map(r => r.split('').map(ch => !!(TILES[ch] && TILES[ch].solid)));
    for (const b of d.bld || []) {
      const o = Object.assign({ img: building(b), dx: b.x + b.door, dy: b.y + b.h - 1 }, b);
      for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) MAP.block[b.y + j][b.x + i] = true;
      MAP.block[o.dy][o.dx] = false;
      MAP.bld.push(o);
    }
    MAP.signs.forEach(o => { MAP.block[o.y][o.x] = true; });
    (d.items || []).forEach((it, i) => { if (!s.flags[`it:${id}:${i}`]) { MAP.items.push(Object.assign({ i }, it)); MAP.block[it.y][it.x] = true; } });
    npcs = (d.npc || []).filter(visible).map(n => ({ def: n, x: n.x, y: n.y, hx: n.x, hy: n.y, dir: n.dir || 'down', mv: null, step: 0, px: n.x * TS, py: n.y * TS, hop: 0, next: performance.now() + 1000 + Math.random() * 2000 }));
    Object.assign(P, { x, y, dir: dir || P.dir, mv: null, px: x * TS, py: y * TS, hop: 0 });
    s.flags['visto:' + id] = 1;
    if (d.check) s.check = { map: id, x: d.check[0], y: d.check[1] };
    setTrack(d.music || 'mondo');
    grace = 2;
    if (d.name && !d.inside) showPlace(d.name);
    save();
  }
  function refreshNpcs() { npcs = npcs.filter(n => visible(n.def)); }
  function free(x, y, who) {
    if (x < 0 || y < 0 || x >= MAP.W || y >= MAP.H || MAP.block[y][x]) return false;
    if (who !== P && P.x === x && P.y === y) return false;
    return !npcs.some(n => n !== who && n.x === x && n.y === y);
  }
  const seeThrough = (x, y) => x >= 0 && y >= 0 && x < MAP.W && y < MAP.H && !MAP.block[y][x];

  // ------------------------------------------------------------ movimento
  function startMove(c, x, y, dur, jump) {
    c.mv = { fx: c.x, fy: c.y, t: 0, dur, jump };
    c.x = x; c.y = y; c.step++;
  }
  function tryMove(c, dir, run) {
    c.dir = dir;
    const [dx, dy] = DIRS[dir], nx = c.x + dx, ny = c.y + dy;
    if (c === P && dir === 'down' && tileAt(nx, ny) === 'v') {
      if (!free(nx, ny + 1, c)) return false;
      startMove(c, nx, ny + 1, STEP * 2, true); sfx('jump');
      return true;
    }
    if (!free(nx, ny, c)) return false;
    startMove(c, nx, ny, run ? STEP / 2 : STEP);
    return true;
  }
  function advance(c, dt) {
    if (!c.mv) { c.px = c.x * TS; c.py = c.y * TS; c.hop = 0; return false; }
    const m = c.mv;
    m.t += dt;
    const k = Math.min(1, m.t / m.dur);
    c.px = (m.fx + (c.x - m.fx) * k) * TS; c.py = (m.fy + (c.y - m.fy) * k) * TS;
    c.hop = m.jump ? Math.sin(k * Math.PI) * 9 : 0;
    if (k < 1) return false;
    c.mv = null; c.px = c.x * TS; c.py = c.y * TS; c.hop = 0;
    if (c.done) { const f = c.done; c.done = null; f(); }
    return true;
  }
  // un png (o il giocatore) fa n passi: si aspetta che arrivi
  function walk(c, dir, n) {
    return new Promise(async res => {
      for (let i = 0; i < (n || 1); i++) {
        if (!tryMove(c, dir)) { c.dir = dir; break; }
        await new Promise(r => { c.done = r; });
      }
      res();
    });
  }

  // ------------------------------------------------------------ comandi (tastiera, croce direzionale, A e B)
  const keys = { held: [], since: 0, run: false };
  function press(d) { if (!keys.held.includes(d)) { keys.held.push(d); keys.since = performance.now(); } }
  function release(d) { if (keys.held.includes(d)) { keys.held = keys.held.filter(x => x !== d); keys.since = performance.now(); } }
  const curDir = () => keys.held[keys.held.length - 1];
  let lockN = 0, grace = 0, bumpAt = 0;
  const panelOpen = () => !!el && !el.panel.hidden;
  const busy = () => lockN > 0 || panelOpen() || menuOpen;
  async function run(fn) {
    lockN++;
    keys.held = [];
    try { await fn(); } catch (e) { console.error(e); }
    finally {
      lockN--;
      if (!lockN) { el.box.hidden = true; el.choice.hidden = true; refreshNpcs(); save(); hud(); if (MAP && playing) setTrack(MAP.def.music || 'mondo'); }
    }
  }

  // ------------------------------------------------------------ ciclo di gioco
  let raf = 0, last = 0, playing = false;
  function loop(ts) {
    if (!playing) return;
    const dt = Math.min(50, ts - (last || ts));
    last = ts;
    s.time += dt / 1000;
    animF = Math.floor(ts / 520) % 2;
    update(dt, ts);
    draw(ts);
    raf = requestAnimationFrame(loop);
  }
  function startLoop() { if (playing) return; playing = true; last = 0; resize(); raf = requestAnimationFrame(loop); }
  function stopLoop() { playing = false; cancelAnimationFrame(raf); keys.held = []; }

  function update(dt, now) {
    for (const n of npcs) advance(n, dt);
    if (advance(P, dt) && !lockN) arrived(); // i passi guidati dagli script non aprono porte né eventi
    if (!busy() && !P.mv) {
      const d = curDir();
      if (d) {
        if (d !== P.dir && now - keys.since < 120) P.dir = d; // tocco breve: si gira sul posto
        else if (!tryMove(P, d, keys.run)) { P.dir = d; if (now - bumpAt > 350) { bumpAt = now; sfx('bump'); } }
      }
    }
    // i png si muovono da soli quando non succede niente
    if (busy()) return;
    for (const n of npcs) {
      const mv = n.def.move;
      if (!mv || n.mv || now < n.next) continue;
      n.next = now + 1400 + Math.random() * 2600;
      if (mv === 'turn') { n.dir = pick(n.def.dirs || ['up', 'down', 'left', 'right']); if (spot()) return; }
      else if (mv === 'wander') {
        const d = pick(Object.keys(DIRS)), [dx, dy] = DIRS[d];
        if (Math.abs(n.x + dx - n.hx) <= 2 && Math.abs(n.y + dy - n.hy) <= 2) tryMove(n, d); else n.dir = d;
      }
    }
  }

  // il giocatore ha finito un passo: porte, uscite, eventi, allenatori, spiriti nell'erba
  function arrived() {
    const d = MAP.def;
    const door = MAP.bld.find(b => b.dx === P.x && b.dy === P.y);
    if (door) { s.back = { map: MAP.id, x: P.x, y: P.y + 1, room: door.room }; sfx('door'); run(() => warp(door.to, M.maps[door.to].entry[0], M.maps[door.to].entry[1], 'up')); return; }
    const ex = (d.exits || []).find(e => P.x >= e.x && P.x < e.x + (e.w || 1) && P.y >= e.y && P.y < e.y + (e.h || 1));
    if (ex) {
      if (ex.to === '@back') { sfx('door'); run(() => warp(s.back.map, s.back.x, s.back.y, 'down')); }
      else run(() => warp(ex.to, ex.tx + (P.x - ex.x), ex.ty + (P.y - ex.y), P.dir));
      return;
    }
    if (tileAt(P.x, P.y) === 'O') { const c = d.cave; run(() => warp(c.to, c.tx, c.ty, c.dir || 'up')); return; }
    const tr = (d.trig || []).find(t => P.x >= t.x && P.x < t.x + (t.w || 1) && P.y >= t.y && P.y < t.y + (t.h || 1) && (!t.if || t.if(s)));
    if (tr) { run(() => tr.run(W)); return; }
    if (spot()) return;
    if (grace > 0) { grace--; return; }
    const w = d.wild;
    if (w && (w.on || ',').includes(tileAt(P.x, P.y)) && Math.random() < (w.rate || 0.08)) run(wildBattle);
  }
  // un allenatore ti vede?
  function spot() {
    for (const n of npcs) {
      const tr = n.def.trainer;
      if (!tr || beaten(n) || n.mv) continue;
      const [dx, dy] = DIRS[n.dir];
      for (let i = 1; i <= (tr.sight || 4); i++) {
        const x = n.x + dx * i, y = n.y + dy * i;
        if (P.x === x && P.y === y) { run(() => spotted(n, i)); return true; }
        if (!seeThrough(x, y) || npcs.some(o => o.x === x && o.y === y)) break;
      }
    }
    return false;
  }
  async function spotted(n, dist) {
    sfx('alert');
    n.bubble = performance.now() + 750;
    await sleep(750);
    for (let i = 1; i < dist; i++) await walk(n, n.dir);
    P.dir = OPP[n.dir];
    await fight(n);
  }

  // ------------------------------------------------------------ disegno
  let ctx = null, cw = 0, chh = 0, scale = 3;
  function resize() {
    if (!el) return;
    const r = el.top.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
    cw = Math.max(1, Math.round(r.width * dpr)); chh = Math.max(1, Math.round(r.height * dpr));
    el.cv.width = cw; el.cv.height = chh;
    scale = Math.max(1, Math.round(Math.min(cw / (TS * 10), chh / (TS * 8)))); // circa 10×8 caselle, a pixel interi
  }
  function drawChar(g, c, now) {
    const sh = sheet(c === P ? P.look : M.LOOKS[c.def.look] || M.LOOKS.gente);
    const half = c.mv && c.mv.t / c.mv.dur < 0.5;
    const fr = half ? (c.step % 2 ? 1 : 2) : 0;
    const img = sh[c.dir === 'right' ? 'left' : c.dir][fr];
    const x = Math.round(c.px), y = Math.round(c.py) - 5 - (fr ? 1 : 0) - Math.round(c.hop);
    R(g, 'rgba(0,0,0,.2)', x + 3, Math.round(c.py) + 13, 10, 2); R(g, 'rgba(0,0,0,.2)', x + 4, Math.round(c.py) + 15, 8, 1);
    if (c.dir === 'right') { g.save(); g.translate(x + 16, y); g.scale(-1, 1); g.drawImage(img, 0, 0); g.restore(); }
    else g.drawImage(img, x, y);
    if (c.bubble > now) pat(g, BUBBLE, x + 4, y - 12, { o: OL, w: '#ffffff', r: '#d8412f' });
  }
  function draw(now) {
    const g = el.cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    R(g, '#000', 0, 0, cw, chh);
    if (!MAP) return;
    const vw = cw / scale, vh = chh / scale, mw = MAP.W * TS, mh = MAP.H * TS;
    let camX = P.px + 8 - vw / 2, camY = P.py + 8 - vh / 2;
    camX = mw > vw ? clamp(camX, 0, mw - vw) : (mw - vw) / 2;
    camY = mh > vh ? clamp(camY, 0, mh - vh) : (mh - vh) / 2;
    camX = Math.round(camX * scale) / scale; camY = Math.round(camY * scale) / scale;
    g.setTransform(scale, 0, 0, scale, -camX * scale, -camY * scale);
    const x0 = Math.floor(camX / TS), y0 = Math.floor(camY / TS), x1 = Math.ceil((camX + vw) / TS), y1 = Math.ceil((camY + vh) / TS);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (MAP.def.inside && tileAt(x, y) === undefined) continue;
      g.drawImage(tileImg(x, y, MAP.edge), x * TS, y * TS);
    }
    // oggetti ordinati dall'alto in basso
    const list = [];
    for (const b of MAP.bld) list.push([b.y + b.h - 1, 0, () => g.drawImage(b.img, b.x * TS, b.y * TS)]);
    for (const o of MAP.signs) list.push([o.y, 0, () => g.drawImage(SIGN_IMG, o.x * TS, o.y * TS)]);
    for (const o of MAP.items) list.push([o.y, 0, () => g.drawImage(SCROLL_IMG[Math.floor(now / 300 + o.x) % 7 === 0 ? 1 : 0], o.x * TS, o.y * TS)]);
    for (const n of npcs) list.push([n.py / TS, 1, () => drawChar(g, n, now)]);
    list.push([P.py / TS, 1, () => drawChar(g, P, now)]);
    list.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    for (const it of list) it[2]();
    // l'erba alta copre i piedi di chi ci cammina dentro
    for (const c of npcs.concat([P])) {
      if (c.hop) continue;
      const tx = Math.floor((c.px + 8) / TS), ty = Math.floor((c.py + 8) / TS);
      if (tileAt(tx, ty) === ',') g.drawImage(tileImg(tx, ty), 0, 8, 16, 8, tx * TS, ty * TS + 8, 16, 8);
    }
    // buio delle grotte, pioggia, luce del giorno
    g.setTransform(1, 0, 0, 1, 0, 0);
    const sx = (P.px + 8 - camX) * scale, sy = (P.py + 8 - camY) * scale;
    if (MAP.def.dark) {
      const gr = g.createRadialGradient(sx, sy, 0, sx, sy, 76 * scale);
      gr.addColorStop(0, 'rgba(6,3,2,0)'); gr.addColorStop(0.44, 'rgba(6,3,2,0)');
      gr.addColorStop(0.45, 'rgba(6,3,2,.4)'); gr.addColorStop(0.66, 'rgba(6,3,2,.4)');
      gr.addColorStop(0.67, 'rgba(6,3,2,.72)'); gr.addColorStop(0.88, 'rgba(6,3,2,.72)');
      gr.addColorStop(0.89, 'rgba(6,3,2,.93)'); gr.addColorStop(1, 'rgba(6,3,2,.93)');
      g.fillStyle = gr; g.fillRect(0, 0, cw, chh);
    }
    if (MAP.def.weather === 'pioggia') {
      R(g, 'rgba(40,60,110,.16)', 0, 0, cw, chh);
      for (let i = 0; i < 90; i++) {
        const x = ((i * 97 + now * 0.12) % (cw / scale + 40) - 20) * scale, y = ((i * 53 + now * 0.45) % (chh / scale + 20) - 10) * scale;
        R(g, 'rgba(210,225,255,.55)', x, y, scale, 5 * scale); R(g, 'rgba(210,225,255,.55)', x - scale, y + 5 * scale, scale, 3 * scale);
      }
    }
    if (!MAP.def.inside && !MAP.def.dark) {
      const h = new Date().getHours();
      if (h >= 20 || h < 6) R(g, 'rgba(24,30,96,.3)', 0, 0, cw, chh);
      else if (h >= 17) R(g, 'rgba(255,128,48,.12)', 0, 0, cw, chh);
    }
  }

  // ------------------------------------------------------------ interfaccia (DOM)
  let el = null, menuOpen = false, dlg = null, cho = null;
  function build() {
    const root = document.createElement('div');
    root.className = 'st'; root.hidden = true;
    root.innerHTML = `<div class="st-wrap">
      <div class="st-top">
        <canvas aria-label="Il mondo della storia"></canvas>
        <div class="st-place" aria-live="polite"></div>
        <div class="st-fade"></div>
        <div class="st-box" hidden role="status" aria-live="polite"><span class="st-face" hidden></span><div><div class="st-who"></div><p class="st-text"></p></div><i class="st-more" aria-hidden="true">▼</i></div>
        <div class="st-choice" hidden role="listbox"></div>
        <div class="st-menu" hidden role="menu"></div>
      </div>
      <div class="st-pad">
        <div class="st-hud num"></div>
        <div class="st-dpad" aria-label="Croce direzionale"><i class="v"></i><i class="h"></i><b class="u">▲</b><b class="d">▼</b><b class="l">◀</b><b class="r">▶</b></div>
        <button class="st-start" data-st="menu" aria-label="Menu">MENU</button>
        <div class="st-ab"><button class="st-b" aria-label="Pulsante B: annulla, tieni premuto per correre">B</button><button class="st-a" aria-label="Pulsante A: parla, esamina, conferma">A</button></div>
      </div>
      <div class="st-panel" hidden></div>
    </div>`;
    document.body.appendChild(root);
    const q = c => root.querySelector(c);
    el = { root, top: q('.st-top'), cv: q('canvas'), place: q('.st-place'), fade: q('.st-fade'), box: q('.st-box'), face: q('.st-face'), who: q('.st-who'), text: q('.st-text'), more: q('.st-more'),
      choice: q('.st-choice'), menu: q('.st-menu'), panel: q('.st-panel'), hud: q('.st-hud'), dpad: q('.st-dpad') };
    // croce direzionale: si può strisciare da una direzione all'altra senza staccare il dito
    let padDir = null;
    const padAt = e => {
      const r = el.dpad.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      if (Math.hypot(x, y) < 12) return null;
      return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
    };
    const padSet = d => { if (d === padDir) return; if (padDir) release(padDir); padDir = d; if (d) { if (window.Sound) Sound.unlock(); if (cho || menuOpen) navigate(d); else press(d); } };
    el.dpad.addEventListener('pointerdown', e => { e.preventDefault(); el.dpad.setPointerCapture(e.pointerId); padSet(padAt(e)); });
    el.dpad.addEventListener('pointermove', e => { if (padDir !== null || e.buttons) padSet(padAt(e)); });
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) el.dpad.addEventListener(t, () => padSet(null));
    const btn = (c, down, up) => { const b = q(c); b.addEventListener('pointerdown', e => { e.preventDefault(); if (window.Sound) Sound.unlock(); down(); }); if (up) for (const t of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(t, up); };
    btn('.st-a', pressA);
    btn('.st-b', () => { keys.run = true; pressB(); }, () => { keys.run = false; });
    root.addEventListener('click', onClick);
    el.box.addEventListener('click', () => pressA());
    window.addEventListener('resize', () => { if (playing) resize(); });
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', e => { const d = KEYDIR[e.key]; if (d) release(d); if ('xX'.includes(e.key) || e.key === 'Shift') keys.run = false; });
  }
  const KEYDIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  function onKey(e) {
    if (!el || el.root.hidden) return;
    if (panelOpen()) { if (e.key === 'Escape' || e.key === 'x' || e.key === 'X') { const c = el.panel.querySelector('[data-close]'); if (c) c.click(); } return; }
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const d = KEYDIR[e.key];
    if (d) { e.preventDefault(); if (e.repeat && (cho || menuOpen)) return; if (cho || menuOpen) navigate(d); else press(d); return; }
    if (e.repeat) return;
    if (e.key === 'z' || e.key === 'Z' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pressA(); }
    else if (e.key === 'x' || e.key === 'X' || e.key === 'Backspace' || e.key === 'Shift') { e.preventDefault(); keys.run = true; pressB(); }
    else if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') { e.preventDefault(); if (menuOpen) closeMenu(); else if (!busy() && !P.mv) openMenu(); }
  }
  function navigate(d) {
    if (cho) { cho.i = (cho.i + (d === 'up' ? -1 : d === 'down' ? 1 : 0) + cho.opts.length) % cho.opts.length; drawChoice(); return; }
    if (menuOpen) {
      const bs = [...el.menu.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
      bs[(i + (d === 'up' ? -1 : 1) + bs.length) % bs.length].focus();
    }
  }
  function pressA() {
    if (dlg) { if (dlg.done) { const r = dlg.res; dlg = null; r(); } else dlg.finish(); return; }
    if (cho) { choosePick(cho.i); return; }
    if (menuOpen) { const b = el.menu.querySelector('button:focus') || el.menu.querySelector('button'); b.click(); return; }
    if (busy() || P.mv) return;
    interact();
  }
  function pressB() {
    if (dlg) { pressA(); return; }
    if (cho) { choosePick(cho.opts.length - 1); return; }
    if (menuOpen) closeMenu();
  }
  function hud() {
    if (!el || !s) return;
    el.hud.innerHTML = `<span>₵ ${s.money}</span><span>📜 ${s.scrolls}</span><span>${[0, 1, 2, 3].map(i => `<i class="${s.badges.length > i ? 'on' : ''}"></i>`).join('')}</span>`;
  }
  function showPlace(name) { el.place.textContent = name; el.place.classList.remove('show'); void el.place.offsetWidth; el.place.classList.add('show'); }
  const fade = async on => { el.fade.className = 'st-fade' + (on ? ' on' : ''); await sleep(240); };
  async function warp(id, x, y, dir) { await fade(true); enterMap(id, x, y, dir); hud(); await sleep(60); await fade(false); }

  // ------------------------------------------------------------ dialoghi
  function setWho(who) {
    const w = who || {};
    el.who.textContent = w.name ? fmt(w.name) : '';
    el.face.hidden = !w.face;
    if (w.face) el.face.style.backgroundImage = `url(${S.img('volti/' + w.face + '.jpg')})`;
  }
  function type(text, who) {
    text = fmt(text);
    return new Promise(res => {
      el.box.hidden = false; el.more.hidden = true; setWho(who); hud();
      let i = 0;
      const t = setInterval(() => { i += 2; el.text.textContent = text.slice(0, i); if (i >= text.length) d.finish(); }, 24);
      const d = { done: false, res: null, finish() { clearInterval(t); el.text.textContent = text; this.done = true; el.more.hidden = false; res(); } };
      dlg = d;
    });
  }
  // una o più battute: si va avanti con A
  async function say(lines, who) {
    if (!lines) return;
    for (const line of [].concat(lines)) {
      await type(line, who);
      if (dlg) await new Promise(r => { dlg.res = r; });
    }
  }
  async function ask(text, opts, who) {
    await type(text, who);
    dlg = null; el.more.hidden = true;
    return new Promise(res => { cho = { i: 0, opts: opts || ['Sì', 'No'], res }; drawChoice(); });
  }
  function drawChoice() {
    el.choice.hidden = false;
    el.choice.innerHTML = cho.opts.map((o, i) => `<button role="option" data-st="cho" data-i="${i}" aria-selected="${i === cho.i}">${esc(o)}</button>`).join('');
  }
  function choosePick(i) { const c = cho; cho = null; el.choice.hidden = true; c.res(i); }

  // ------------------------------------------------------------ pannelli (carte, tessera, bottega, voli…)
  let panelDone = null;
  function panel(html, onAct) {
    el.panel.innerHTML = html; el.panel.hidden = false; el.panel.scrollTop = 0;
    el.panel.onAct = onAct;
    const b = el.panel.querySelector('.st-btn.pri, .st-btn'); if (b && !el.panel.querySelector('input')) b.focus({ preventScroll: true });
    return new Promise(res => { panelDone = res; });
  }
  function closePanel(v) { el.panel.hidden = true; el.panel.innerHTML = ''; const r = panelDone; panelDone = null; if (r) r(v); }
  // un pannello aperto sopra un altro (la bustina dentro la bottega): poi si torna a quello di prima
  async function nested(open) {
    const done = panelDone, act = el.panel.onAct;
    await open();
    panelDone = done; el.panel.onAct = act; el.panel.hidden = false;
  }
  function onClick(e) {
    const t = e.target.closest('[data-st]');
    if (!t) return;
    const a = t.dataset.st;
    if (a === 'cho' && cho) { choosePick(+t.dataset.i); return; }
    if (a === 'menu') { if (menuOpen) closeMenu(); else if (!busy() && !P.mv) openMenu(); return; }
    if (a.startsWith('m-')) { menuAct(a.slice(2)); return; }
    if (el.panel.onAct) el.panel.onAct(a, t);
  }
  const face = id => `<i class="st-f" style="background-image:url(${S.img('volti/' + id + '.jpg')})"></i>`;
  const RANKN = { A: 'Allievo', I: 'Istruttore', M: 'Maestro', L: 'Leggenda' };

  // scheda di una carta appena ottenuta
  function reveal(id, text) {
    sfx('item');
    const c = S.CARD[id], o = s.cards[id];
    return panel(`<div class="st-reveal">
      <div class="st-eyebrow">Nuova carta!</div>
      <img src="${S.img(id + '.jpg')}" alt="Carta di ${esc(c.name)}">
      <h3>${esc(fmt(text || `Hai ottenuto ${c.name}!`))}</h3>
      <p>${RANKN[c.rank]} · Lv ${o ? o.lv : 1}${o && o.n > 1 ? ` · ora ne hai ${o.n} copie` : ''}</p>
      <button class="st-btn pri" data-st="ok" data-close>Continua</button>
    </div>`, () => closePanel());
  }
  async function gain(id, lv, text) { addCard(id, lv); await reveal(id, text); save(); hud(); }

  // la scelta del primo compagno (o di una carta fra poche)
  function pickCard(ids, title) {
    return panel(`<h3>${esc(fmt(title))}</h3><div class="st-pick">${ids.map(id => {
      const c = S.CARD[id];
      return `<button class="st-pickc" data-st="pick" data-v="${id}"><img src="${S.img(id + '.jpg')}" alt=""><b>${esc(c.name)}</b><span>${RANKN[c.rank]} · costo ${c.cost}</span><small>${c.moves.map(m => esc(m.name)).join(' · ')}</small></button>`;
    }).join('')}</div>`, (a, t) => { if (a === 'pick') closePanel(t.dataset.v); });
  }

  // ------------------------------------------------------------ CARTE: squadra, potenziamento
  let cardSel = null;
  async function cardsPanel(shopSell) {
    const render = () => {
      if (cardSel) return detailHtml(cardSel);
      const ids = Object.keys(s.cards).sort((a, b) => (s.team.includes(b) - s.team.includes(a)) || (s.cards[b].lv - s.cards[a].lv) || S.CARD[a].name.localeCompare(S.CARD[b].name));
      const cost = teamCost(s.team);
      return `<div class="st-head"><h3>Le tue carte</h3><button class="st-btn" data-st="close" data-close>Chiudi</button></div>
        <p class="st-note">Squadra: fino a ${S.TEAM_SIZE} carte e ${S.BUDGET} Punti Dojo. Le prime 3 combattono, la quarta è la riserva.</p>
        <div class="st-team">${[0, 1, 2, 3].map(i => { const id = s.team[i]; return id ? `<button class="st-slot" data-st="card" data-v="${id}">${face(id)}<b>${esc(S.CARD[id].name.split(' ')[0])}</b><small>${i === 3 ? 'Riserva' : 'Lv ' + s.cards[id].lv}</small></button>` : '<div class="st-slot empty">—</div>'; }).join('')}</div>
        <div class="st-budget">Punti Dojo <b class="${cost > S.BUDGET ? 'over' : ''}">${cost}/${S.BUDGET}</b></div>
        <div class="st-list">${ids.map(id => rowHtml(id)).join('') || '<p class="st-note">Nessuna carta.</p>'}</div>`;
    };
    const rowHtml = id => {
      const c = S.CARD[id], o = s.cards[id];
      return `<button class="st-row ${s.team.includes(id) ? 'in' : ''}" data-st="card" data-v="${id}">${face(id)}
        <span class="st-rm"><b>${esc(c.name)}</b><small>${RANKN[c.rank]} · costo ${c.cost}${o.n > 1 ? ` · ×${o.n}` : ''}</small>
        <span class="st-xp"><i style="width:${o.lv >= MAXLV ? 100 : Math.round(o.xp / xpNeed(o.lv) * 100)}%"></i></span></span>
        <span class="st-lv">Lv ${o.lv}${s.team.includes(id) ? '<em>in squadra</em>' : ''}</span></button>`;
    };
    const detailHtml = id => {
      const c = S.CARD[id], o = s.cards[id], st = statAt(id, o.lv), inT = s.team.includes(id);
      const canAdd = !inT && s.team.length < S.TEAM_SIZE && teamCost(s.team) + c.cost <= S.BUDGET;
      const upCost = 100 * o.lv, canUp = o.n >= 2 && o.lv < MAXLV && s.money >= upCost;
      return `<div class="st-head"><button class="st-btn" data-st="back" data-close>← Carte</button><span class="st-eyebrow">Lv ${o.lv}${o.n > 1 ? ` · ${o.n} copie` : ''}</span></div>
        <div class="st-detail"><img src="${S.img(id + '.jpg')}" alt="Carta di ${esc(c.name)}">
        <div><h3>${esc(c.name)}</h3><p>${RANKN[c.rank]} · costo ${c.cost} Punti Dojo</p>
        <div class="st-stats num"><span>PV <b>${st.hp}</b></span><span>ATK <b>${st.atk}</b></span><span>DEF <b>${st.def}</b></span></div>
        <div class="st-xp big"><i style="width:${o.lv >= MAXLV ? 100 : Math.round(o.xp / xpNeed(o.lv) * 100)}%"></i></div>
        <small class="st-note">${o.lv >= MAXLV ? 'Livello massimo' : `${o.xp}/${xpNeed(o.lv)} punti per il livello ${o.lv + 1}`}</small></div></div>
        ${c.moves.map(m => `<div class="st-move"><b>${esc(m.name)}</b><p>${esc(m.desc)}</p></div>`).join('')}
        <div class="st-acts">
          ${inT ? `<button class="st-btn" data-st="out" data-v="${id}">Togli dalla squadra</button>${s.team.indexOf(id) !== s.team.length - 1 ? `<button class="st-btn" data-st="res" data-v="${id}">Metti come riserva</button>` : ''}`
            : `<button class="st-btn pri" data-st="in" data-v="${id}" ${canAdd ? '' : 'disabled'}>Metti in squadra</button>`}
          ${o.lv < MAXLV ? `<button class="st-btn" data-st="up" data-v="${id}" ${canUp ? '' : 'disabled'}>Potenzia: +1 livello<small>usa una copia doppia e ${upCost} ₵</small></button>` : ''}
          ${shopSell && o.n >= 2 ? `<button class="st-btn" data-st="sell" data-v="${id}">Vendi una copia · +${sellPrice(id)} ₵</button>` : ''}
        </div>
        ${!inT && !canAdd ? `<p class="st-note">${s.team.length >= S.TEAM_SIZE ? 'La squadra è piena: togli prima una carta.' : 'Non bastano i Punti Dojo: togli una carta più costosa.'}</p>` : ''}`;
    };
    cardSel = null;
    const upd = () => { el.panel.innerHTML = render(); };
    await panel(render(), (a, t) => {
      const id = t.dataset.v;
      if (a === 'close') { closePanel(); return; }
      if (a === 'card') cardSel = id;
      if (a === 'back') cardSel = null;
      if (a === 'in' && s.team.length < S.TEAM_SIZE && teamCost(s.team) + S.CARD[id].cost <= S.BUDGET) s.team.push(id);
      if (a === 'out') { if (s.team.length <= 1) { S.UI.toastQuick('Ti serve almeno una carta in squadra.'); return; } s.team = s.team.filter(x => x !== id); }
      if (a === 'res') { s.team = s.team.filter(x => x !== id).concat(id); }
      if (a === 'up') { const o = s.cards[id], cost = 100 * o.lv; if (o.n >= 2 && o.lv < MAXLV && s.money >= cost) { o.n--; o.lv++; o.xp = 0; s.money -= cost; sfx('buff'); } }
      if (a === 'sell') { const o = s.cards[id]; if (o && o.n >= 2) { o.n--; s.money += sellPrice(id); sfx('item'); } }
      save(); hud(); upd();
      el.panel.scrollTop = 0;
    });
  }
  const sellPrice = id => ({ A: 80, I: 200, M: 400, L: 1000 })[S.CARD[id].rank];

  // ------------------------------------------------------------ TESSERA: soldi, sigilli, album
  function tessera() {
    const all = S.CARDS.filter(c => !c.secret || s.cards[c.id]);
    const own = all.filter(c => s.cards[c.id]).length;
    const h = Math.floor(s.time / 3600), m = Math.floor(s.time / 60) % 60;
    const lookUrl = (() => { const c = cv(16, 20); c.getContext('2d').drawImage(sheet(P.look).down[0], 0, 0); return c.toDataURL(); })();
    return panel(`<div class="st-head"><h3>Tessera</h3><button class="st-btn" data-st="close" data-close>Chiudi</button></div>
      <div class="st-card-id"><img src="${lookUrl}" alt="" class="st-me"><div><b>${esc(s.name)}</b><p>₵ ${s.money} · 📜 ${s.scrolls} pergamene</p><p>Tempo di gioco ${h}:${String(m).padStart(2, '0')}</p></div></div>
      <div class="st-eyebrow">Sigilli</div>
      <div class="st-badges">${M.BADGES.map((b, i) => `<div class="${s.badges.includes(i) ? 'on' : ''}"><i style="--c:${b.c}"></i><b>${esc(b.name)}</b><small>${s.badges.includes(i) ? esc(b.where) : '???'}</small></div>`).join('')}</div>
      <div class="st-eyebrow">Album · ${own}/${all.length} carte</div>
      <div class="st-album">${all.map(c => s.cards[c.id] ? `<span title="${esc(c.name)}">${face(c.id)}</span>` : s.seen.includes(c.id) ? `<span class="seen" title="${esc(c.name)}">${face(c.id)}</span>` : '<span class="no">?</span>').join('')}</div>
      <div class="st-acts"><button class="st-btn" data-st="look">Cambia aspetto</button><button class="st-btn" data-st="reset">Ricomincia la storia da capo</button></div>`, async a => {
      if (a === 'close') closePanel();
      if (a === 'look') await nested(() => customize('Il tuo personaggio')).then(() => { closePanel(); });
      if (a === 'reset') { closePanel(); run(async () => { if (await ask('Vuoi davvero ricominciare? Il viaggio salvato verrà cancellato.', ['No', 'Sì, ricomincia']) === 1) { try { localStorage.removeItem(SAVE); } catch (e) { /* niente */ } await newGame(); } }); }
    });
  }

  // ------------------------------------------------------------ BOTTEGA: compra e vendi
  async function shop(list) {
    let tab = 'buy';
    const render = () => `<div class="st-head"><h3>Bottega</h3><button class="st-btn" data-st="close" data-close>Esci</button></div>
      <div class="st-tabs"><button class="st-btn ${tab === 'buy' ? 'pri' : ''}" data-st="tab" data-v="buy">Compra</button><button class="st-btn ${tab === 'sell' ? 'pri' : ''}" data-st="tab" data-v="sell">Vendi</button><span class="st-money">₵ ${s.money}</span></div>
      ${tab === 'buy' ? list.map(k => { const it = M.ITEMS[k]; return `<div class="st-item"><div><b>${esc(it.name)}</b><p>${esc(it.desc)}</p></div><button class="st-btn" data-st="buy" data-v="${k}" ${s.money >= it.price ? '' : 'disabled'}>${it.price} ₵</button></div>`; }).join('')
        : (Object.keys(s.cards).filter(id => s.cards[id].n >= 2).map(id => `<div class="st-item">${face(id)}<div><b>${esc(S.CARD[id].name)}</b><p>Ne hai ${s.cards[id].n}: ne resta almeno una.</p></div><button class="st-btn" data-st="sell" data-v="${id}">+${sellPrice(id)} ₵</button></div>`).join('') || '<p class="st-note">Si vendono solo le copie doppie. Le trovi reclutando spiriti o aprendo bustine.</p>')}`;
    const upd = () => { el.panel.innerHTML = render(); };
    await panel(render(), async (a, t) => {
      const v = t.dataset.v;
      if (a === 'close') { closePanel(); return; }
      if (a === 'tab') tab = v;
      if (a === 'buy') {
        const it = M.ITEMS[v];
        if (s.money < it.price) return;
        s.money -= it.price;
        if (it.scrolls) { s.scrolls += it.scrolls; sfx('item'); }
        if (it.pool) {
          const id = pick(S.CARDS.filter(c => c.rank === it.pool && !c.secret).map(c => c.id));
          addCard(id, it.lv ? it.lv(s) : 1); save(); hud();
          await nested(() => reveal(id, `Dalla bustina esce ${S.CARD[id].name}!`));
        }
      }
      if (a === 'sell') { const o = s.cards[v]; if (o && o.n >= 2) { o.n--; s.money += sellPrice(v); sfx('item'); } }
      save(); hud(); upd();
    });
  }

  // ------------------------------------------------------------ VOLI
  async function fly() {
    const here = MAP.def.inside && s.back ? s.back.map : MAP.id; // dall'aeroporto: la città fuori
    const all = M.FLY.filter(f => f.map !== here);
    const list = all.filter(f => !f.need || f.need(s));
    const v = await panel(`<div class="st-head"><h3>Partenze</h3><button class="st-btn" data-st="close" data-close>Annulla</button></div>
      ${all.map(f => { const ok = list.includes(f); return `<div class="st-item"><div><b>${esc(f.name)}</b><p>${esc(ok ? f.desc : f.lock)}</p></div><button class="st-btn ${ok ? 'pri' : ''}" data-st="go" data-v="${f.map}" ${ok ? '' : 'disabled'}>${f.map === 'lancenigo' ? 'Navetta' : 'Vola'}</button></div>`; }).join('')}`,
      (a, t) => { if (a === 'close') closePanel(null); if (a === 'go') closePanel(t.dataset.v); });
    if (!v) return false;
    const f = M.FLY.find(x => x.map === v);
    await say(f.map === 'lancenigo' ? 'La navetta parte... Si torna a casa!' : 'Allacciate le cinture... Si parte! ✈️');
    s.back = null;
    await warp(f.map, f.x, f.y, 'down');
    return true;
  }

  // ------------------------------------------------------------ SCAMBI con i png
  async function trade(give, want, lv, who) {
    const gc = S.CARD[give], wc = S.CARD[want];
    if (!gc || !wc) return false;
    if (!s.cards[want]) { await say(`Mi piacerebbe tanto una carta di ${wc.name}... Se ne trovi una, torna da me: in cambio ti do ${gc.name}!`, who); return false; }
    if (await ask(`Mi dai ${wc.name}? In cambio ti do ${gc.name} (Lv ${lv})!`, ['Scambia', 'No'], who) !== 0) { await say('Peccato. Ci ripensi?', who); return false; }
    if (s.cards[want].n === 1 && s.team.length === 1 && s.team[0] === want) { await say('Ma è l\'unica carta della tua squadra! Prima mettine un\'altra.', who); return false; }
    removeCard(want);
    await say(`Hai dato ${wc.name}...`);
    await gain(give, lv, `${gc.name} arriva in cambio!`);
    return true;
  }

  // ------------------------------------------------------------ SFIDE
  function battle(o) {
    const lv = Array.isArray(o.lv) ? o.lv : o.cards.map(() => o.lv || 1);
    return new Promise(res => {
      el.root.hidden = true; document.body.classList.remove('st-open'); stopLoop();
      S.UI.storyBattle({
        players: [
          { name: s.name, cards: s.team.slice(), lv: s.team.map(id => s.cards[id].lv) },
          { name: o.name, cards: o.cards.slice(), lv, cpu: o.cpu || 'normale' },
        ],
        terrain: o.terrain, music: o.music,
        onEnd: win => {
          el.root.hidden = false; document.body.classList.add('st-open');
          setTrack(win ? 'vittoria' : MAP.def.music || 'mondo'); startLoop(); // la fanfara accompagna premi e livelli
          res(win);
        },
      });
    });
  }
  async function flash() { el.fade.className = 'st-fade flash'; await sleep(900); }
  async function unflash() { el.fade.className = 'st-fade'; await sleep(100); }
  const avg = a => a.reduce((t, x) => t + x, 0) / a.length;
  async function gainXp(n) {
    const ups = [];
    for (const id of s.team) {
      const c = s.cards[id];
      if (!c || c.lv >= MAXLV) continue;
      c.xp += n;
      while (c.lv < MAXLV && c.xp >= xpNeed(c.lv)) { c.xp -= xpNeed(c.lv); c.lv++; ups.push([id, c.lv]); }
      if (c.lv >= MAXLV) c.xp = 0;
    }
    await say(`La squadra guadagna ${n} punti esperienza.`);
    for (const [id, lv] of ups) { sfx('buff'); await say(`${S.CARD[id].name} sale al livello ${lv}!`); }
  }
  async function defeat() {
    const lost = Math.floor(s.money * 0.1);
    s.money -= lost;
    const town = M.maps[s.check.map].name;
    await say(`Hai perso la sfida${lost ? ` e ${lost} monete` : ''}... Torni a ${town} per riprendere fiato.`);
    s.back = null;
    await warp(s.check.map, s.check.x, s.check.y, 'down');
  }
  // sfida con un allenatore (visto per strada o a cui si parla)
  function fight(n) { const d = n.def; return challenge(d.trainer, { name: d.trainer.name || d.name, face: d.face }, trKey(n)); }
  async function challenge(tr, who, key) {
    const music = tr.music || (tr.badge === 3 ? 'finale' : tr.badge !== undefined ? 'capopalestra' : 'allenatore');
    setTrack(music); // la musica della sfida parte già quando ci si guarda negli occhi
    await say(tr.intro, who);
    const cards = typeof tr.cards === 'function' ? tr.cards(s) : tr.cards;
    sfx('encounter'); await flash();
    const win = await battle({ name: fmt(who.name), cards, lv: tr.lv, cpu: tr.cpu, terrain: tr.terrain || MAP.def.terrain, music });
    await unflash();
    const lvs = [].concat(tr.lv), lvAvg = avg(lvs);
    if (win) {
      if (key) s.flags[key] = 1;
      const money = tr.money || Math.round(30 * Math.max(...lvs) * cards.length * (tr.badge !== undefined ? 2 : 1));
      s.money += money;
      sfx('win');
      await say(tr.win, who);
      await say(`Hai vinto ${money} monete!`);
      await gainXp(Math.round(20 + 12 * lvAvg));
      if (tr.badge !== undefined && !s.badges.includes(tr.badge)) {
        s.badges.push(tr.badge); sfx('item'); hud();
        await say(`Hai ottenuto il ${M.BADGES[tr.badge].name}!`);
      }
      if (tr.onWin) await tr.onWin(W, who);
    } else {
      await say(tr.lose || 'Hai ancora da allenarti!', who);
      await gainXp(Math.round((20 + 12 * lvAvg) / 3));
      if (tr.onLose) await tr.onLose(W, who); else await defeat();
    }
    return !!win;
  }
  // spiriti selvatici nell'erba alta (e nelle grotte)
  async function wildBattle() {
    const w = MAP.def.wild, pool = w.pool.filter(p => S.CARD[p[0]]);
    const weight = pool.reduce((t, p) => t + (p[3] || 10), 0), foes = [];
    while (foes.length < Math.min(w.n || 1, pool.length)) {
      let r = Math.random() * weight, p = pool[0];
      for (const q of pool) { r -= q[3] || 10; if (r <= 0) { p = q; break; } }
      if (!foes.some(f => f.id === p[0])) foes.push({ id: p[0], lv: p[1] + Math.floor(Math.random() * (p[2] - p[1] + 1)) });
    }
    foes.forEach(f => seen(f.id));
    sfx('encounter'); setTrack('selvatico'); await flash();
    const go = await panel(`<div class="st-wild"><div class="st-eyebrow">Incontro selvatico</div>
      <div class="st-wild-cards">${foes.map(f => `<div><img src="${S.img(f.id + '.jpg')}" alt=""><b>${esc(S.CARD[f.id].name)}</b><small>${RANKN[S.CARD[f.id].rank]} · Lv ${f.lv}</small></div>`).join('')}</div>
      <h3>${foes.length > 1 ? 'Due spiriti delle carte saltano fuori!' : `Lo spirito di ${esc(S.CARD[foes[0].id].name)} salta fuori!`}</h3>
      <div class="st-acts"><button class="st-btn pri" data-st="fight">Combatti</button><button class="st-btn" data-st="run" data-close>Scappa</button></div></div>`,
      a => closePanel(a === 'fight'));
    if (!go) { await unflash(); setTrack(MAP.def.music || 'mondo'); grace = 3; await say('Ti allontani in silenzio...'); return; }
    const win = await battle({ name: 'Spirito selvatico', cards: foes.map(f => f.id), lv: foes.map(f => f.lv), cpu: w.cpu || 'facile', terrain: MAP.def.terrain, music: 'selvatico' });
    await unflash();
    grace = 3;
    const lvAvg = avg(foes.map(f => f.lv));
    if (win === null) { await say('Sei scappato!'); return; }
    if (!win) { await gainXp(Math.round((8 + 8 * lvAvg) / 3)); await defeat(); return; }
    const money = Math.round(12 * lvAvg * foes.length);
    s.money += money;
    await say(`Lo spirito è sconfitto! Trovi ${money} monete per terra.`);
    await gainXp(Math.round(8 + 8 * lvAvg));
    for (const f of foes) await recruit(f);
  }
  async function recruit(f) {
    const c = S.CARD[f.id];
    if (!s.scrolls) { await say(`Lo spirito di ${c.name} sta svanendo... Ti servirebbe una pergamena per reclutarlo! Le vendono in bottega.`); return; }
    if (await ask(`Usi una pergamena per reclutare ${c.name}? Ne hai ${s.scrolls}.`) !== 0) return;
    s.scrolls--; hud();
    sfx('magic');
    await say('Srotoli la pergamena... ✨ ... ✨ ... ✨');
    const p = { A: 0.8, I: 0.55, M: 0.35, L: 0.1 }[c.rank] || 0.5;
    if (Math.random() < p) await gain(f.id, f.lv, `${c.name} si unisce a te!`);
    else { sfx('debuff'); await say(`Oh no! Lo spirito di ${c.name} si libera e svanisce.`); }
  }

  // ------------------------------------------------------------ esaminare, parlare, raccogliere
  async function talk(n) {
    const d = n.def, who = { name: d.name, face: d.face };
    if (!d.fixed) n.dir = OPP[P.dir];
    if (d.trainer && !beaten(n)) return fight(n);
    if (d.talk) return d.talk(W, who, n);
    if (d.trainer && d.trainer.after) return say(d.trainer.after, who);
    if (d.say) return say(typeof d.say === 'function' ? d.say(s) : d.say, who);
  }
  function interact() {
    const [dx, dy] = DIRS[P.dir];
    let x = P.x + dx, y = P.y + dy;
    let n = npcs.find(o => o.x === x && o.y === y);
    if (!n && tileAt(x, y) === 'k') { x += dx; y += dy; n = npcs.find(o => o.x === x && o.y === y); } // al banco si parla con chi sta dietro
    if (n) { run(() => talk(n)); return; }
    const sg = MAP.signs.find(o => o.x === x && o.y === y);
    if (sg) { run(() => say(sg.text)); return; }
    const it = MAP.items.find(o => o.x === x && o.y === y);
    if (it) { run(() => takeItem(it)); return; }
    const look = (MAP.def.look || {})[tileAt(x, y)] || M.LOOK_AT[tileAt(x, y)];
    if (look) run(() => say(typeof look === 'function' ? look(s) : look));
  }
  async function takeItem(it) {
    s.flags[`it:${MAP.id}:${it.i}`] = 1;
    MAP.items = MAP.items.filter(o => o !== it);
    MAP.block[it.y][it.x] = false;
    if (it.card) { await say('Per terra c\'è una carta luccicante!'); await gain(it.card, it.lv || 1, `Hai trovato ${S.CARD[it.card].name}!`); return; }
    sfx('item');
    if (it.scrolls) { s.scrolls += it.scrolls; await say(`Hai trovato ${it.scrolls > 1 ? it.scrolls + ' pergamene' : 'una pergamena'}!`); }
    if (it.money) { s.money += it.money; await say(`Hai trovato ${it.money} monete!`); }
  }

  // ------------------------------------------------------------ menu di pausa
  function openMenu() {
    menuOpen = true; keys.held = [];
    el.menu.hidden = false;
    el.menu.innerHTML = [['carte', '🃏 Carte'], ['tessera', '🪪 Tessera'], ['salva', '💾 Salva'], ['esci', '🚪 Esci'], ['chiudi', '✖ Chiudi']]
      .map(([k, l]) => `<button role="menuitem" data-st="m-${k}">${l}</button>`).join('');
    el.menu.querySelector('button').focus({ preventScroll: true });
  }
  function closeMenu() { menuOpen = false; el.menu.hidden = true; }
  async function menuAct(k) {
    closeMenu();
    if (k === 'carte') run(() => cardsPanel(false));
    if (k === 'tessera') run(tessera);
    if (k === 'salva') { save(); run(() => say('Viaggio salvato! Si salva anche da solo a ogni porta e a ogni sfida.')); }
    if (k === 'esci') close();
  }

  // ------------------------------------------------------------ l'API per gli script delle mappe (mondo.js)
  const W = {
    get s() { return s; },
    say, ask, sleep, gain, battle, shop: list => shop(list), fly, trade, warp, sfx, pickCard,
    flag: k => !!s.flags[k],
    set: (k, v) => { s.flags[k] = v === undefined ? 1 : v; },
    badges: () => s.badges.length,
    money: n => { s.money += n; hud(); },
    scrolls: n => { s.scrolls += n; hud(); },
    has: id => !!s.cards[id],
    npc: id => npcs.find(n => n.def.id === id),
    walk: (id, dir, n) => walk(id === 'player' ? P : npcs.find(o => o.def.id === id), dir, n),
    face: (id, dir) => { const c = id === 'player' ? P : npcs.find(o => o.def.id === id); if (c) c.dir = dir; },
    cards: () => cardsPanel(true),
    refresh: refreshNpcs,
    fight: id => fight(npcs.find(n => n.def.id === id)),
    challenge: (tr, who) => challenge(tr, who || { name: tr.name }, null),
    xp: gainXp,
    name: id => (S.CARD[id] ? S.CARD[id].name : id),
    beat: id => { s.flags[`tr:${MAP.id}:${id}`] = 1; },
    ending,
  };

  async function ending() {
    sfx('win');
    await panel(`<div class="st-end"><div class="st-eyebrow">Fine… per ora</div><h3>${esc(s.name)}, Campione della Stone Temple!</h3>
      <p>Hai conquistato i quattro sigilli, incontrato le Leggende e superato il Maestro Samuele.</p>
      <div class="st-album">${Object.keys(s.cards).map(id => `<span>${face(id)}</span>`).join('')}</div>
      <p>Il viaggio continua: completa l'album, potenzia le carte e torna a sfidare chi vuoi.</p>
      <p class="st-note">Un gioco per la palestra Stone Temple Tao di Lancenigo.</p>
      <button class="st-btn pri" data-st="ok" data-close>Continua a esplorare</button></div>`, () => closePanel());
  }

  // ------------------------------------------------------------ inizio, nuova partita
  async function newGame() {
    s = fresh();
    P.look = M.LOOKS.player0;
    el.fade.className = 'st-fade on';
    enterMap('casa_mia', 5, 3, 'down');
    hud();
    const sam = { name: 'Samuele', face: 'samuele' };
    await say(M.INTRO, sam);
    let name = '';
    while (!name) {
      name = await panel(`<div class="st-name"><h3>Come ti chiami?</h3><input id="st-nome" maxlength="12" autocomplete="off" value="${esc(defaultName())}"><button class="st-btn pri" data-st="ok">Conferma</button></div>`,
        a => { if (a === 'ok') closePanel(((document.getElementById('st-nome') || {}).value || '').trim()); });
    }
    s.name = name.slice(0, 12);
    await customize('Che aspetto hai?');
    await say(M.INTRO_END, sam);
    el.box.hidden = true;
    await fade(false);
    save();
  }
  // il personaggio su misura: capelli, pelle, divisa, pantaloni e cintura
  const SWATCH = {
    h: ['#2a2020', '#5a3020', '#8a5a2a', '#d8b060', '#c8482a', '#e8e4dc', '#3a5ad8', '#d86aa8'],
    s: ['#f8dcc0', '#f2c8a0', '#d8a47a', '#a86e48', '#6e4630'],
    c: ['#e8631c', '#d8412f', '#222228', '#f0f0ea', '#3a6ad8', '#3aa060', '#a978e0', '#e8c040'],
    p: ['#2a3448', '#222228', '#f0f0ea', '#6e4630', '#8a2420', '#3a6a4a'],
    b: ['#f0f0ea', '#e8c040', '#e8631c', '#3aa060', '#3a6ad8', '#26202c'],
  };
  const spriteUrl = (L, d) => { const c = cv(16, 20); const g = c.getContext('2d'); if (d === 'right') { g.translate(16, 0); g.scale(-1, 1); } g.drawImage(sheet(L)[d === 'right' ? 'left' : d][0], 0, 0); return c.toDataURL(); };
  async function customize(title) {
    const L = Object.assign({}, M.LOOKS.player0, s.look || {});
    const row = (k, label) => `<div class="st-eyebrow">${label}</div><div class="st-sw">${SWATCH[k].map(c => `<button data-st="sw" data-k="${k}" data-v="${c}" aria-pressed="${L[k] === c}" aria-label="${label} ${c}" style="--c:${c}"></button>`).join('')}</div>`;
    const render = () => `<div class="st-name"><h3>${esc(title)}</h3>
      <div class="st-preview">${['down', 'right', 'up', 'left'].map(d => `<img src="${spriteUrl(L, d)}" alt="">`).join('')}</div>
      <div class="st-eyebrow">Capelli</div>
      <div class="st-opts">${[['short', 'Corti'], ['long', 'Lunghi'], ['bun', 'Chignon']].map(([v, l]) => `<button class="st-btn ${L.style === v ? 'pri' : ''}" data-st="style" data-v="${v}">${l}</button>`).join('')}</div>
      ${row('h', 'Colore dei capelli')}${row('s', 'Pelle')}${row('c', 'Divisa')}${row('p', 'Pantaloni')}${row('b', 'Cintura')}
      <button class="st-btn pri" data-st="ok" data-close>Fatto</button></div>`;
    await panel(render(), (a, t) => {
      if (a === 'ok') { closePanel(); return; }
      if (a === 'style') L.style = t.dataset.v;
      if (a === 'sw') L[t.dataset.k] = t.dataset.v;
      const y = el.panel.scrollTop; el.panel.innerHTML = render(); el.panel.scrollTop = y;
    });
    s.look = L; P.look = L;
    save();
  }
  function defaultName() { try { const n = JSON.parse(localStorage.getItem('stt_names')); return (n && n[0] && n[0] !== 'Giocatore 1') ? n[0].slice(0, 12) : ''; } catch (e) { return ''; } }

  async function open() {
    if (!el) build();
    el.root.hidden = false;
    document.body.classList.add('st-open');
    if (window.Sound) Sound.unlock();
    startLoop();
    const saved = readSave();
    if (saved && M.maps[saved.map]) {
      s = saved;
      P.look = Object.assign({}, M.LOOKS.player0, s.look || {});
      enterMap(s.map, s.x, s.y, s.dir);
      hud();
      el.fade.className = 'st-fade';
    } else run(newGame);
  }
  function close() {
    save();
    stopLoop();
    setTrack('tempio');
    el.root.hidden = true;
    document.body.classList.remove('st-open');
    S.UI.home();
  }

  window.Storia = { open, close, hasSave: () => !!readSave() };
  // per i test automatici
  window.Storia._t = { TILES, FRONT, BACK, SIDE, SIDE_LEGS, LEGS, TREE, ROCK, TALL, LANTERN,
    where: () => ({ map: MAP && MAP.id, x: P.x, y: P.y, dir: P.dir, s }), warp: (m, x, y) => run(() => warp(m, x, y, 'down')) };
})();
