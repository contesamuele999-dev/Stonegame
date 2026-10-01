// Simulatore di bilanciamento: fa giocare l'IA contro sé stessa con squadre casuali
// e misura la percentuale di vittoria di ogni carta.
// Uso: node tools/simulate.js [partite] [livello]
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');
const path = require('path');
const S = require(path.join(__dirname, '..', 'engine.js'));
// --segrete: include le carte del pacchetto segreto (solo in locale, cartella segrete/)
// (passa ai processi paralleli come variabile d'ambiente: gli argomenti non li ricevono)
if (process.argv.includes('--segrete')) process.env.STT_SEGRETE = '1';
if (process.env.STT_SEGRETE) S.addCards(require(path.join(__dirname, '..', 'segrete', 'carte.js'))(S.H).cards);

function mulberry(seed) { return () => { let t = (seed = (seed + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function play(seed, level) {
  const rng = mulberry(seed);
  const t0 = S.randomTeam(rng), t1 = S.randomTeam(rng);
  // palestra a caso; le armi arrivano in partita (a chi perde una carta)
  const pick = a => a[Math.floor(rng() * a.length)];
  const terrain = pick([null].concat(S.TERRAINS.map(t => t.id)));
  const g = S.createGame({ seed, silent: true, first: seed % 2, terrain, effects: true, armory: true, players: [{ name: 'A', cards: t0 }, { name: 'B', cards: t1 }] });
  let n = 0;
  const used = {};
  let firstKo = null;
  while (g.winner === null && n < 400) {
    if (firstKo === null) firstKo = g.players[0].ko.length ? 0 : g.players[1].ko.length ? 1 : null;
    const a = S.chooseAction(g, level);
    if (!a) break;
    if (a.effect || a.arm) { const k = a.effect ? 'fx:' + a.effect : 'arm:' + a.arm; used[k] = (used[k] || 0) + 1; S.doAction(g, a); n++; continue; }
    const f = S.byUid(g, a.actor);
    const key = S.cardOf(f).id + ':' + a.move;
    used[key] = (used[key] || 0) + 1;
    S.doAction(g, a);
    n++;
  }
  // mosse usate
  return { t0, t1, w: g.players.map(p => p.armsUsed || []), terrain, winner: g.winner, turns: g.turnNo, first: seed % 2, used, firstKo };
}

if (isMainThread) {
  const N = +process.argv[2] || 400;
  const level = process.argv[3] || 'normale';
  const W = os.cpus().length;
  const results = [];
  let done = 0;
  const t = Date.now();
  for (let w = 0; w < W; w++) {
    const wk = new Worker(__filename, { workerData: { from: w, step: W, N, level } });
    wk.on('message', r => results.push(...r));
    wk.on('exit', () => { if (++done === W) report(results, Date.now() - t); });
  }
} else {
  const { from, step, N, level } = workerData;
  const out = [];
  for (let i = from; i < N; i += step) out.push(play(1000 + i * 7919, level));
  parentPort.postMessage(out);
}

function report(rs, ms) {
  const st = {};
  for (const c of S.CARDS) st[c.id] = { g: 0, w: 0 };
  let firstWins = 0, turns = 0, draws = 0;
  const used = {};
  for (const r of rs) {
    for (const k in r.used) used[k] = (used[k] || 0) + r.used[k];
    if (r.winner === null) { draws++; continue; }
    if (r.winner === r.first) firstWins++;
    turns += r.turns;
    [r.t0, r.t1].forEach((tm, p) => tm.forEach(id => { st[id].g++; if (r.winner === p) st[id].w++; }));
  }
  const rows = S.CARDS.map(c => ({ id: c.id, cost: c.cost, games: st[c.id].g, win: st[c.id].g ? st[c.id].w / st[c.id].g : 0 }))
    .sort((a, b) => b.win - a.win);
  console.log(`partite ${rs.length} in ${(ms / 1000).toFixed(1)}s | turni medi ${(turns / rs.length).toFixed(1)} | vince chi inizia ${(100 * firstWins / rs.length).toFixed(1)}% | senza esito ${draws}`);
  for (const r of rows) {
    const u = [-1, 0, 1].map(i => used[r.id + ':' + i] || 0);
    const tot = u.reduce((a, b) => a + b, 0) || 1;
    console.log(`${r.id.padEnd(11)} costo ${r.cost}  ${(100 * r.win).toFixed(1).padStart(5)}%  (${r.games})  uso att/m1/m2 ${u.map(x => Math.round(100 * x / tot) + '%').join(' / ')}`);
  }
  // armi: percentuale di vittoria di chi l'ha impugnata (nessuna = squadra che non ne ha usate)
  const ws = {};
  for (const r of rs) if (r.winner !== null) r.w.forEach((ids, p) => (ids.length ? ids : ['nessuna']).forEach(k => { const x = ws[k] || (ws[k] = { g: 0, w: 0 }); x.g++; if (r.winner === p) x.w++; }));
  // rimonta: chi perde la prima carta quante volte vince
  const fk = rs.filter(r => r.winner !== null && r.firstKo !== null);
  console.log(`chi perde la prima carta vince il ${(100 * fk.filter(r => r.winner === r.firstKo).length / fk.length).toFixed(1)}%`);
  console.log('--- armi');
  Object.entries(ws).sort((a, b) => b[1].w / b[1].g - a[1].w / a[1].g).forEach(([k, x]) => console.log(`${k.padEnd(11)} ${(100 * x.w / x.g).toFixed(1).padStart(5)}%  (${x.g})`));
  const tt = {};
  for (const r of rs) { const k = r.terrain || 'nessuno'; const x = tt[k] || (tt[k] = { n: 0, turns: 0 }); x.n++; x.turns += r.turns; }
  console.log('--- palestre (turni medi)');
  Object.entries(tt).forEach(([k, x]) => console.log(`${k.padEnd(11)} ${(x.turns / x.n).toFixed(1)}  (${x.n})`));
}
