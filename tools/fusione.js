// Quanto valgono tecniche di coppia e fusione: stessa squadra da entrambe le parti, una sola può usarle.
// Uso: node tools/fusione.js [partite] [livello]
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');
const path = require('path');
const S = require(path.join(__dirname, '..', 'engine.js'));

function mulberry(seed) { return () => { let t = (seed = (seed + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// off: 'fuse' | 'duo'. La squadra 1 non può usarla.
function play(seed, level, off) {
  const team = S.randomTeam(mulberry(seed));
  const g = S.createGame({ seed, silent: true, first: seed % 2, effects: true, armory: true, combat2: true, players: [{ name: 'A', cards: team }, { name: 'B', cards: team }] });
  if (off === 'fuse') { g.players[1].fused = true; g.players[0].duoCd = g.players[1].duoCd = 9999; }
  else { g.players[1].duoCd = 9999; g.players[0].fused = g.players[1].fused = true; }
  let used = 0;
  for (let n = 0; g.winner === null && n < 400; n++) {
    const a = S.chooseAction(g, level);
    if (!a) break;
    if (a.move <= -10 || a.move === S.FUSE_I) used++;
    S.doAction(g, a);
  }
  return { winner: g.winner, used };
}

if (isMainThread) {
  const N = +process.argv[2] || 1000, level = process.argv[3] || 'normale', W = os.cpus().length;
  for (const off of ['fuse', 'duo']) {
    let done = 0;
    const rs = [];
    for (let w = 0; w < W; w++) {
      const wk = new Worker(__filename, { workerData: { from: w, step: W, N, level, off } });
      wk.on('message', r => rs.push(...r));
      wk.on('exit', () => {
        if (++done < W) return;
        const on = rs.filter(r => r.used), ok = rs.filter(r => r.winner !== null);
        console.log(`${off === 'fuse' ? 'fusione' : 'tecniche'}: chi può usarla vince il ${(100 * ok.filter(r => r.winner === 0).length / ok.length).toFixed(1)}% · la usa in ${(100 * on.length / rs.length).toFixed(0)}% delle partite, e allora vince il ${(100 * on.filter(r => r.winner === 0).length / (on.length || 1)).toFixed(1)}%`);
      });
    }
  }
} else {
  const { from, step, N, level, off } = workerData;
  const out = [];
  for (let i = from; i < N; i += step) out.push(play(2000 + i * 6133, level, off));
  parentPort.postMessage(out);
}
