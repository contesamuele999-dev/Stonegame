// Controllo del combattimento 2 (fatica, combo, cambio, Qi): node tools/test-combattimento.js
const assert = require('assert');
const S = require('../engine.js');

const players = [{ name: 'A', cards: ['samuele', 'grazia', 'caterina', 'katya'] }, { name: 'B', cards: ['vittorio', 'annastella', 'adriano', 'remigio'] }];
const make = (extra) => S.createGame(Object.assign({ seed: 7, first: 0, gymEvents: false, players }, extra));
const basic = (g, u, t) => ({ actor: u.uid, move: -1, target: t.uid });

// senza combat2 niente di nuovo: nessun Qi, nessun Cambio
const old = make();
assert.strictEqual(old.players[0].qi, undefined);
assert.ok(!S.actorOptions(old, old.players[0].field[0]).some(o => o.move.swap));

// combo: il secondo colpo di un'altra carta sullo stesso bersaglio fa +15% (stesso seme, stesso tiro)
const run = (combat2, first) => {
  const g = make({ combat2, seed: 11 });
  const [a, b] = g.players[0].field, t = g.players[1].field[0];
  S.doAction(g, basic(g, a, first ? t : g.players[1].field[1]));
  const hp = t.hp;
  S.doAction(g, basic(g, b, t));
  return hp - t.hp;
};
const withCombo = run(true, true), noCombo = run(true, false);
assert.ok(withCombo > noCombo, `combo ${withCombo} > ${noCombo}`);
assert.strictEqual(run(false, true), run(false, false), 'senza combat2 la combo non c\'è');

// il Qi si carica perdendo PV
const g = make({ combat2: true });
const t = g.players[1].field[0];
S.doAction(g, basic(g, g.players[0].field[0], t));
assert.ok(g.players[1].qi > 0 && g.players[0].qi === 0);

// Qi pieno: Colpo del Tempio dal secondo turno, non usa l'azione di una carta
S.passTurn(g);
g.players[1].qi = S.QI_MAX;
assert.ok(S.legalActions(g).some(x => x.qi));
const hp = g.players[0].field.map(f => f.hp);
assert.ok(S.doAction(g, { qi: true }));
assert.strictEqual(g.players[1].qi, 0);
g.players[0].field.forEach((f, i) => assert.strictEqual(f.hp, hp[i] - 25));
assert.strictEqual(g.actions, 0);
assert.ok(!S.doAction(g, { qi: true }), 'una volta sola');

// Cambio: esce la carta, entra la riserva che non agisce in questo turno
const u = g.players[1].field[1], r = g.players[1].reserve[0];
assert.ok(S.doAction(g, { actor: u.uid, move: S.SWAP_I, target: null }));
assert.strictEqual(g.players[1].field[1], r);
assert.strictEqual(g.players[1].reserve[0], u);
assert.ok(r.acted && !S.actorOptions(g, r)[0].ok);

// fatica: dal round 8 i danni crescono del 10% a round
const f = make({ combat2: true });
f.turnNo = 2 * S.FATIGUE_ROUND - 1;
assert.strictEqual(S.fatigue(f), 1.1);
f.turnNo += 2;
assert.ok(Math.abs(S.fatigue(f) - 1.2) < 1e-9);
assert.strictEqual(S.fatigue(make({ combat2: false, })), 1);

// il computer finisce le partite e usa Cambio e Qi
let swaps = 0, qi = 0, done = 0;
for (let s = 0; s < 30; s++) {
  const c = S.createGame({ seed: s, combat2: true, armory: true, effects: true, silent: true, players });
  for (let n = 0; c.winner === null && n < 400; n++) {
    const x = S.chooseAction(c, 'normale');
    if (!x) { S.passTurn(c); continue; }
    if (x.qi) qi++; if (x.move === S.SWAP_I) swaps++;
    S.doAction(c, x);
  }
  if (c.winner !== null) done++;
}
assert.strictEqual(done, 30, 'partite senza esito');
assert.ok(qi > 0, 'il computer non usa mai il Qi');
console.log(`ok · in 30 partite il computer ha usato il Qi ${qi} volte e il Cambio ${swaps}`);
