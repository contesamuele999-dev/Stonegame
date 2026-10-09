// Bilanciamento dell'evoluzione: una squadra con una carta evoluta (che costa 1 Punto Dojo in più per stadio)
// contro una squadra normale, a parità di Punti Dojo. Si cerca il bonus per cui si vince poco più del 50%.
// Uso: node tools/evoluzione.js [partite per prova] "1:0.15,0.2,0.25 2:0.3,0.4 3:0.5,0.6"
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');
const path = require('path');
const S = require(path.join(__dirname, '..', 'engine.js'));

function mulberry(seed) { return () => { let t = (seed = (seed + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 4 carte a caso e una di loro evoluta, con il costo (evoluzione compresa) fra 9 e 10
function evolvedTeam(rng, stage) {
  for (;;) {
    const pool = S.CARDS.map(c => c.id), t = [];
    while (t.length < S.TEAM_SIZE) t.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    const ev = [0, 0, 0, 0]; ev[Math.floor(rng() * 4)] = stage;
    const cost = S.teamCost(t, ev);
    if (cost >= S.BUDGET - 1 && cost <= S.BUDGET) return { t, ev };
  }
}
function play(seed, stage) {
  const rng = mulberry(seed);
  const a = evolvedTeam(rng, stage), b = S.randomTeam(rng);
  const pick = x => x[Math.floor(rng() * x.length)];
  const g = S.createGame({ seed, silent: true, first: seed % 2, terrain: pick([null].concat(S.TERRAINS.map(t => t.id))), effects: true, armory: true, combat2: true,
    players: [{ name: 'A', cards: a.t, ev: a.ev }, { name: 'B', cards: b }] });
  for (let n = 0; g.winner === null && n < 400; n++) { const x = S.chooseAction(g, 'normale'); if (!x) break; S.doAction(g, x); }
  return g.winner;
}

if (isMainThread) {
  const N = +process.argv[2] || 1500;
  const plan = (process.argv[3] || '1:0.15,0.2,0.25,0.3 2:0.3,0.4,0.5 3:0.45,0.6,0.75').split(' ').flatMap(p => { const [s, ks] = p.split(':'); return ks.split(',').map(k => ({ s: +s, k: +k })); });
  (async () => {
    for (const { s, k } of plan) {
      const W = os.cpus().length, res = [];
      await Promise.all(Array.from({ length: W }, (_, w) => new Promise(done => {
        const wk = new Worker(__filename, { workerData: { from: w, step: W, N, s, k } });
        wk.on('message', r => res.push(...r)); wk.on('exit', done);
      })));
      const ok = res.filter(x => x !== null), win = ok.filter(x => x === 0).length / ok.length;
      const ci = 1.96 * Math.sqrt(win * (1 - win) / ok.length);
      console.log(`stadio ${s} (${S.EVO[s].name}) bonus +${Math.round(k * 100)}%: la squadra con la carta evoluta vince il ${(100 * win).toFixed(1)}% ±${(100 * ci).toFixed(1)}  (${ok.length} partite)`);
    }
  })();
} else {
  const { from, step, N, s, k } = workerData;
  S.EVO[s].k = k;
  const out = [];
  for (let i = from; i < N; i += step) out.push(play(5000 + i * 7919, s));
  parentPort.postMessage(out);
}
