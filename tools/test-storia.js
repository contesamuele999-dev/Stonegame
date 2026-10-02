// Controlla le mappe della Modalità Storia: righe, porte, uscite, raggiungibilità, carte e modelli dei personaggi.
// Uso: node tools/test-storia.js
const path = require('path');
const STT = require('../engine.js');
// finto browser, quanto basta per caricare mondo.js e storia.js
const ctx = new Proxy({}, { get: () => () => {} });
global.window = { STT, addEventListener() {} };
global.document = { createElement: () => ({ getContext: () => ctx }), addEventListener() {} };
global.performance = { now: () => 0 };
require(path.join(__dirname, '..', 'mondo.js'));
require(path.join(__dirname, '..', 'storia.js'));
const M = window.MONDO, T = window.Storia._t;

let errors = 0;
const fail = (m, msg) => { errors++; console.log(`✗ ${m}: ${msg}`); };
const SOLID = new Set(Object.keys(T.TILES).filter(k => T.TILES[k].solid));

// modelli dei personaggi e delle caselle: righe tutte della lunghezza giusta
const rows = (name, list, w) => list.forEach((r, i) => { if (r.length !== w) fail('pixel', `${name}[${i}] lunga ${r.length}, attesa ${w}`); });
rows('FRONT', T.FRONT, 8); rows('BACK', T.BACK, 8); rows('SIDE', T.SIDE, 16); rows('TREE', T.TREE, 16); rows('ROCK', T.ROCK, 16); rows('TALL', T.TALL, 8); rows('LANTERN', T.LANTERN, 16);
rows('LEGS.stand', T.LEGS.stand, 8); rows('LEGS.lift', T.LEGS.lift, 8); rows('SIDE_LEGS.stand', T.SIDE_LEGS.stand, 16); rows('SIDE_LEGS.walk', T.SIDE_LEGS.walk, 16);
if (T.FRONT.length + 3 !== 20 || T.SIDE.length + 3 !== 20) fail('pixel', 'i personaggi devono essere alti 20');

const card = (m, id) => { if (!STT.CARD[id]) fail(m, `carta sconosciuta ${id}`); };
const fakeS = { flags: { starter: 'grazia', rival1: 1 }, badges: [0, 1, 2], back: null };

