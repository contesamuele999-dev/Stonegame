// Simulatore di bilanciamento: fa giocare l'IA contro sé stessa con squadre casuali
// e misura la percentuale di vittoria di ogni carta.
// Uso: node tools/simulate.js [partite] [livello]
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');
const path = require('path');
const S = require(path.join(__dirname, '..', 'engine.js'));

function mulberry(seed) { return () => { let t = (seed = (seed + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function play(seed, level) {
  const rng = mulberry(seed);
  const t0 = S.randomTeam(rng), t1 = S.randomTeam(rng);
  const g = S.createGame({ seed, silent: true, first: seed % 2, players: [{ name: 'A', cards: t0 }, { name: 'B', cards: t1 }] });
  let n = 0;
  const used = {};
  while (g.winner === null && n < 400) {
    const a = S.chooseAction(g, level);
    if (!a) break;
    const f = S.byUid(g, a.actor);
    const key = S.cardOf(f).id + ':' + a.move;
    used[key] = (used[key] || 0) + 1;
    S.doAction(g, a);
    n++;
  }
  // mosse usate
  return { t0, t1, winner: g.winner, turns: g.turnNo, first: seed % 2, used };
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
}
