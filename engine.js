/* STONE TEMPLE TAO — Il Torneo delle Carte
 * Motore di gioco: carte, regole, effetti e intelligenza artificiale.
 * Funziona sia nel browser (window.STT) sia in Node (require) per le simulazioni di bilanciamento.
 */
(function (root) {
  'use strict';

  // Costante della formula dei danni: danni = ATK × K / (K + DEF)
  // DEF 0 → danno pieno, DEF 50 → metà, DEF 100 → un terzo.
  const K = 50;
  const TEAM_SIZE = 4;       // 3 in campo + 1 riserva
  const FIELD_SIZE = 3;
  const BUDGET = 10;         // Punti Dojo per squadra
  const CONFUSE_CHANCE = 0.35;
  const FIRST_TURN_ACTIONS = 2; // chi inizia, al primo turno, agisce con due sole carte

  const RANKS = { A: 'Allievo', I: 'Istruttore', M: 'Maestro', L: 'Leggenda' };
  // Maestri e Leggende contano entrambi come "Maestri" per mosse e sinergie
  const isMaster = f => f.rank === 'M' || f.rank === 'L';

  // ---------------------------------------------------------------- RNG
  function rand(g) {
    // mulberry32, stato salvato nella partita così i cloni restano coerenti
    let t = (g.seed = (g.seed + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // ---------------------------------------------------------------- CARTE
  // target: enemy | enemies | self | ally | allies | any | none
  // cd = turni di ricarica dopo l'uso. once = una volta per partita.
  const CARDS = [
    {
      id: 'andrea', name: 'Andrea', rank: 'M', cost: 4, hp: 145, atk: 85, def: 75,
      orig: { atk: 120, def: 95 },
      moves: [
        { name: 'Calma Sovrastante', target: 'allies', cd: 3,
          desc: 'Annulla stordimento e ogni malus su tutta la sua squadra. Gli alleati non possono essere storditi per 2 turni.',
          use(g, u) {
            for (const f of team(g, u.owner)) { cleanse(g, f); addStatus(g, f, u, 'stunGuard', 2); }
            log(g, `${nm(u)} infonde calma a tutta la squadra.`);
          } },
        { name: 'Rimprovero Costruttivo', target: 'enemy', cd: 3,
          desc: 'Assorbe la DEF dell\'avversario (fino a 40): il bersaglio perde quei punti DEF e Andrea li somma al suo ATK per il turno successivo.',
          use(g, u, t) {
            const x = Math.max(0, Math.min(40, Math.round(effDef(g, t))));
            addStatus(g, t, u, 'defAdd', 1, -x);
            addStatus(g, u, u, 'atkAdd', 1, x, true);
            log(g, `${nm(u)} assorbe ${x} DEF da ${nm(t)}!`);
          } },
      ],
    },
    {
      id: 'chen', name: 'Chen Delang', rank: 'M', cost: 4, hp: 155, atk: 80, def: 70,
      orig: { atk: 100, def: 100 },
      moves: [
        { name: 'Spallata del Prodigio', target: 'enemy', cd: 2, pierce: true, hit: {},
          desc: 'Attacco che apre un varco: ignora invulnerabilità, schivate e contrattacchi. 1 su 3: parte la musica dei Prodigy e i danni raddoppiano!',
          use(g, u, t) {
            let mul = 1;
            if (rand(g) < 1 / 3) { mul = 2; log(g, '🎵 Parte la musica dei Prodigy! Danni raddoppiati!'); }
            attack(g, u, t, { mul, pierce: true });
          } },
        { name: 'Addestramento Anticinese', target: 'self', cd: 3,
          desc: 'Raddoppia i punti attacco per il prossimo attacco (entro il turno successivo).',
          use(g, u) { addStatus(g, u, u, 'nextAtkMul', 1, 2, true); log(g, `${nm(u)} si concentra: il prossimo attacco farà il doppio!`); } },
      ],
    },
    {
      id: 'elia', name: 'Elia Moretton', rank: 'M', cost: 4, hp: 140, atk: 85, def: 75,
      orig: { atk: 90, def: 90 },
      moves: [
        { name: 'Perfezionismo Compulsivo', target: 'enemy', cd: 3,
          desc: 'Fa notare gli errori di tecnica: l\'avversario dimezza il suo ATK per 2 turni.',
          use(g, u, t) { addStatus(g, t, u, 'atkMul', 2, 0.5); log(g, `${nm(t)} dubita di sé: ATK dimezzato!`); } },
        { name: 'Disallineamento Temporale', target: 'self', once: true, nocopy: true,
          desc: 'Una volta per partita: dimentica gli attacchi subiti. Recupera 40 PV, annulla i malus e ottiene +20 ATK permanenti; da ora il suo ATK non può più essere ridotto.',
          use(g, u) {
            cleanse(g, u); heal(g, u, 40); u.forget = true;
            addStatus(g, u, u, 'atkAdd', 99, 20, true, true);
            log(g, `${nm(u)} ha dimenticato tutto... anche le valigie. Forza massima!`);
          } },
      ],
    },
    {
      id: 'katya', name: 'Katya', rank: 'M', cost: 3, hp: 130, atk: 65, def: 70,
      orig: { atk: 60, def: 80 },
      moves: [
        { name: 'Firma Urgente', target: 'enemies', cd: 3,
          desc: 'Blocca le tecniche avversarie: per 1 turno nessun avversario può usare mosse speciali.',
          use(g, u) { for (const f of enemies(g, u.owner)) addStatus(g, f, u, 'block', 1); log(g, `${nm(u)} fa firmare un modulo urgente: tecniche avversarie bloccate!`); } },
        { name: 'Annotazione Omnidirezionale', target: 'enemy', cd: 2, pierce: true, whileStunned: true, hit: { flat: 15 },
          desc: 'Colpisce con precisione qualsiasi avversario (+15 danni): ignora schivate e invulnerabilità. Si può usare anche se Katya è stordita.',
          use(g, u, t) { attack(g, u, t, { pierce: true, flat: 15 }); } },
      ],
    },
    {
      id: 'chicca', name: 'Chicca Fossa', rank: 'M', cost: 3, hp: 140, atk: 65, def: 60,
      orig: { atk: 70, def: 60 },
      moves: [
        { name: 'Blocco Telematico', target: 'enemy', cd: 3, hit: { defMul: 0.5 },
          desc: 'Rallenta l\'avversario (ATK −25% per 2 turni) e lo colpisce con la sua difesa dimezzata.',
          use(g, u, t) { attack(g, u, t, { defMul: 0.5 }); addStatus(g, t, u, 'atkMul', 2, 0.75); } },
        { name: 'Ventaglio Perforante', target: 'enemy', cd: 1, hit: { flat: 10 },
          desc: 'Finge di avere caldo e attacca con il ventaglio: +10 danni extra.',
          use(g, u, t) { attack(g, u, t, { flat: 10 }); } },
      ],
    },
    {
      id: 'samuele', name: 'Samuele Contessa', rank: 'I', cost: 4, hp: 165, atk: 90, def: 70,
      orig: { atk: 100, def: 90 },
      moves: [
        { name: 'Videopatia', target: 'enemy', cd: 3,
          desc: 'Chi entra nell\'obiettivo subisce ansia da prestazione: ATK e DEF −50% per 2 turni.',
          use(g, u, t) { addStatus(g, t, u, 'atkMul', 2, 0.5); addStatus(g, t, u, 'defMul', 2, 0.5); log(g, `📸 ${nm(t)} ha l'ansia da prestazione!`); } },
        { name: 'Gomiti di Ferro', target: 'self', cd: 4,
          desc: 'Invulnerabile per 1 turno e +10 ATK per ogni carta Maestro in campo (per 2 turni).',
          use(g, u) {
            const m = field(g).filter(isMaster).length;
            addStatus(g, u, u, 'invuln', 1, 0, true);
            if (m) addStatus(g, u, u, 'atkAdd', 2, 10 * m, true);
            log(g, `${nm(u)} alza i gomiti di ferro: invulnerabile${m ? ` e +${10 * m} ATK` : ''}!`);
          } },
      ],
    },
    {
      id: 'niccolo', name: 'Niccolò Cividini', rank: 'I', cost: 3, hp: 135, atk: 70, def: 65,
      orig: { atk: 70, def: 65 },
      moves: [
        { name: 'Terza Persona Colloquiale', target: 'enemy', cd: 4,
          desc: 'Stordisce il nemico dandogli del "Lei" per 2 turni.',
          use(g, u, t) { stun(g, t, u, 2); } },
        { name: 'Mutandone Dirompente', target: 'self', cd: 3,
          desc: 'Indossa la divisa da Sumo: +20 ATK e +20 DEF per 3 turni.',
          use(g, u) { addStatus(g, u, u, 'atkAdd', 3, 20, true); addStatus(g, u, u, 'defAdd', 3, 20, true); log(g, `${nm(u)} indossa il mutandone da Sumo!`); } },
      ],
    },
    {
      id: 'strahinja', name: 'Strahinja Crnic', rank: 'I', cost: 3, hp: 140, atk: 75, def: 50,
      orig: { atk: 80, def: 50 },
      moves: [
        { name: 'Dolori Omnidirezionali', target: 'enemies', cd: 4,
          desc: 'Dolori che nessuno nota: ogni avversario in campo subisce 10 danni per 3 turni (ignorano la difesa).',
          use(g, u) { for (const f of enemies(g, u.owner)) addStatus(g, f, u, 'dot', 3, 10); log(g, `${nm(u)} semina dolori omnidirezionali...`); } },
        { name: 'Organizzazione Confusionaria', target: 'enemy', cd: 3, hit: {},
          desc: 'Attacca e confonde l\'avversario per 2 turni (può colpirsi per sbaglio).',
          use(g, u, t) { attack(g, u, t); confuse(g, t, u, 2); } },
      ],
    },
    {
      id: 'federica', name: 'Federica Siciliano', rank: 'I', cost: 3, hp: 135, atk: 60, def: 55,
      orig: { atk: 50, def: 50 },
      moves: [
        { name: 'Dominio dell\'Infante', target: 'enemies', cd: 3, pierce: true, hit: { mul: 0.5 },
          desc: 'Evoca bambini non-morti che attaccano tutti gli avversari da ogni direzione: impossibile schivare, ma l\'attacco è dimezzato.',
          use(g, u) { for (const f of enemies(g, u.owner)) attack(g, u, f, { mul: 0.5, pierce: true }); } },
        { name: 'Siculazione Distorta', target: 'enemy', cd: 4, hit: { flat: 20 },
          desc: 'Stordisce il nemico con frasi incomprensibili (1 turno) e attacca con +20 danni.',
          use(g, u, t) { attack(g, u, t, { flat: 20 }); stun(g, t, u, 1); } },
      ],
    },
    {
      id: 'lorenzo', name: 'Lorenzo Pattaro', rank: 'A', cost: 3, hp: 145, atk: 80, def: 55,
      orig: { atk: 90, def: 80 },
      moves: [
        { name: 'Berserker dell\'Ingiustizia', target: 'self', cd: 3,
          desc: 'Ottiene +20 ATK per 2 turni.',
          use(g, u) { addStatus(g, u, u, 'atkAdd', 2, 20, true); log(g, `${nm(u)} entra in modalità Berserker!`); } },
        { name: 'Risposta Scazzata', target: 'none', cd: 5, offensive: true,
          desc: 'Stordisce per 1 turno TUTTE le altre carte in campo, anche le sue (Istruttori e Maestri per 2 turni).',
          use(g, u) {
            log(g, `${nm(u)}: "...e quindi?" 🙄`);
            for (const f of field(g)) if (f !== u) stun(g, f, u, f.rank !== 'A' ? 2 : 1);
          } },
      ],
    },
    {
      id: 'annastella', name: 'Annastella Bettiol', rank: 'A', cost: 2, hp: 150, atk: 60, def: 50,
      orig: { atk: 40, def: 50 },
      moves: [
        { name: 'Che Voglia di Vivere', target: 'any', cd: 2,
          desc: 'Toglie 40 punti DEF a qualsiasi carta in campo (anche a sé stessa) per 2 turni.',
          use(g, u, t) { addStatus(g, t, u, 'defAdd', 2, -40); log(g, `${nm(t)} perde 40 DEF. Che voglia di vivere...`); } },
        { name: 'Spaccaossa', target: 'enemy', cd: 3, hit: {},
          desc: 'Colpisce e toglie 30 punti ATK alla carta bersagliata per 2 turni.',
          use(g, u, t) { attack(g, u, t); addStatus(g, t, u, 'atkAdd', 2, -30); } },
      ],
    },
    {
      id: 'vittorio', name: 'Vittorio Buosi', rank: 'A', cost: 2, hp: 100, atk: 40, def: 35,
      orig: { atk: 50, def: 30 },
      moves: [
        { name: 'Depressione Istantanea', target: 'enemy', cd: 4, hit: { ignoreDef: true },
          desc: 'Azzera i punti difesa dell\'avversario per 1 turno (usabile una volta ogni 5 turni) e lo colpisce.',
          use(g, u, t) { addStatus(g, t, u, 'defZero', 1); attack(g, u, t); } },
        { name: 'Sparizione Ultragenitoriale', target: 'self', cd: 5, free: true, whileStunned: true, nocopy: true,
          desc: 'In qualsiasi momento, senza usare il turno: torna in riserva (perdendo ogni effetto) e la riserva entra al suo posto. Se non c\'è riserva, sparisce e non può essere bersagliato per 1 turno.',
          use(g, u) {
            const p = g.players[u.owner];
            if (p.reserve.length) {
              const r = p.reserve.shift();
              clearAll(u);
              const i = p.field.indexOf(u);
              p.field[i] = r; p.reserve.push(u);
              r.acted = u.acted; // la riserva agisce solo se Vittorio non aveva ancora agito
              log(g, `${nm(u)} sparisce senza che nessuno se ne accorga... entra ${nm(r)}!`);
              ev(g, { type: 'enter', uid: r.uid });
            } else {
              addStatus(g, u, u, 'hidden', 1, 0, true);
              log(g, `${nm(u)} sparisce: nessuno sa dove sia!`);
            }
          } },
      ],
    },
    {
      id: 'grazia', name: 'Grazia Lecci', rank: 'A', cost: 2, hp: 120, atk: 55, def: 45,
      orig: { atk: 40, def: 45 },
      moves: [
        { name: 'Peluche Ipercoccoloso', target: 'enemy', cd: 4, hit: { defMul: 0.5 },
          desc: 'L\'avversario si innamora del peluche: lo colpisce con la sua DEF dimezzata e lo stordisce per 1 turno.',
          use(g, u, t) { attack(g, u, t, { defMul: 0.5 }); stun(g, t, u, 1); } },
        { name: 'Pubblicità Fotogenica', target: 'enemy', cd: 1, hit: { flat: 10 },
          desc: 'Si mostra innocua per poi sferrare l\'attacco con 10 punti extra.',
          use(g, u, t) { attack(g, u, t, { flat: 10 }); } },
      ],
    },
    {
      id: 'celeste', name: 'Celeste Brugnera', rank: 'A', cost: 2, hp: 175, atk: 60, def: 55,
      orig: { atk: 30, def: 30 },
      moves: [
        { name: 'Chioma Rinata', target: 'anyOther', once: true, nocopy: true,
          desc: 'Una volta per partita: cambia aspetto trasformandosi in un\'altra carta in campo (ne copia ATK, DEF, grado e mosse; mantiene i suoi PV).',
          use(g, u, t) {
            const c = cardOf(t);
            u.form = c.id; u.baseAtk = c.atk; u.baseDef = c.def; u.rank = c.rank;
            u.cds = [1, 1]; u.used = {};
            log(g, `${nm(u)} cambia aspetto e diventa ${c.name}!`);
            ev(g, { type: 'transform', uid: u.uid });
          } },
        { name: 'Presenza Eterea', passive: true, cd: 4,
          desc: 'Passiva: schiva automaticamente il primo attacco subito, poi si ricarica per 4 turni.' },
      ],
    },
    {
      id: 'caterina', name: 'Caterina Fighera', rank: 'A', cost: 1, hp: 125, atk: 45, def: 35,
      orig: { atk: 35, def: 35 },
      moves: [
        { name: 'Incazzatura Interstellare', target: 'self', cd: 3,
          desc: 'Per 2 turni moltiplica ×2 tutti i danni che infligge… ma anche quelli che subisce.',
          use(g, u) { addStatus(g, u, u, 'dmgOut', 2, 2, true); addStatus(g, u, u, 'dmgIn', 2, 2, true); log(g, `${nm(u)} è incazzata a livello interstellare! 💥`); } },
        { name: 'Intenditrice Seriale', target: 'none', once: true, nocopy: true, needsReserve: true,
          desc: 'Una volta per partita: mette subito in tavola la carta di riserva (la squadra avrà 4 carte in campo).',
          use(g, u) {
            const p = g.players[u.owner];
            const r = p.reserve.shift();
            p.field.push(r);
            log(g, `${nm(u)} chiama in tavola ${nm(r)}!`);
            ev(g, { type: 'enter', uid: r.uid });
          } },
      ],
    },
    {
      id: 'christian', name: 'Christian Cecchin', rank: 'A', cost: 2, hp: 115, atk: 50, def: 50,
      orig: { atk: 40, def: 50 },
      moves: [
        { name: 'Apprendimento Fulmineo', target: 'copy', cd: 4, nocopy: true,
          desc: 'Copia e usa subito una mossa speciale di un avversario in campo.',
          use() {} },
        { name: 'T-shirt Magistrali', target: 'unfaced', cd: 3, hit: {},
          desc: 'Paralizza per 1 turno un avversario che non ha mai affrontato (mai colpito né subito colpi da lui) e lo colpisce.',
          use(g, u, t) { attack(g, u, t); stun(g, t, u, 1, 'paralizzato'); } },
      ],
    },
    {
      id: 'viola', name: 'Viola Donadi', rank: 'A', cost: 2, hp: 125, atk: 50, def: 50,
      orig: { atk: 40, def: 50 },
      moves: [
        { name: 'Volto Marmoreo', target: 'self', cd: 3,
          desc: 'Annulla qualsiasi effetto ricevuto e diventa immune agli effetti per 2 turni. Recupera 20 PV.',
          use(g, u) { cleanse(g, u); heal(g, u, 20); addStatus(g, u, u, 'immune', 2, 0, true); log(g, `${nm(u)} assume un volto di marmo.`); } },
        { name: 'Canto Apocalittico', target: 'enemy', cd: 4,
          desc: 'Stordisce l\'avversario (1 turno) e gli fa autoinfliggere il suo stesso attacco.',
          use(g, u, t) {
            log(g, `🎤 ${nm(u)} intona il Canto Apocalittico!`);
            selfHit(g, t, 1);
            stun(g, t, u, 1);
          } },
      ],
    },
    {
      id: 'alessandro', name: 'Alessandro Rizzo', rank: 'A', cost: 2, hp: 150, atk: 65, def: 35,
      orig: { atk: 60, def: 30 },
      moves: [
        { name: 'Sudorazione Esplosiva', target: 'enemy', cd: 2, hit: {},
          desc: 'Attacca e applica bruciore anale al tocco: 12 danni per 3 turni (ignorano la difesa).',
          use(g, u, t) { attack(g, u, t); addStatus(g, t, u, 'dot', 3, 12); } },
        { name: 'Piedi Lanosi', target: 'self', cd: 4,
          desc: 'Aumenta la difesa del 300% per 2 turni.',
          use(g, u) { addStatus(g, u, u, 'defMul', 2, 4, true); log(g, `${nm(u)} sfodera i piedi lanosi: DEF +300%!`); } },
      ],
    },
    {
      id: 'adriano', name: 'Adriano Rossetto', rank: 'A', cost: 2, hp: 145, atk: 50, def: 80,
      orig: { atk: 30, def: 90 },
      moves: [
        { name: 'Vibrazione Ineluttabile', passive: true,
          desc: 'Passiva: nessun effetto negativo può essergli applicato. Quando attacca, la protezione svanisce per un turno.' },
        { name: 'Ballo Dirompente', target: 'none', cd: 3, offensive: true,
          desc: 'Interrompe tutti gli effetti (positivi e negativi) di tutte le altre carte in campo, poi colpisce un avversario a caso.',
          use(g, u) {
            for (const f of field(g)) if (f !== u) clearAll(f);
            log(g, `${nm(u)} si lancia in un ballo dirompente: tutti gli effetti svaniscono!`);
            const es = enemies(g, u.owner);
            if (es.length) attack(g, u, es[Math.floor(rand(g) * es.length)]);
          } },
      ],
    },
    // ---------------------------------------------------------------- carte aggiunte il 29 settembre
    {
      id: 'signorello', name: 'Lorenzo Signorello', rank: 'I', cost: 3, hp: 145, atk: 80, def: 65,
      orig: { atk: 100, def: 90 },
      moves: [
        { name: 'Sussurro Eterno', target: 'enemies', cd: 4, hit: { mul: 0.45 },
          desc: 'Parla a ogni manifestazione dell\'esistenza ed evoca eserciti: tutti gli avversari subiscono un attacco al 45% della sua forza.',
          use(g, u) { log(g, `${nm(u)} sussurra all'esistenza: arrivano gli eserciti!`); for (const f of enemies(g, u.owner)) attack(g, u, f, { mul: 0.45 }); } },
        { name: 'Demassazione Fecale', target: 'self', cd: 3,
          desc: 'Riduce la sua massa per diventare velocissimo: +10 ATK e +10 DEF per 2 turni e schiva il prossimo attacco.',
          use(g, u) { addStatus(g, u, u, 'atkAdd', 2, 10, true); addStatus(g, u, u, 'defAdd', 2, 10, true); addStatus(g, u, u, 'evade', 1, 0, true); log(g, `${nm(u)} si alleggerisce… e diventa velocissimo! 💨`); } },
      ],
    },
    {
      id: 'remigio', name: 'Remigio Spinazzè', rank: 'A', cost: 2, hp: 140, atk: 65, def: 60,
      orig: { atk: 70, def: 70 },
      moves: [
        { name: 'Potenziamento Tysoniano', target: 'self', cd: 2, maxUses: 3,
          desc: 'Aumenta l\'attacco di 10 punti per il resto della partita (fino a 3 volte).',
          use(g, u) { addStatus(g, u, u, 'atkAdd', 99, 10, true, true); log(g, `🥊 ${nm(u)} si potenzia: +10 ATK!`); } },
        { name: 'Manutenzione Post-Apocalittica', target: 'allies', cd: 4,
          desc: 'Cura tutta la squadra in campo di 20 PV.',
          use(g, u) { for (const f of team(g, u.owner)) heal(g, f, 20); log(g, `🔧 ${nm(u)} rimette in sesto la squadra.`); } },
      ],
    },
    {
      id: 'nicole', name: 'Nicole Fava', rank: 'A', cost: 1, hp: 130, atk: 35, def: 35,
      orig: { atk: 30, def: 35 },
      moves: [
        { name: 'Cameraman Improvvisato', target: 'enemy', cd: 3,
          desc: 'Cattura l\'istante perfetto: prende fino a 30 punti DEF dell\'avversario e li aggiunge ai suoi per 2 turni; il suo prossimo attacco fa il 50% in più.',
          use(g, u, t) {
            const x = Math.max(0, Math.min(30, Math.round(effDef(g, t))));
            addStatus(g, t, u, 'defAdd', 2, -x);
            addStatus(g, u, u, 'defAdd', 2, x, true);
            addStatus(g, u, u, 'nextAtkMul', 2, 1.5, true);
            log(g, `🎥 ${nm(u)} cattura l'istante: prende ${x} DEF a ${nm(t)}!`);
          } },
        { name: 'Gentilezza Ultrapremurosa', target: 'allies', cd: 4,
          desc: 'Il tocco magico della cura: +10 ATK e +10 DEF a ogni membro della squadra in campo per 2 turni, e 10 PV di cura.',
          use(g, u) { for (const f of team(g, u.owner)) { addStatus(g, f, u, 'atkAdd', 2, 10, true); addStatus(g, f, u, 'defAdd', 2, 10, true); heal(g, f, 10); } log(g, `🥰 ${nm(u)} coccola tutta la squadra.`); } },
      ],
    },
    {
      id: 'annalisa', name: 'Annalisa Brino', rank: 'A', cost: 1, hp: 145, atk: 45, def: 55,
      orig: { atk: 20, def: 50 },
      moves: [
        { name: 'Saluto Caritatevole', target: 'enemies', cd: 3,
          desc: 'Abbassa di 25 i punti difesa di tutti gli avversari per 2 turni.',
          use(g, u) { for (const f of enemies(g, u.owner)) addStatus(g, f, u, 'defAdd', 2, -25); log(g, `🙏 ${nm(u)} saluta tutti con grande carità.`); } },
        { name: 'Ribaltamento Psicosomatico', target: 'enemy', cd: 4,
          desc: 'Inverte i punti ATK e DEF dell\'avversario per 2 turni.',
          use(g, u, t) { if (addStatus(g, t, u, 'swap', 2)) { log(g, `🔄 ${nm(t)} si ritrova con ATK e DEF invertiti!`); ev(g, { type: 'status', uid: t.uid, text: 'INVERTITO' }); } } },
      ],
    },
    {
      id: 'wangting', name: 'Chen Wangting', rank: 'L', title: 'Fondatore Supremo', cost: 6, hp: 170, atk: 85, def: 90,
      orig: { atk: '∞', def: '∞' },
      moves: [
        { name: 'Creazione Marziale', target: 'self', cd: 3,
          desc: 'Fino al suo prossimo turno restituisce ogni attacco con il doppio dei danni, senza subirne. Non ferma gli attacchi che ignorano le difese.',
          use(g, u) { addStatus(g, u, u, 'reflect', 1, 2, true); log(g, `☯️ ${nm(u)} assume la posizione della Creazione Marziale.`); } },
        { name: 'Discendenza Impetuosa', target: 'enemyWeak', once: true, nocopy: true,
          desc: 'Una volta per partita: converte in suo discepolo un avversario con metà dei PV o meno (non una Leggenda), che passa nella sua squadra.',
          use(g, u, t) { convert(g, u, t); } },
      ],
    },
    {
      id: 'zhenglei', name: 'Chen Zhenglei', rank: 'L', title: 'Gran Maestro', cost: 6, hp: 135, atk: 85, def: 70,
      orig: { atk: 1000, def: 1000 },
      moves: [
        { name: 'Ciuffata Cosmica', target: 'enemies', once: true, offensive: true, nocopy: true,
          desc: 'Una volta per partita: ogni avversario in campo perde metà dei PV che gli restano (ignora qualsiasi difesa).',
          use(g, u) {
            log(g, `🌌 ${nm(u)} scatena la Ciuffata Cosmica!`);
            for (const f of enemies(g, u.owner)) if (f.hp > 1) damage(g, f, Math.floor(f.hp / 2), u);
          } },
        { name: 'Forma Universale', target: 'allies', cd: 6,
          desc: 'Raddoppia ATK e DEF di tutta la sua squadra in campo per 1 turno.',
          use(g, u) { for (const f of team(g, u.owner)) { addStatus(g, f, u, 'atkMul', 1, 2, true); addStatus(g, f, u, 'defMul', 1, 2, true); } log(g, `🌀 ${nm(u)} assume la Forma Universale: la squadra raddoppia!`); } },
      ],
    },
  ];

  // Discendenza Impetuosa: l'avversario passa nella squadra di chi lo converte
  function convert(g, u, t) {
    const from = g.players[t.owner], to = g.players[u.owner];
    const i = from.field.indexOf(t);
    if (i < 0) return;
    from.field.splice(i, 1);
    t.owner = u.owner;
    t.acted = true;
    t.st = t.st.filter(s => !isNegative(s) || s.perm);
    to.field.push(t);
    log(g, `🙇 ${nm(t)} diventa discepolo di ${nm(u)} e passa nella sua squadra!`);
    ev(g, { type: 'status', uid: t.uid, text: 'DISCEPOLO' });
    if (from.reserve.length && from.field.length < FIELD_SIZE) {
      const r = from.reserve.shift();
      from.field.splice(i, 0, r);
      log(g, `${nm(r)} entra in campo!`);
      ev(g, { type: 'enter', uid: r.uid });
    }
    checkWin(g);
  }

  // ---------------------------------------------------------------- SINERGIE DI SQUADRA
  const SYNERGIES = [
    { id: 'maestri', name: 'Linea dei Maestri', desc: 'Almeno 2 Maestri in squadra: i Maestri hanno +15 PV.',
      test: r => r.M >= 2, apply: f => { if (isMaster(f)) { f.hp += 15; f.maxHp += 15; } } },
    { id: 'istruttori', name: 'Istruttori affiatati', desc: 'Almeno 2 Istruttori in squadra: gli Istruttori hanno +8 ATK.',
      test: r => r.I >= 2, apply: f => { if (f.rank === 'I') f.baseAtk += 8; } },
    { id: 'allievi', name: 'Forza degli allievi', desc: 'Almeno 3 Allievi in squadra: gli Allievi hanno +8 DEF.',
      test: r => r.A >= 3, apply: f => { if (f.rank === 'A') f.baseDef += 8; } },
    { id: 'scuola', name: 'Scuola completa', desc: 'Almeno un Maestro, un Istruttore e un Allievo: tutte le carte hanno +10 PV.',
      test: r => r.M >= 1 && r.I >= 1 && r.A >= 1, apply: f => { f.hp += 10; f.maxHp += 10; } },
  ];
  function synergiesFor(ids) {
    const r = { M: 0, I: 0, A: 0 };
    ids.forEach(id => { const k = CARD[id].rank === 'L' ? 'M' : CARD[id].rank; r[k]++; });
    return SYNERGIES.filter(x => x.test(r));
  }

  // ---------------------------------------------------------------- EVENTI DELLA PALESTRA
  // Ogni 3 round capita qualcosa in palestra: vale per tutte le carte in campo, di entrambe le squadre, per un round.
  const GYM_EVENTS = [
    { id: 'lezione', name: 'Lezione extra', desc: 'Tutte le carte in campo recuperano 15 PV.',
      run(g) { for (const f of field(g)) heal(g, f, 15); } },
    { id: 'caldo', name: 'Aria condizionata rotta', desc: 'Che caldo! ATK −15% a tutti per questo round.',
      run(g, src) { for (const f of field(g)) addStatus(g, f, src, 'atkMul', 1, 0.85, true); } },
    { id: 'maestro', name: 'Il Maestro osserva', desc: 'Maestri e Istruttori danno il massimo: +10 ATK per questo round.',
      run(g, src) { for (const f of field(g)) if (f.rank !== 'A') addStatus(g, f, src, 'atkAdd', 1, 10, true); } },
    { id: 'musica', name: 'Musica a palla', desc: 'Tutti si caricano: +10 ATK per questo round.',
      run(g, src) { for (const f of field(g)) addStatus(g, f, src, 'atkAdd', 1, 10, true); } },
    { id: 'pulizie', name: 'Pulizie del tatami', desc: 'Si riparte puliti: spariscono tutti gli effetti negativi.',
      run(g) { for (const f of field(g)) cleanse(g, f); } },
    { id: 'riscaldamento', name: 'Riscaldamento', desc: 'Muscoli caldi: +15 DEF a tutti per questo round.',
      run(g, src) { for (const f of field(g)) addStatus(g, f, src, 'defAdd', 1, 15, true); } },
  ];
  const EVENT_EVERY = 3;

  function gymEvent(g) {
    const e = GYM_EVENTS[Math.floor(rand(g) * GYM_EVENTS.length)];
    // l'effetto dura un round intero: scade a fine turno dell'avversario di chi apre il round
    const src = { owner: 1 - g.turn };
    g.lastEvent = e.id;
    log(g, `📣 Evento in palestra: ${e.name}! ${e.desc}`);
    ev(g, { type: 'gymevent', id: e.id, name: e.name, desc: e.desc });
    e.run(g, src);
  }

  // ---------------------------------------------------------------- CARTE TERRENO (le palestre)
  // Una per partita, vale per entrambe le squadre.
  const TERRAINS = [
    { id: 'lancenigo', name: 'Stone Temple Tao', place: 'Lancenigo · sede principale',
      desc: 'Si gioca in casa: tutte le carte +15 PV e gli eventi in palestra capitano ogni 2 round invece di 3.',
      apply: f => { f.hp += 15; f.maxHp += 15; }, eventEvery: 2 },
    { id: 'priula', name: 'Palestrina delle medie', place: 'Ponte della Priula',
      desc: 'Il regno degli allievi: gli Allievi hanno +10 ATK e +10 DEF.',
      apply: f => { if (f.rank === 'A') { f.baseAtk += 10; f.baseDef += 10; } } },
    { id: 'liming', name: 'Palestra del Maestro Liming Yue', place: 'Inghilterra',
      desc: 'Disciplina inglese: le mosse speciali si ricaricano un turno prima.', cdBonus: 1 },
    { id: 'chenjiagou', name: 'Piazza del Taiji', place: 'Chenjiagou · Cina',
      desc: 'Dove è nato lo stile Chen: Maestri e Leggende hanno +10 ATK e +10 DEF.',
      apply: f => { if (isMaster(f)) { f.baseAtk += 10; f.baseDef += 10; } } },
  ];
  const TERRAIN = {};
  TERRAINS.forEach(t => { TERRAIN[t.id] = t; });

  // ---------------------------------------------------------------- ARMI (stile Chen)
  // Una per squadra, la porta una carta a scelta. atk/def = bonus fissi; gli altri campi valgono per l'attacco base
  // (flat, twice, cleave, stun) o per tutti i colpi (pierceDef).
  const WEAPONS = [
    { id: 'jian', name: 'Spada', cn: 'Jian', desc: '+15 ATK.', atk: 15 },
    { id: 'shuangjian', name: 'Doppia spada', cn: 'Shuang Jian', desc: 'L\'attacco base colpisce due volte, ognuna al 65%.', twice: 0.65 },
    { id: 'dao', name: 'Sciabola', cn: 'Dao', desc: 'L\'attacco base fa +8 danni.', flat: 8 },
    { id: 'shuangdao', name: 'Doppia sciabola', cn: 'Shuang Dao', desc: 'L\'attacco base colpisce anche un secondo avversario a caso, al 50%.', cleave: 0.5 },
    { id: 'qiang', name: 'Lancia', cn: 'Qiang', desc: 'Tutti i suoi colpi ignorano 15 punti di DEF.', pierceDef: 15 },
    { id: 'dadao', name: 'Alabarda', cn: 'Chunqiu Dadao', desc: '+25 ATK ma −10 DEF: pesante da portare.', atk: 25, def: -10 },
    { id: 'qimeigun', name: 'Bastone al sopracciglio', cn: 'Qimei Gun', desc: '+15 DEF e l\'attacco base stordisce per 1 turno nel 20% dei casi.', def: 15, stun: 0.2 },
    { id: 'dagan', name: 'Asta lunga', cn: 'Da Gan', desc: '+25 DEF.', def: 25 },
  ];
  const WEAPON = {};
  WEAPONS.forEach(w => { WEAPON[w.id] = w; });
  const weaponOf = f => WEAPON[f.weapon] || null;

  const CARD = {};
  CARDS.forEach(c => { CARD[c.id] = c; c.moves.forEach((m, i) => { m.ref = { card: c.id, i }; }); });

  const BASIC = { name: 'Attacco', target: 'enemy', cd: 0, basic: true, hit: {}, desc: 'Attacco base: danni = ATK × 50 / (50 + DEF avversaria).' };

  const NEGATIVE = new Set(['stun', 'block', 'confuse', 'dot', 'defZero', 'swap']);
  function isNegative(s) {
    if (NEGATIVE.has(s.type)) return true;
    if ((s.type === 'atkAdd' || s.type === 'defAdd') && s.value < 0) return true;
    if ((s.type === 'atkMul' || s.type === 'defMul') && s.value < 1) return true;
    return false;
  }

  // ---------------------------------------------------------------- HELPERS
  const cardOf = f => CARD[f.form || f.card];
  const nm = f => f.name;
  function log(g, text) { g.log.push(text); ev(g, { type: 'log', text }); }
  function ev(g, e) { if (!g.silent) g.events.push(e); }
  function team(g, p) { return g.players[p].field.filter(f => f.hp > 0); }
  function enemies(g, p) { return team(g, 1 - p); }
  function field(g) { return team(g, 0).concat(team(g, 1)); }
  function allFighters(g) { return g.players[0].field.concat(g.players[0].reserve, g.players[1].field, g.players[1].reserve); }
  function byUid(g, uid) { return allFighters(g).find(f => f.uid === uid) || g.players[0].ko.concat(g.players[1].ko).find(f => f.uid === uid); }
  function has(f, type) { return f.st.some(s => s.type === type); }
  function get(f, type) { return f.st.find(s => s.type === type); }
  function movesOf(f) { return cardOf(f).moves; }

  function statusImmune(f) {
    if (has(f, 'immune')) return true;
    if (f.card === 'adriano' && !f.form && !has(f, 'vibrOff')) return true;
    return false;
  }

  function addStatus(g, f, src, type, dur, value, positive, perm) {
    const s = { type, dur, value: value === undefined ? 0 : value, src: src.owner, at: g.turnNo, perm: !!perm };
    if (!positive && isNegative(s) && statusImmune(f)) {
      log(g, `${nm(f)} è immune agli effetti!`);
      return false;
    }
    if (f.forget && ((type === 'atkMul' && value < 1) || (type === 'atkAdd' && value < 0))) {
      log(g, `${nm(f)} non ricorda nemmeno l'indebolimento.`);
      return false;
    }
    // stessi effetti non si sommano: si rinnova la durata (tranne i bonus permanenti)
    if (!perm) {
      const old = f.st.find(x => x.type === type && !x.perm && Math.sign(x.value - (type.endsWith('Mul') ? 1 : 0)) === Math.sign(s.value - (type.endsWith('Mul') ? 1 : 0)));
      if (old && type !== 'dot') {
        old.dur = Math.max(old.dur, dur); old.at = g.turnNo; old.src = src.owner;
        if (type.endsWith('Mul')) old.value = s.value < 1 ? Math.min(old.value, s.value) : Math.max(old.value, s.value);
        else old.value = Math.abs(s.value) > Math.abs(old.value) ? s.value : old.value;
        return true;
      }
    }
    f.st.push(s);
    return true;
  }

  function stun(g, f, src, dur, word) {
    if (f.hp <= 0) return;
    if (has(f, 'stunGuard')) { log(g, `${nm(f)} resiste allo stordimento.`); return; }
    if (addStatus(g, f, src, 'stun', dur)) {
      log(g, `${word === 'paralizzato' ? 'Paralisi' : 'Stordimento'} su ${nm(f)} per ${dur} turn${dur > 1 ? 'i' : 'o'}!`);
      ev(g, { type: 'status', uid: f.uid, text: word === 'paralizzato' ? 'PARALIZZATO' : 'STORDITO' });
    }
  }
  function confuse(g, f, src, dur, chance) {
    if (f.hp <= 0) return;
    if (addStatus(g, f, src, 'confuse', dur, chance || CONFUSE_CHANCE)) {
      log(g, `Confusione su ${nm(f)} per ${dur} turn${dur > 1 ? 'i' : 'o'}! ❓`);
      ev(g, { type: 'status', uid: f.uid, text: 'CONFUSO' });
    }
  }
  function cleanse(g, f) { f.st = f.st.filter(s => !isNegative(s) || s.perm); }
  function clearAll(f) { f.st = f.st.filter(s => s.perm); }
  function heal(g, f, n) {
    const before = f.hp; f.hp = Math.min(f.maxHp, f.hp + n);
    if (f.hp > before) ev(g, { type: 'heal', uid: f.uid, amount: f.hp - before });
  }

  // Ribaltamento Psicosomatico: con lo stato "swap" ATK e DEF si scambiano
  function effAtk(g, f, w) { return has(f, 'swap') ? Math.max(0, rawDef(g, f, w)) : rawAtk(g, f, w); }
  function effDef(g, f, w) { return has(f, 'swap') ? Math.max(-25, rawAtk(g, f, w)) : rawDef(g, f, w); }

  function rawAtk(g, f, w) {
    w = w === undefined ? 1 : w;
    let add = 0, mul = 1;
    for (const s of f.st) {
      const k = s.perm ? 1 : w;
      if (s.type === 'atkAdd') add += s.value * k;
      if (s.type === 'atkMul') mul *= 1 + (s.value - 1) * k;
    }
    return Math.max(0, (f.baseAtk + add) * mul);
  }
  function rawDef(g, f, w) {
    w = w === undefined ? 1 : w;
    const zero = has(f, 'defZero');
    if (zero && w === 1) return 0;
    let add = 0, mul = 1;
    for (const s of f.st) {
      const k = s.perm ? 1 : w;
      if (s.type === 'defAdd') add += s.value * k;
      if (s.type === 'defMul') mul *= 1 + (s.value - 1) * k;
    }
    let d = f.baseDef + add;
    d = d >= 0 ? d * mul : d; // la difesa negativa non viene moltiplicata
    if (zero) d *= 1 - w;
    return Math.max(-25, d);
  }

  function markFaced(a, b) {
    if (a.owner === b.owner) return;
    if (!a.faced.includes(b.uid)) a.faced.push(b.uid);
    if (!b.faced.includes(a.uid)) b.faced.push(a.uid);
  }

  function damage(g, t, n, src) {
    n = Math.max(1, Math.round(n));
    t.hp -= n;
    ev(g, { type: 'dmg', uid: t.uid, amount: n });
    if (t.hp <= 0) knockOut(g, t, src);
    return n;
  }

  function knockOut(g, t) {
    t.hp = 0;
    const p = g.players[t.owner];
    const i = p.field.indexOf(t);
    if (i < 0) return;
    log(g, `💀 ${nm(t)} è K.O.!`);
    ev(g, { type: 'ko', uid: t.uid });
    p.field.splice(i, 1);
    p.ko.push(t);
    if (p.reserve.length && p.field.length < FIELD_SIZE) {
      const r = p.reserve.shift();
      p.field.splice(i, 0, r);
      log(g, `${nm(r)} entra in campo!`);
      ev(g, { type: 'enter', uid: r.uid });
    }
    checkWin(g);
  }

  function checkWin(g) {
    if (g.winner !== null) return;
    const alive = g.players.map(p => p.field.length + p.reserve.length);
    if (alive[0] === 0 && alive[1] === 0) g.winner = g.turn; // colpo finale simultaneo: vince chi agisce
    else if (alive[0] === 0) g.winner = 1;
    else if (alive[1] === 0) g.winner = 0;
    if (g.winner !== null) log(g, `🏆 ${g.players[g.winner].name} vince la sfida!`);
  }

  // Attacco generico. opts: mul, flat, defMul, ignoreDef, pierce
  function attack(g, u, t, opts) {
    opts = opts || {};
    if (u.hp <= 0 || t.hp <= 0) return 0;
    markFaced(u, t);
    if (u.card === 'adriano' && !u.form) addStatus(g, u, u, 'vibrOff', 1, 0, true);
    if (!opts.pierce) {
      if (has(t, 'invuln')) { log(g, `${nm(t)} è invulnerabile!`); ev(g, { type: 'status', uid: t.uid, text: 'IMMUNE' }); return 0; }
      if (has(t, 'evade')) {
        t.st = t.st.filter(s => s.type !== 'evade');
        log(g, `${nm(t)} schiva il colpo!`); ev(g, { type: 'status', uid: t.uid, text: 'SCHIVATA' }); return 0;
      }
      if (t.card === 'celeste' && !t.form && t.cds[1] === 0) {
        t.cds[1] = 5;
        log(g, `${nm(t)} è una presenza eterea: il colpo la attraversa!`); ev(g, { type: 'status', uid: t.uid, text: 'SCHIVATA' }); return 0;
      }
    }
    let atk = effAtk(g, u) * (opts.mul || 1);
    const nx = get(u, 'nextAtkMul');
    if (nx) { atk *= nx.value; u.st = u.st.filter(s => s !== nx); }
    let ignoreDef = opts.ignoreDef;
    const fe = get(u, 'feint');
    if (fe) { ignoreDef = true; u.st = u.st.filter(s => s !== fe); log(g, `La finta riesce: ${nm(u)} elude la difesa!`); }
    const w = weaponOf(u) || {};
    let def = ignoreDef ? 0 : effDef(g, t) * (opts.defMul || 1) - (w.pierceDef || 0);
    def = Math.max(-25, def);
    let dmg = atk * K / (K + def) * (0.9 + rand(g) * 0.2) + (opts.flat || 0) + (opts.basic && w.flat || 0);
    for (const s of u.st) if (s.type === 'dmgOut') dmg *= s.value;
    for (const s of t.st) if (s.type === 'dmgIn') dmg *= s.value;
    const rf = get(t, 'reflect');
    if (rf && !opts.pierce) {
      log(g, `☯️ ${nm(t)} restituisce il colpo con il doppio della forza!`);
      ev(g, { type: 'status', uid: t.uid, text: 'RESPINTO' });
      const back = damage(g, u, dmg * rf.value, t);
      log(g, `${nm(u)} subisce il suo stesso colpo: −${back} PV`);
      return 0;
    }
    const dealt = damage(g, t, dmg, u);
    log(g, `${nm(u)} colpisce ${nm(t)}: −${dealt} PV`);
    if (opts.basic && w.stun && t.hp > 0 && rand(g) < w.stun) stun(g, t, u, 1);
    const c = get(t, 'counter');
    if (c && !opts.pierce && u.hp > 0) {
      t.st = t.st.filter(s => s !== c);
      const steal = Math.min(40, Math.round(u.hp * c.value));
      if (steal > 0) {
        log(g, `🎲 Contrattacco! ${nm(t)} ruba ${steal} PV a ${nm(u)}!`);
        damage(g, u, steal, t);
        if (t.hp > 0) heal(g, t, steal);
      }
    }
    return dealt;
  }

  // la carta si colpisce da sola con il proprio attacco (confusione, canto)
  function selfHit(g, f, mul) {
    const dmg = effAtk(g, f) * mul * K / (K + Math.max(-25, effDef(g, f))) * (0.9 + rand(g) * 0.2);
    const n = damage(g, f, dmg, f);
    log(g, `${nm(f)} si colpisce per sbaglio: −${n} PV`);
  }

  // ---------------------------------------------------------------- CREAZIONE PARTITA
  let uidSeq = 1;
  function makeFighter(cardId, owner) {
    const c = CARD[cardId];
    return {
      uid: 'f' + (uidSeq++) + '_' + owner, card: cardId, name: c.name, owner,
      hp: c.hp, maxHp: c.hp, baseAtk: c.atk, baseDef: c.def, rank: c.rank,
      st: [], cds: [0, 0], used: {}, faced: [], form: null, forget: false, acted: false,
    };
  }

  function createGame(opts) {
    const g = {
      seed: (opts.seed === undefined ? Math.floor(Math.random() * 2 ** 31) : opts.seed) | 0,
      players: [0, 1].map(i => {
        const p = opts.players[i];
        const fs = p.cards.map(id => makeFighter(id, i));
        const syn = opts.synergies === false ? [] : synergiesFor(p.cards);
        fs.forEach(f => syn.forEach(x => x.apply(f)));
        const ter = TERRAIN[opts.terrain];
        if (ter && ter.apply) fs.forEach(ter.apply);
        const wp = p.weapon && WEAPON[p.weapon.id];
        const armed = wp && fs.find(f => f.card === p.weapon.card);
        if (armed) { armed.weapon = wp.id; armed.baseAtk += wp.atk || 0; armed.baseDef += wp.def || 0; }
        if (p.boost) fs.forEach(f => { f.hp = f.maxHp = Math.round(f.maxHp * p.boost); f.baseAtk = Math.round(f.baseAtk * (1 + (p.boost - 1) / 2)); });
        return { name: p.name, cpu: p.cpu || null, field: fs.slice(0, FIELD_SIZE), reserve: fs.slice(FIELD_SIZE), ko: [], cards: p.cards.slice(), syn: syn.map(x => x.id) };
      }),
      gymEvents: opts.gymEvents !== false,
      terrain: TERRAIN[opts.terrain] ? opts.terrain : null,
      turn: opts.first === undefined ? 0 : opts.first,
      turnNo: 1, actions: 0, winner: null, log: [], events: [], lastSpecial: null, silent: !!opts.silent, passes: 0,
    };
    startTurn(g);
    return g;
  }

  function startTurn(g) {
    if (g.winner !== null) return;
    const p = g.players[g.turn];
    g.actions = 0;
    for (const f of p.field.concat(p.reserve)) f.acted = false;
    ev(g, { type: 'turn', player: g.turn });
    // gli eventi si alternano: uno scatta nel turno di chi gioca per secondo, il successivo in quello di chi inizia
    if (g.gymEvents) {
      const every = (TERRAIN[g.terrain] && TERRAIN[g.terrain].eventEvery) || EVENT_EVERY;
      const round = Math.ceil(g.turnNo / 2), secondHalf = g.turnNo % 2 === 0;
      if (round % every === 0 && ((round / every) % 2 === 1) === secondHalf) gymEvent(g);
    }
    // danni nel tempo (bruciore, dolori)
    for (const f of team(g, g.turn).slice()) {
      for (const s of f.st.filter(x => x.type === 'dot')) {
        if (f.hp <= 0) break;
        const n = damage(g, f, s.value, null);
        log(g, `${nm(f)} soffre: −${n} PV`);
      }
    }
    if (g.winner !== null) return;
    // se nessuno può agire il turno passa
    if (!canAct(g)) {
      g.passes++;
      if (g.passes > 8) {
        // stallo: vince chi ha più PV totali
        const hp = g.players.map(pl => pl.field.concat(pl.reserve).reduce((s, f) => s + f.hp, 0));
        g.winner = hp[0] >= hp[1] ? 0 : 1;
        log(g, `Stallo! ${g.players[g.winner].name} vince ai punti.`);
        return;
      }
      log(g, `${p.name}: nessuna carta può agire, turno saltato.`);
      endTurn(g);
    } else g.passes = 0;
  }

  function endTurn(g) {
    if (g.winner !== null) return;
    const me = g.turn;
    // durate degli effetti: scalano a fine turno di chi li ha applicati (non nel turno di applicazione)
    for (const f of allFighters(g)) {
      const next = [];
      for (const s of f.st) {
        if (s.src === me && s.at !== g.turnNo && !s.perm) s.dur--;
        if (s.dur > 0 || s.perm) next.push(s);
        else if (s.type === 'stun') next.push({ type: 'stunGuard', dur: 1, value: 0, src: me, at: g.turnNo, perm: false });
      }
      f.st = next;
    }
    // ricariche delle mosse: scalano a fine turno del proprietario
    for (const f of g.players[me].field.concat(g.players[me].reserve)) f.cds = f.cds.map(c => Math.max(0, c - 1));
    g.turn = 1 - me;
    g.turnNo++;
    startTurn(g);
  }

  // ---------------------------------------------------------------- AZIONI
  function isStunned(f) { return has(f, 'stun'); }

  // può ancora fare un'azione "vera" (non gratuita) in questo turno?
  function canAct(g) {
    if (g.turnNo === 1 && g.actions >= FIRST_TURN_ACTIONS) return false;
    return team(g, g.turn).some(f => actorOptions(g, f).some(o => o.ok && !o.move.free));
  }

  // Elenco mosse di una carta con disponibilità e motivo.
  function actorOptions(g, f) {
    const out = [];
    const stunned = isStunned(f);
    const blocked = has(f, 'block');
    const done = f.acted || (g.turnNo === 1 && g.actions >= FIRST_TURN_ACTIONS);
    const basicTargets = targetsFor(g, f, BASIC);
    out.push({ i: -1, move: BASIC, ok: !done && !stunned && basicTargets.length > 0,
      why: done ? 'Ha già agito' : stunned ? 'Stordimento' : (basicTargets.length ? '' : 'Nessun bersaglio') });
    movesOf(f).forEach((m, i) => {
      let ok = true, why = '';
      if (m.passive) { ok = false; why = 'Passiva'; }
      else if (done && !m.free) { ok = false; why = 'Ha già agito'; }
      else if (g.turnNo === 1) { ok = false; why = 'Primo turno: solo attacchi'; }
      else if (stunned && !m.whileStunned) { ok = false; why = 'Stordimento'; }
      else if (blocked) { ok = false; why = 'Tecniche bloccate'; }
      else if (m.once && f.used[i]) { ok = false; why = 'Già usata'; }
      else if (m.maxUses && (f.used[i] || 0) >= m.maxUses) { ok = false; why = 'Già al massimo'; }
      else if (f.cds[i] > 0) { ok = false; why = `Ricarica: ${f.cds[i]}`; }
      else if (m.needsReserve && !g.players[f.owner].reserve.length) { ok = false; why = 'Nessuna riserva'; }
      else if (m.target === 'bottle' && !usableInner(g, f, bottleMove(g))) { ok = false; why = 'Nessuna mossa da catturare'; }
      else if (m.target === 'copy' && !copyOptions(g, f).length) { ok = false; why = 'Niente da copiare'; }
      else if (needsTarget(m) && !targetsFor(g, f, m).length) { ok = false; why = 'Nessun bersaglio'; }
      out.push({ i, move: m, ok, why });
    });
    return out;
  }

  function usableInner(g, f, im) {
    if (!im) return false;
    if (im.needsReserve && !g.players[f.owner].reserve.length) return false;
    if (needsTarget(im) && !targetsFor(g, f, im).length) return false;
    return true;
  }

  function needsTarget(m) { return ['enemy', 'ally', 'any', 'anyOther', 'unfaced', 'enemyWeak'].includes(m.target); }

  function targetsFor(g, u, m) {
    const pierce = m.pierce;
    const visible = f => pierce || !has(f, 'hidden');
    switch (m.target) {
      case 'enemy': return enemies(g, u.owner).filter(visible);
      case 'enemyWeak': return enemies(g, u.owner).filter(visible).filter(f => f.rank !== 'L' && f.hp <= f.maxHp / 2);
      case 'unfaced': return enemies(g, u.owner).filter(visible).filter(f => !u.faced.includes(f.uid));
      case 'ally': return team(g, u.owner).filter(f => !(m.notRank && m.notRank.includes(f.rank)));
      case 'any': return field(g).filter(f => f.owner === u.owner || visible(f));
      case 'anyOther': return field(g).filter(f => f !== u && (f.owner === u.owner || visible(f)));
      default: return [];
    }
  }

  function refMove(ref) { return CARD[ref.card].moves[ref.i]; }

  function copyOptions(g, u) {
    const out = [];
    for (const e of enemies(g, u.owner)) {
      const c = cardOf(e);
      c.moves.forEach((m, i) => {
        if (m.passive || m.nocopy || !usableInner(g, u, m)) return;
        const key = c.id + ':' + i;
        if (!out.some(o => o.key === key)) out.push({ key, ref: { card: c.id, i }, from: e.name, move: m });
      });
    }
    return out;
  }
  function bottleMove(g) { return g.lastSpecial ? refMove(g.lastSpecial) : null; }

  // Tutte le azioni legali (per IA e controlli)
  function legalActions(g) {
    const acts = [];
    if (g.winner !== null) return acts;
    for (const f of team(g, g.turn)) {
      for (const o of actorOptions(g, f)) {
        if (!o.ok) continue;
        const m = o.move;
        if (m.target === 'copy' || m.target === 'bottle') {
          const inner = m.target === 'copy' ? copyOptions(g, f).map(x => x.ref) : [g.lastSpecial];
          for (const ref of inner) {
            const im = refMove(ref);
            if (!usableInner(g, f, im)) continue;
            if (needsTarget(im)) for (const t of targetsFor(g, f, im)) acts.push({ actor: f.uid, move: o.i, pick: ref, target: t.uid });
            else acts.push({ actor: f.uid, move: o.i, pick: ref, target: null });
          }
        } else if (needsTarget(m)) {
          for (const t of targetsFor(g, f, m)) acts.push({ actor: f.uid, move: o.i, target: t.uid });
        } else acts.push({ actor: f.uid, move: o.i, target: null });
      }
    }
    return acts;
  }

  function doAction(g, a) {
    if (g.winner !== null) return false;
    const u = byUid(g, a.actor);
    if (!u || u.owner !== g.turn || u.hp <= 0) return false;
    const opt = actorOptions(g, u).find(o => o.i === a.move);
    if (!opt || !opt.ok) return false;
    const m = opt.move;
    const t = a.target ? byUid(g, a.target) : null;
    ev(g, { type: 'act', uid: u.uid, move: m.name, target: t ? t.uid : null });

    // mossa effettivamente eseguita (copia / bottiglia)
    let exec = m, label = m.name;
    if (m.target === 'copy' || m.target === 'bottle') {
      exec = refMove(a.pick);
      label = `${m.name} → ${exec.name}`;
    }
    if (!m.basic) log(g, `✨ ${nm(u)} usa ${label}!`);

    // confusione: può colpirsi da solo invece di agire (solo azioni offensive)
    const offensive = ['enemy', 'enemies', 'unfaced', 'enemyWeak'].includes(exec.target) || exec.basic || exec.offensive;
    const conf = get(u, 'confuse');
    if (conf && offensive && !m.free && rand(g) < conf.value) {
      log(g, `❓ Confusione: ${nm(u)} perde il controllo...`);
      selfHit(g, u, 0.5);
      ev(g, { type: 'status', uid: u.uid, text: 'CONFUSO' });
    } else if (m.basic) {
      const w = weaponOf(u) || {};
      attack(g, u, t, { basic: true, mul: w.twice || 1 });
      if (w.twice && t.hp > 0 && u.hp > 0) attack(g, u, t, { basic: true, mul: w.twice });
      if (w.cleave && u.hp > 0) {
        const o = enemies(g, u.owner).filter(f => f !== t && !has(f, 'hidden'));
        if (o.length) attack(g, u, o[Math.floor(rand(g) * o.length)], { basic: true, mul: w.cleave });
      }
    } else {
      exec.use(g, u, t, a);
      // la bottiglia di Carla cattura l'ultima mossa speciale usata
      if (!exec.nocopy) g.lastSpecial = { card: exec.ref.card, i: exec.ref.i };
    }
    if (!m.basic) {
      if (m.once || m.maxUses) u.used[a.move] = (u.used[a.move] || 0) + 1;
      if (m.cd) u.cds[a.move] = m.cd + 1 - ((TERRAIN[g.terrain] || {}).cdBonus || 0);
    }
    if (!m.free) { u.acted = true; g.actions++; }
    checkWin(g);
    if (g.winner === null && !canAct(g)) endTurn(g);
    return true;
  }

  // il giocatore chiude il turno anche se qualche carta non ha agito
  function passTurn(g) { if (g.winner === null) endTurn(g); }

  // ---------------------------------------------------------------- INTELLIGENZA ARTIFICIALE
  // L'IA prova ogni azione possibile e simula il seguito della partita (fine del suo turno,
  // turno avversario, suo turno successivo) con attacchi base "intelligenti", poi valuta.
  function clone(g) { const c = JSON.parse(JSON.stringify(g)); c.silent = true; c.events = []; c.log = []; return c; }

  function expectedHit(g, u, t) {
    if (has(t, 'invuln') || has(t, 'evade') || has(t, 'hidden') || has(t, 'reflect')) return 0;
    if (t.card === 'celeste' && !t.form && t.cds[1] === 0) return 0;
    const w = weaponOf(u) || {};
    let atk = effAtk(g, u) * (w.twice ? 2 * w.twice : 1);
    const nx = get(u, 'nextAtkMul'); if (nx) atk *= nx.value;
    const def = has(u, 'feint') ? 0 : Math.max(-25, effDef(g, t) - (w.pierceDef || 0));
    let d = atk * K / (K + def) + (w.flat || 0);
    for (const s of u.st) if (s.type === 'dmgOut') d *= s.value;
    for (const s of t.st) if (s.type === 'dmgIn') d *= s.value;
    return d;
  }

  // Anteprima dei danni di una mossa su un bersaglio: [minimo, massimo] oppure null se la mossa non colpisce direttamente.
  function previewDamage(g, u, m, t) {
    if (!m || !m.hit) return null;
    const h = m.hit;
    const blocked = !m.pierce && (has(t, 'invuln') || has(t, 'evade') || has(t, 'reflect') || (t.card === 'celeste' && !t.form && t.cds[1] === 0));
    if (blocked) return [0, 0];
    const w = weaponOf(u) || {};
    const hits = m.basic && w.twice ? 2 : 1;
    let atk = effAtk(g, u) * (h.mul || 1) * (hits === 2 ? w.twice : 1);
    const nx = get(u, 'nextAtkMul'); if (nx) atk *= nx.value;
    const ignore = h.ignoreDef || has(u, 'feint');
    const def = ignore ? 0 : Math.max(-25, effDef(g, t) * (h.defMul || 1) - (w.pierceDef || 0));
    const flat = (h.flat || 0) + (m.basic && w.flat || 0);
    let base = atk * K / (K + def), k = 1;
    for (const s of u.st) if (s.type === 'dmgOut') k *= s.value;
    for (const s of t.st) if (s.type === 'dmgIn') k *= s.value;
    const lo = Math.max(1, Math.round((base * 0.9 + flat) * k)) * hits;
    const hi = Math.max(1, Math.round((base * 1.1 + flat) * k)) * hits;
    return [lo, hi];
  }

  function rolloutStep(c) {
    let best = null, bestS = -Infinity;
    for (const u of team(c, c.turn)) {
      const o = actorOptions(c, u)[0];
      if (!o.ok) continue;
      for (const t of targetsFor(c, u, BASIC)) {
        const d = expectedHit(c, u, t);
        let sc = Math.min(d, t.hp) + (d >= t.hp ? 60 : 0);
        const ct = get(t, 'counter'); if (ct) sc -= u.hp * ct.value * 1.2;
        if (has(t, 'reflect')) sc -= 150;
        if (sc > bestS) { bestS = sc; best = { actor: u.uid, move: -1, target: t.uid }; }
      }
    }
    if (best) doAction(c, best); else endTurn(c);
  }

  function staticEval(g, me) {
    if (g.winner !== null) return g.winner === me ? 1e5 : -1e5;
    let v = 0;
    for (let p = 0; p < 2; p++) {
      const sign = p === me ? 1 : -1;
      const pl = g.players[p];
      for (const f of pl.field.concat(pl.reserve)) {
        if (f.hp <= 0) continue;
        v += sign * (f.hp + 35 + effAtk(g, f, 0.3) * 0.5 + Math.max(0, effDef(g, f, 0.3)) * 0.3);
        for (const s of f.st) {
          if (s.type === 'dot') v -= sign * s.value * Math.min(s.dur, 3);
          if (s.type === 'stun') v -= sign * 12;
          if (s.type === 'confuse') v -= sign * 8;
        }
      }
    }
    return v;
  }

  function rollout(g, a, me, horizon) {
    const c = clone(g);
    c.seed = (Math.random() * 2 ** 31) | 0;
    if (a.formula === undefined) a = Object.assign({}, a, { formula: rand(c) < 0.6 });
    doAction(c, a);
    const stop = g.turnNo + horizon;
    let guard = 0;
    while (c.winner === null && c.turnNo <= stop && guard++ < 60) rolloutStep(c);
    return staticEval(c, me);
  }

  // livello: 'facile' | 'normale' | 'difficile'
  function chooseAction(g, level) {
    const me = g.turn;
    const acts = legalActions(g);
    if (!acts.length) return null;
    level = level || 'normale';
    if (level === 'facile' && Math.random() < 0.3) return acts[Math.floor(Math.random() * acts.length)];
    const samples = level === 'difficile' ? 5 : level === 'normale' ? 2 : 1;
    const horizon = level === 'facile' ? 1 : 2;
    let best = null, bestV = -Infinity;
    for (const a of acts) {
      let v = 0;
      for (let s = 0; s < samples; s++) v += rollout(g, a, me, horizon);
      v /= samples;
      v += (Math.random() - 0.5) * (level === 'facile' ? 60 : 2);
      if (v > bestV) { bestV = v; best = a; }
    }
    if (best && best.formula === undefined) best = Object.assign({}, best, { formula: Math.random() < (level === 'facile' ? 0.3 : 0.6) });
    return best;
  }

  // ---------------------------------------------------------------- SQUADRE
  function teamCost(ids) { return ids.reduce((s, id) => s + CARD[id].cost, 0); }

  // pool: elenco facoltativo di carte tra cui scegliere (per esempio solo quelle sbloccate)
  function randomTeam(rng, minCost, only) {
    rng = rng || Math.random;
    minCost = minCost === undefined ? BUDGET - 1 : minCost;
    for (let tries = 0; tries < 5000; tries++) {
      const pool = (only || CARDS.map(c => c.id)).slice();
      if (pool.length < TEAM_SIZE) return null;
      const pick = [];
      while (pick.length < TEAM_SIZE) {
        const i = Math.floor(rng() * pool.length);
        pick.push(pool.splice(i, 1)[0]);
      }
      const cost = teamCost(pick);
      if (cost <= BUDGET && cost >= minCost) return pick;
    }
    return minCost > 0 ? randomTeam(rng, minCost - 1, only) : null;
  }

  // ---------------------------------------------------------------- CARTE AGGIUNTE DA FUORI (pacchetto segreto)
  // Le funzioni del motore che le mosse delle carte aggiunte possono usare.
  const H = {
    rand, log, ev, nm, team, enemies, field, attack, damage, heal, stun, confuse, cleanse, clearAll,
    addStatus, selfHit, has, get, effAtk, effDef, isMaster, CONFUSE_CHANCE,
  };
  function addCards(list) {
    for (const c of list) {
      if (CARD[c.id]) continue;
      c.secret = true;
      CARDS.push(c); CARD[c.id] = c;
      c.moves.forEach((m, i) => { m.ref = { card: c.id, i }; });
    }
  }
  // immagini: di norma in img/, quelle del pacchetto segreto arrivano già pronte in memoria
  const IMG = {};
  const img = p => IMG[p] || 'img/' + p;

  const api = {
    K, TEAM_SIZE, FIELD_SIZE, BUDGET, RANKS, CARDS, CARD, BASIC,
    createGame, legalActions, doAction, chooseAction, actorOptions, targetsFor, copyOptions, bottleMove, refMove,
    needsTarget, effAtk, effDef, team, enemies, field, byUid, cardOf, movesOf, isStunned, isNegative,
    teamCost, randomTeam, clone, canAct, passTurn, expectedHit,
    SYNERGIES, synergiesFor, GYM_EVENTS, EVENT_EVERY, previewDamage, isMaster,
    TERRAINS, TERRAIN, WEAPONS, WEAPON, H, addCards, IMG, img,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.STT = api;
})(typeof window !== 'undefined' ? window : globalThis);
