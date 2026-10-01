// Controllo delle armi come potenziamento: node tools/test-armi.js
const assert = require('assert');
const S = require('../engine.js');

const players = [{ name: 'A', cards: ['samuele', 'katya', 'grazia', 'caterina'] }, { name: 'B', cards: ['vittorio', 'celeste', 'annastella', 'adriano'] }];
const g = S.createGame({ seed: 42, first: 0, armory: true, gymEvents: false, players });
assert.deepStrictEqual(g.players[0].arms, []);

// una carta di B va K.O.: B riceve un'arma, A no
const victim = g.players[1].field[0];
victim.hp = 1;
const a = S.legalActions(g).find(x => x.actor && x.move === -1 && x.target === victim.uid);
S.doAction(g, a);
assert.strictEqual(g.players[1].ko.length, 1);
assert.strictEqual(g.players[1].arms.length, 1);
assert.strictEqual(g.players[0].arms.length, 0);

// nel turno di A l'arma di B non si può dare
assert.ok(!S.legalActions(g).some(x => x.arm));
S.passTurn(g);
assert.strictEqual(g.turn, 1);

// nel turno di B sì, a una sua carta in campo; non costa l'azione
const id = g.players[1].arms[0], w = S.WEAPON[id];
const t = g.players[1].field[0], atk = t.baseAtk, def = t.baseDef;
assert.ok(S.legalActions(g).some(x => x.arm === id && x.target === t.uid));
assert.ok(!S.doAction(g, { arm: id, target: g.players[0].field[0].uid }), 'non a un avversario');
assert.ok(S.doAction(g, { arm: id, target: t.uid }));
assert.strictEqual(t.weapon, id);
assert.strictEqual(t.baseAtk, atk + (w.atk || 0));
assert.strictEqual(t.baseDef, def + (w.def || 0));
assert.strictEqual(g.actions, 0);
assert.ok(!S.doAction(g, { arm: id, target: g.players[1].field[1].uid }), 'una volta sola');

// senza armory nessuna arma (le partite e i replay vecchi restano identici)
const old = S.createGame({ seed: 42, first: 0, gymEvents: false, players });
old.players[1].field[0].hp = 1;
S.doAction(old, S.legalActions(old).find(x => x.actor && x.move === -1 && x.target === old.players[1].field[0].uid));
assert.strictEqual(old.players[1].arms, undefined);

// il computer usa le armi
let used = 0;
for (let s = 0; s < 20; s++) {
  const c = S.createGame({ seed: s, armory: true, silent: true, players });
  for (let n = 0; c.winner === null && n < 300; n++) { const x = S.chooseAction(c, 'normale'); if (!x) { S.passTurn(c); continue; } if (x.arm) used++; S.doAction(c, x); }
}
assert.ok(used > 0, 'il computer non dà mai le armi');
console.log(`ok · armi date dal computer in 20 partite: ${used}`);
