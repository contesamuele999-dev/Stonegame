// Confronto tra livelli di difficoltà dell'IA: node tools/livelli.js facile normale 200
const path = require('path');
const S = require(path.join(__dirname, '..', 'engine.js'));
const [a, b, n] = [process.argv[2] || 'facile', process.argv[3] || 'normale', +process.argv[4] || 200];
let winsA = 0, t = Date.now(), maxMs = 0;
for (let i = 0; i < n; i++) {
  const t0 = S.randomTeam(), t1 = S.randomTeam();
  const g = S.createGame({ silent: true, first: i % 2, players: [{ name: a, cards: i % 4 < 2 ? t0 : t1 }, { name: b, cards: i % 4 < 2 ? t1 : t0 }] });
  let k = 0;
  while (g.winner === null && k++ < 400) {
    const s = Date.now();
    const act = S.chooseAction(g, g.turn === 0 ? a : b);
    maxMs = Math.max(maxMs, Date.now() - s);
    if (!act) break;
    S.doAction(g, act);
  }
  if (g.winner === 0) winsA++;
}
console.log(`${a} batte ${b} nel ${(100 * winsA / n).toFixed(1)}% delle partite (${n} partite, ${((Date.now() - t) / 1000).toFixed(1)}s, scelta più lenta ${maxMs}ms)`);
