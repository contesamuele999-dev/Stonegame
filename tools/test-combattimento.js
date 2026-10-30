// Controllo del combattimento 2 (fatica, combo, cambio, Qi): node tools/test-combattimento.js
const assert = require('assert');
const S = require('../engine.js');

// gradi: nessun Allievo ha PV, ATK o DEF più alti dell'Istruttore o del Maestro più debole
for (const k of ['hp', 'atk', 'def']) {
  const tetto = Math.min(...S.CARDS.filter(c => c.rank !== 'A').map(c => c[k]));
  for (const c of S.CARDS) if (c.rank === 'A') assert.ok(c[k] <= tetto, `${c.name}: ${k} ${c[k]} oltre ${tetto}`);
}

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

// evoluzione: stadio 2 = PV/ATK/DEF × (1 + EVO[2].k) e 2 Punti Dojo in più; senza "ev" tutto come prima
const evo = S.createGame({ seed: 7, first: 0, gymEvents: false, synergies: false, players: [Object.assign({}, players[0], { ev: [2, 0, 0, 0] }), players[1]] });
const base = S.createGame({ seed: 7, first: 0, gymEvents: false, synergies: false, players });
const e0 = evo.players[0].field[0], b0 = base.players[0].field[0];
assert.strictEqual(e0.ev, 2);
assert.strictEqual(e0.maxHp, Math.round(b0.maxHp * (1 + S.EVO[2].k)));
assert.strictEqual(e0.baseAtk, Math.round(b0.baseAtk * (1 + S.EVO[2].k)));
assert.strictEqual(evo.players[0].field[1].maxHp, base.players[0].field[1].maxHp);
assert.strictEqual(S.teamCost(players[0].cards, [2, 0, 0, 1]), S.teamCost(players[0].cards) + 3);
assert.ok(qi > 0, 'il computer non usa mai il Qi');

// ogni coppia di elementi ha la sua tecnica
const els = Object.keys(S.ELEMENTS);
for (const a of els) for (const b of els) assert.ok(S.DUO[[a, b].sort().join('+')], `manca ${a}+${b}`);
for (const c of S.CARDS) if (c.rank === 'A') assert.ok(els.includes(S.elementOf(c.id)));

// tecnica di coppia: due Allievi (fuoco + foresta), costa l'azione di entrambi, ATK sommati, poi ricarica di squadra
const duoPlayers = [{ name: 'A', cards: ['lorenzo', 'nicole', 'katya', 'grazia'] }, { name: 'B', cards: ['andrea', 'chen', 'elia', 'katya'] }];
const mk = () => { const x = S.createGame({ seed: 5, first: 0, gymEvents: false, combat2: true, players: duoPlayers }); S.passTurn(x); S.passTurn(x); return x; };
const dg = mk(), [la, ni, ka] = dg.players[0].field, nem = dg.players[1].field[0];
const opt = S.actorOptions(dg, la).find(o => o.partner === ni.uid);
assert.strictEqual(opt.move.name, 'Fenice del Bosco');
assert.ok(opt.ok);
assert.ok(!S.actorOptions(dg, ka).some(o => o.partner), 'solo gli Allievi');
const pv = S.previewDamage(dg, la, opt.move, nem), solo = S.previewDamage(dg, la, S.BASIC, nem);
assert.ok(pv[0] > solo[1] * 1.4, `tecnica ${pv} contro attacco ${solo}`);
la.hp -= 30;
const nemHp = nem.hp;
assert.ok(S.doAction(dg, { actor: la.uid, move: opt.i, target: nem.uid }));
assert.ok(nem.hp < nemHp && la.acted && ni.acted && la.hp > la.maxHp - 30);
assert.strictEqual(dg.actions, 2);
S.passTurn(dg); S.passTurn(dg);
assert.ok(!S.actorOptions(dg, la).find(o => o.partner).ok, 'in ricarica');
for (let i = 0; i < 8; i++) S.passTurn(dg);
assert.ok(S.actorOptions(dg, la).find(o => o.partner).ok, 'ricarica finita');

// fusione: PV sommati, tutte le mosse, entra la riserva, una volta sola, K.O. = perse entrambe
const fg = mk(), [fa, fb, fc] = fg.players[0].field, res = fg.players[0].reserve[0];
const hpSum = fa.hp + fb.hp, atkMax = Math.max(fa.baseAtk, fb.baseAtk);
assert.ok(S.actorOptions(fg, fa).find(o => o.i === S.FUSE_I).ok);
assert.ok(S.targetsFor(fg, fa, S.FUSE).includes(fb));
assert.ok(S.doAction(fg, { actor: fa.uid, move: S.FUSE_I, target: fb.uid }));
assert.strictEqual(fa.fusion, 'nicole');
assert.strictEqual(fa.name, 'Loreole');
assert.strictEqual(fa.hp, hpSum);
assert.ok(fa.baseAtk > atkMax);
assert.strictEqual(S.movesOf(fa).length, 4);
assert.strictEqual(fa.cds.length, 4);
assert.ok(fg.players[0].field.includes(res) && !fg.players[0].field.includes(fb) && res.acted);
assert.strictEqual(fg.actions, 2);
assert.ok(!S.actorOptions(fg, fc).find(o => o.i === S.FUSE_I).ok, 'una fusione per partita');
S.passTurn(fg); S.passTurn(fg);
const mi = S.actorOptions(fg, fa).find(o => o.i === 2 && o.ok);
assert.ok(mi, 'la mossa del secondo si usa');
assert.ok(S.doAction(fg, { actor: fa.uid, move: 2, target: fg.players[1].field[0].uid }) && fa.cds[2] > 0);
const clonato = S.clone(fg);
assert.strictEqual(S.movesOf(clonato.players[0].field[0]).length, 4);

// il computer finisce le partite anche con tecniche e fusioni
let duos = 0, fus = 0;
for (let s = 0; s < 20; s++) {
  const c = S.createGame({ seed: s, combat2: true, armory: true, effects: true, silent: true, players: [{ name: 'A', cards: ['lorenzo', 'nicole', 'adriano', 'gatto'] }, { name: 'B', cards: ['vittorio', 'annastella', 'celeste', 'remigio'] }] });
  for (let n = 0; c.winner === null && n < 400; n++) {
    const x = S.chooseAction(c, 'normale');
    if (!x) { S.passTurn(c); continue; }
    if (x.move <= -10) duos++; if (x.move === S.FUSE_I) fus++;
    assert.ok(S.doAction(c, x), 'mossa rifiutata');
  }
  assert.ok(c.winner !== null, 'partita senza esito');
}
assert.ok(duos > 0, 'il computer non usa mai le tecniche di coppia');
console.log(`ok · in 30 partite il computer ha usato il Qi ${qi} volte e il Cambio ${swaps}; in 20 partite di Allievi ${duos} tecniche e ${fus} fusioni`);