for (const [id, d] of Object.entries(M.maps)) {
  const H = d.tiles.length, Wd = d.tiles[0].length;
  d.tiles.forEach((r, y) => {
    if (r.length !== Wd) fail(id, `riga ${y} lunga ${r.length}, attesa ${Wd}`);
    for (const ch of r) if (!T.TILES[ch]) fail(id, `casella sconosciuta "${ch}" alla riga ${y}`);
  });
  const at = (x, y) => (y >= 0 && y < H && x >= 0 && x < Wd ? d.tiles[y][x] : undefined);
  const block = d.tiles.map(r => r.split('').map(ch => SOLID.has(ch)));
  const doors = [];
  for (const b of d.bld || []) {
    if (b.x < 0 || b.y < 0 || b.x + b.w > Wd || b.y + b.h > H) { fail(id, `edificio fuori mappa a ${b.x},${b.y}`); continue; }
    for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) block[b.y + j][b.x + i] = true;
    const dx = b.x + b.door, dy = b.y + b.h - 1;
    block[dy][dx] = false;
    doors.push([dx, dy]);
    if (SOLID.has(at(dx, dy + 1)) || at(dx, dy + 1) === undefined) fail(id, `davanti alla porta ${dx},${dy} non si passa`);
    const to = M.maps[b.to];
    if (!to) fail(id, `porta verso mappa inesistente ${b.to}`);
    else if (!to.entry || SOLID.has(to.tiles[to.entry[1]][to.entry[0]])) fail(id, `ingresso di ${b.to} non valido`);
  }
  const occupied = new Map();
  const place = (what, x, y) => {
    if (at(x, y) === undefined) { fail(id, `${what} fuori mappa a ${x},${y}`); return; }
    if (block[y][x]) fail(id, `${what} su una casella bloccata ${x},${y} (${at(x, y)})`);
    const k = x + ',' + y;
    if (occupied.has(k)) fail(id, `${what} sovrapposto a ${occupied.get(k)} in ${k}`);
    occupied.set(k, what);
  };
  (d.signs || []).forEach(o => place('cartello', o.x, o.y));
  (d.items || []).forEach((o, i) => { place('oggetto ' + i, o.x, o.y); if (o.card) card(id, o.card); });
  (d.npc || []).forEach(n => {
    if (!n.where && !n.show && !n.hide) place('png ' + n.id, n.x, n.y); // quelli che compaiono solo a volte possono condividere il posto
    if (n.look && !M.LOOKS[n.look]) fail(id, `aspetto sconosciuto ${n.look}`);
    if (n.trainer) {
      const cards = typeof n.trainer.cards === 'function' ? n.trainer.cards(fakeS) : n.trainer.cards;
      cards.forEach(c => card(id + '/' + n.id, c));
      const lv = [].concat(n.trainer.lv);
      if (lv.length !== 1 && lv.length !== cards.length) fail(id, `${n.id}: livelli e carte non tornano`);
      if (n.trainer.badge !== undefined && !M.BADGES[n.trainer.badge]) fail(id, `${n.id}: sigillo inesistente`);
    }
  });
  if (d.wild) d.wild.pool.forEach(p => { if (!STT.CARD[p[0]] && !['sara', 'carla', 'flavio', 'federico', 'oksana'].includes(p[0])) fail(id, `spirito sconosciuto ${p[0]}`); });
  (d.exits || []).forEach(e => {
    for (let i = 0; i < (e.w || 1); i++) for (let j = 0; j < (e.h || 1); j++) {
      const x = e.x + i, y = e.y + j;
      if (block[y] === undefined || block[y][x]) fail(id, `uscita su casella bloccata ${x},${y}`);
      if (e.to === '@back') continue;
      const to = M.maps[e.to];
      if (!to) { fail(id, `uscita verso mappa inesistente ${e.to}`); continue; }
      const tx = e.tx + i, ty = e.ty + j, ch = to.tiles[ty] && to.tiles[ty][tx];
      if (!ch || SOLID.has(ch)) fail(id, `l'uscita ${x},${y} arriva su ${e.to} ${tx},${ty} bloccata`);
      const back = (to.exits || []).some(x2 => tx >= x2.x && tx < x2.x + (x2.w || 1) && ty >= x2.y && ty < x2.y + (x2.h || 1));
      if (back) fail(id, `l'uscita ${x},${y} arriva su ${e.to} sopra un'altra uscita`);
    }
  });
  // raggiungibilità: dal punto d'arrivo si devono poter toccare porte, uscite, png, oggetti e cartelli
  const npcBlock = new Set((d.npc || []).filter(n => !n.hide && !n.show && !(n.trainer && n.trainer.vanish) && !n.where).map(n => n.x + ',' + n.y));
  const starts = [];
  if (d.entry) starts.push(d.entry);
  if (d.check) starts.push(d.check);
  for (const [oid, od] of Object.entries(M.maps)) for (const e of od.exits || []) if (e.to === id) starts.push([e.tx, e.ty]);
  for (const f of M.FLY) if (f.map === id) starts.push([f.x, f.y]);
  if (id === 'casa_mia') starts.push([5, 3]);
  const seen = new Set(), q = [];
  const walk = (x, y) => at(x, y) !== undefined && !block[y][x] && !npcBlock.has(x + ',' + y) && at(x, y) !== 'v';
  const sigs = new Set((d.signs || []).map(o => o.x + ',' + o.y)), its = new Set((d.items || []).map(o => o.x + ',' + o.y));
  for (const [x, y] of starts) if (walk(x, y) && !sigs.has(x + ',' + y)) { seen.add(x + ',' + y); q.push([x, y]); }
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      let nx = x + dx, ny = y + dy;
      if (dy === 1 && at(nx, ny) === 'v') ny++; // salto giù dalla sporgenza
      const k = nx + ',' + ny;
      if (seen.has(k) || !walk(nx, ny) || sigs.has(k) || its.has(k)) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  const near = (x, y) => [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => seen.has((x + dx) + ',' + (y + dy)));
  if (!starts.length) fail(id, 'nessun punto di arrivo');
  doors.forEach(([x, y]) => { if (!seen.has(x + ',' + (y + 1))) fail(id, `porta ${x},${y} irraggiungibile`); });
  (d.exits || []).forEach(e => { if (!near(e.x, e.y) && !seen.has(e.x + ',' + e.y)) fail(id, `uscita ${e.x},${e.y} irraggiungibile`); });
  (d.npc || []).forEach(n => { if (!near(n.x, n.y) && !(n.trainer && n.dir)) fail(id, `png ${n.id} irraggiungibile`); });
  (d.items || []).forEach((o, i) => { if (!near(o.x, o.y)) fail(id, `oggetto ${i} irraggiungibile`); });
  (d.signs || []).forEach(o => { if (!near(o.x, o.y)) fail(id, `cartello ${o.x},${o.y} irraggiungibile`); });
}
for (const f of M.FLY) { const m = M.maps[f.map]; if (!m || SOLID.has(m.tiles[f.y][f.x])) fail('voli', `arrivo non valido ${f.map}`); }
Object.values(M.ITEMS).forEach(it => { if (it.pool && !STT.CARDS.some(c => c.rank === it.pool)) fail('bottega', `nessuna carta di grado ${it.pool}`); });

if (errors) { console.log(`\n${errors} problemi.`); process.exit(1); }
console.log(`Mappe a posto: ${Object.keys(M.maps).length} mappe controllate.`);
