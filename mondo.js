/* STONE TEMPLE TAO — il mondo della Modalità Storia: mappe, personaggi, palestre, grotte e trama.
 * Mappe a caselle, una lettera per casella:
 *   .  erba            ,  erba alta (spiriti!)   :  sentiero        =  lastricato     *  fiori
 *   ~  acqua           b  ponte                  T  albero          K  pruno in fiore Y  bambù
 *   f  staccionata     v  sporgenza (si salta giù) r  roccia         M  parete di roccia O  ingresso di grotta
 *   #  parete di grotta c  pavimento di grotta    o  masso
 *   W  muro interno    w  parquet                m  tatami          R  tappeto        e  zerbino (uscita)
 *   x  scaffale        q  tavolo                 p  pianta          l/j letto (testa/piedi) k bancone
 *   g  pavimento del tempio  G  muro del tempio  L  lanterna di pietra  i  lampione   U  cabina telefonica
 * Gli edifici (bld) si appoggiano sopra le caselle: la porta è la casella in basso alla colonna "door".
 * Gli script (talk, run, onWin…) ricevono W, l'API di storia.js: say, ask, gain, challenge, shop, fly, trade…
 */
(function () {
  'use strict';
  const RIVAL = 'Tommaso';
  const STARTERS = ['grazia', 'alessandro', 'annastella'];
  const rivalCard = s => STARTERS[(STARTERS.indexOf(s.flags.starter) + 1) % 3] || 'grazia';
  const nameOf = id => (window.STT.CARD[id] || {}).name || id;
  const RIV = { name: RIVAL };

  // aspetto dei personaggi: h capelli · s pelle · c giacca · d dettagli · b cintura · p pantaloni · style short/long/bun
  const LOOKS = {
    player0: { h: '#3a2a22', s: '#f2c8a0', c: '#e8631c', p: '#2a3448', b: '#f0f0ea', style: 'short' },
    rival: { h: '#d8b060', c: '#3a6ad8', p: '#222228', b: '#26202c', style: 'short' },
    mamma: { h: '#6a3a22', c: '#e88aa8', p: '#5a5a7a', style: 'long' },
    samuele: { h: '#2a2020', c: '#222228', d: '#f0f0ea', b: '#f0f0ea', p: '#222228', style: 'short' },
    federica: { h: '#3a2018', c: '#e8c040', d: '#ffffff', p: '#2a3448', style: 'long' },
    signorello: { h: '#5a3020', c: '#6a3a8a', d: '#c8a0f0', p: '#222228', style: 'short' },
    liming: { h: '#2a2020', c: '#f0f0ea', d: '#c8322a', b: '#c8322a', p: '#222228', style: 'bun' },
    chen: { h: '#2a2020', c: '#c8322a', d: '#e0b040', b: '#e0b040', p: '#222228', style: 'short' },
    wangting: { h: '#e8e4dc', c: '#e0b040', d: '#c8322a', b: '#c8322a', p: '#5a2a1a', style: 'bun' },
    zhenglei: { h: '#9a9aa0', c: '#f0f0ea', d: '#3a3a40', b: '#3a3a40', p: '#222228', style: 'bun' },
    katya: { h: '#e0c070', c: '#222228', d: '#f0f0ea', b: '#f0f0ea', p: '#222228', style: 'long' },
    niccolo: { h: '#4a3020', c: '#222228', d: '#f0f0ea', b: '#f0f0ea', p: '#222228', style: 'short' },
    allievo: { h: '#3a2a22', c: '#f0f0ea', d: '#c8c8c0', b: '#e8c040', p: '#f0f0ea', style: 'short' },
    allieva: { h: '#8a5a2a', c: '#f0f0ea', d: '#c8c8c0', b: '#e8631c', p: '#f0f0ea', style: 'long' },
    monaco: { h: '#26202c', c: '#e8a030', d: '#c8322a', b: '#c8322a', p: '#e8a030', style: 'bun' },
    gente: { h: '#5a3020', c: '#55b98a', p: '#2a3448', style: 'short' },
    gente2: { h: '#2a2020', c: '#a978e0', p: '#3a3a48', style: 'long' },
    vecchio: { h: '#d8d8d0', c: '#8a6a4a', p: '#4a4a4a', style: 'short' },
    nonna: { h: '#e0e0e8', c: '#7a5aa0', p: '#4a4a5a', style: 'bun' },
    bimbo: { h: '#d8b060', c: '#d8412f', p: '#3a6ad8', style: 'short' },
    commessa: { h: '#3a2018', c: '#3a6ad8', d: '#f0f0ea', p: '#2a3448', style: 'long' },
    pilota: { h: '#2a2020', c: '#2a3a5a', d: '#e0b040', p: '#2a3a5a', style: 'short' },
    inglese: { h: '#c8482a', c: '#5a6a7a', p: '#3a3a48', style: 'short' },
    inglese2: { h: '#e0c070', c: '#8a2a4a', p: '#3a3a48', style: 'long' },
    speleo: { h: '#5a3020', c: '#c8a040', d: '#e8631c', p: '#5a4a3a', style: 'short' },
    guardia: { h: '#2a2020', c: '#3a4a6a', p: '#2a2a3a', style: 'short' },
    pescatore: { h: '#8a8a8a', c: '#3aa060', p: '#5a4a3a', style: 'short' },
  };

  const BADGES = [
    { name: 'Sigillo dell\'Allievo', where: 'Federica · Ponte della Priula', c: '#55b98a' },
    { name: 'Sigillo della Disciplina', where: 'Liming Yue · Inghilterra', c: '#6fb3e6' },
    { name: 'Sigillo della Tradizione', where: 'Chen Delang · Chenjiagou', c: '#d8412f' },
    { name: 'Sigillo del Tempio', where: 'Samuele · Lancenigo', c: '#d4ae62' },
  ];

  // le bustine danno carte più forti man mano che si va avanti
  const packLv = s => 1 + 2 * s.badges.length;
  const ITEMS = {
    pergamena: { name: 'Pergamena', price: 100, scrolls: 1, desc: 'Serve per reclutare uno spirito sconfitto.' },
    pergamene5: { name: 'Pacco da 5 pergamene', price: 450, scrolls: 5, desc: 'Cinque pergamene a un prezzo migliore.' },
    bustinaA: { name: 'Bustina Allievi', price: 300, pool: 'A', lv: packLv, desc: 'Una carta Allievo a caso.' },
    bustinaI: { name: 'Bustina Istruttori', price: 800, pool: 'I', lv: packLv, desc: 'Una carta Istruttore a caso.' },
    bustinaM: { name: 'Bustina Maestri', price: 1600, pool: 'M', lv: packLv, desc: 'Una carta Maestro a caso.' },
  };

  const FLY = [
    { map: 'lancenigo', x: 11, y: 9, name: 'Lancenigo', desc: 'Casa, dolce casa: la Stone Temple Tao.', lock: '' },
    { map: 'treviso', x: 19, y: 6, name: 'Treviso', desc: 'L\'Aeroporto Canova.', lock: 'Prima ci devi arrivare a piedi.', need: s => !!s.flags['visto:treviso'] },
    { map: 'inghilterra', x: 12, y: 15, name: 'Inghilterra', desc: 'La palestra del Maestro Liming Yue.', lock: 'Serve il Sigillo dell\'Allievo.', need: s => s.badges.length >= 1 },
    { map: 'chenjiagou', x: 12, y: 20, name: 'Chenjiagou (Cina)', desc: 'Il villaggio dove è nato lo stile Chen.', lock: 'Serve il Sigillo della Disciplina.', need: s => s.badges.length >= 2 },
  ];

  // cosa si legge esaminando le caselle
  const LOOK_AT = {
    x: 'Libri di Taijiquan, manuali di Qigong e... un fumetto di Dragon Ball nascosto dietro.',
    U: 'Una cabina telefonica rossa. Squilla! È il Maestro Samuele: «Ricordati di bere acqua!»',
    L: 'Una lanterna di pietra. Dentro brilla una piccola fiamma.',
    p: 'Una pianta ben curata. Qualcuno le parla tutti i giorni.',
    l: 'Il tuo letto. Comodissimo, ma il viaggio ti aspetta.',
    i: 'Un lampione inglese. Resta acceso anche di giorno, non si sa mai.',
    q: 'Sul tavolo c\'è una tazza di tè ancora calda.',
  };

  const INTRO = [
    'Ciao! Benvenuto nel mondo di Stone Temple Cards Game!',
    'Mi chiamo Samuele e insegno Taijiquan stile Chen alla Stone Temple Tao di Lancenigo.',
    'Da qualche tempo le carte della palestra hanno preso vita: i loro spiriti si nascondono nell\'erba alta, nelle grotte e perfino all\'estero.',
    'Chi li sconfigge in una sfida può reclutarli con una pergamena e combattere al loro fianco.',
    'Ma prima dimmi qualcosa di te.',
  ];
  const INTRO_END = ['Perfetto, {n}! Il tuo viaggio sta per cominciare.', 'Quando sei pronto vieni in palestra: è il grande edificio con il tetto arancione. Ti aspetto!'];

  // il prossimo passo del viaggio, detto dal Maestro
  const hint = s => {
    const b = i => s.badges.includes(i);
    if (!b(0)) return 'La prima palestra è a Ponte della Priula, a nord, oltre il Percorso 1. Federica ti aspetta!';
    if (!b(1)) return 'Il Maestro Liming Yue ha una palestra in Inghilterra. Dalla Priula passa per la Grotta del Montello e il Percorso 2: a Treviso c\'è l\'aeroporto.';
    if (!b(2)) return 'In Cina, nella Piazza del Taiji di Chenjiagou, Chen Delang custodisce il Sigillo della Tradizione. Si vola da Treviso.';
    if (!s.flags['tr:tempio:wangting']) return 'Con tre sigilli il Tempio Ancestrale di Chenjiagou ti aspetta: là vivono le Leggende.';
    return null;
  };

  // ------------------------------------------------------------ le mappe
  const maps = {};

  maps.casa_mia = {
    name: 'Casa', inside: true, entry: [3, 6],
    tiles: [
      'WWWWWWWW',
      'WWWWWWWW',
      'xxwwwwlp',
      'wwwwwwjw',
      'wwwqqwww',
      'wwwRRwww',
      'pwwwwwww',
      'wwwewwww',
    ],
    exits: [{ x: 3, y: 7, to: 'lancenigo', tx: 5, ty: 14 }],
    npc: [
      { id: 'mamma', x: 2, y: 4, dir: 'right', look: 'mamma', name: 'Mamma',
        talk: async (W, who) => {
          if (!W.flag('starter')) return W.say(['Buongiorno, {n}! Il Maestro Samuele è passato a cercarti.', 'Ti aspetta alla Stone Temple Tao: esci di casa, è il grande edificio con il tetto arancione.'], who);
          if (!W.flag('mamma')) {
            W.set('mamma');
            await W.say(['Allora parti davvero! Sono così fiera di te.', 'Tieni, per il viaggio: comprati qualche pergamena in bottega.'], who);
            W.money(300); W.sfx('item');
            return W.say('Hai ricevuto 300 monete!');
          }
          return W.say(['Mangia, bevi acqua e saluta il Maestro da parte mia!', 'E ricordati: se perdi una sfida, torni nell\'ultima città dove sei stato.'], who);
        } },
    ],
  };

  maps.casa = {
    name: 'Casa', inside: true, entry: [3, 5],
    tiles: [
      'WWWWWWWW',
      'WWWWWWWW',
      'xxwwwwpw',
      'wwwwwwww',
      'wwqqwwww',
      'wwwwwwww',
      'wwwewwww',
    ],
    exits: [{ x: 3, y: 6, to: '@back' }],
    npc: [
      { id: 'nonna', where: 'lancenigo', x: 5, y: 3, look: 'nonna', name: 'Nonna Pina',
        talk: async (W, who) => {
          if (!W.flag('starter')) return W.say('Oh, {n}! Oggi è il gran giorno, vero? Corri dal Maestro!', who);
          if (!W.flag('nonna')) {
            W.set('nonna');
            await W.say('Ho trovato queste in soffitta. Pergamene! Ai miei tempi ci si scriveva la lista della spesa.', who);
            W.scrolls(3); W.sfx('item');
            return W.say('Hai ricevuto 3 pergamene!');
          }
          return W.say('Ai miei tempi il Taiji si faceva al parco alle sei del mattino. Con la nebbia!', who);
        } },
      { id: 'tifoso', where: 'priula-a', x: 5, y: 3, look: 'bimbo', name: 'Luca',
        say: ['Da grande voglio essere come Federica! Una volta ha evocato dei bambini non-morti.', 'Credo fosse una battuta. Credo.'] },
      { id: 'scambio1', where: 'priula', x: 5, y: 3, look: 'gente2', name: 'Giada',
        talk: async (W, who) => {
          if (W.flag('scambio1')) return W.say('Christian sta benissimo con te, si vede. Caterina invece ha già riorganizzato la mia cucina.', who);
          if (await W.trade('christian', 'caterina', 4, who)) W.set('scambio1');
        } },
      { id: 'scambio2', where: 'treviso-a', x: 5, y: 3, look: 'inglese', name: 'Marco',
        talk: async (W, who) => {
          if (W.flag('scambio2')) return W.say('Remigio ha già fatto tre giri del quartiere di corsa. Che energia!', who);
          if (await W.trade('niccolo', 'remigio', 6, who)) W.set('scambio2');
        } },
      { id: 'studente', where: 'treviso', x: 5, y: 3, look: 'gente', name: 'Studente',
        talk: async (W, who) => {
          if (!W.flag('studente')) {
            W.set('studente');
            await W.say(['Sto studiando le carte per la tesi. Lo sapevi che ogni livello dà il 4% in più di PV, ATK e DEF?', 'Tieni, è per la tua ricerca sul campo.'], who);
            W.money(500); W.sfx('item');
            return W.say('Hai ricevuto 500 monete!');
          }
          return W.say('Dal menu, in Carte, puoi potenziare una carta usando una copia doppia: sale subito di livello.', who);
        } },
      { id: 'scambio3', where: 'ing-a', x: 5, y: 3, look: 'inglese2', name: 'Lady Margaret',
        talk: async (W, who) => {
          if (W.flag('scambio3')) return W.say('Grazia è adorabile. Il suo peluche ha già conquistato il mio gatto.', who);
          if (await W.trade('strahinja', 'grazia', 8, who)) W.set('scambio3');
        } },
      { id: 'te', where: 'ing-b', x: 5, y: 3, look: 'nonna', name: 'Mrs. Brown',
        talk: async (W, who) => {
          if (!W.flag('te')) {
            W.set('te');
            await W.say(['Tea time! Siediti, caro.', 'Queste pergamene me le ha lasciate un viaggiatore italiano. A me non servono: prendile tu.'], who);
            W.scrolls(5); W.sfx('item');
            return W.say('Hai ricevuto 5 pergamene!');
          }
          return W.say('Anche il Tè del Maestro, nelle sfide, toglie gli effetti negativi. Il tè risolve tutto.', who);
        } },
      { id: 'inglese3', where: 'ing', x: 5, y: 3, look: 'inglese', name: 'Mr. Smith',
        say: ['Il Maestro Liming Yue allena qui da anni. Le sue mosse speciali si ricaricano più in fretta: è la disciplina inglese!'] },
      { id: 'scambio4', where: 'cina-a', x: 5, y: 3, look: 'monaco', name: 'Wei',
        talk: async (W, who) => {
          if (W.flag('scambio4')) return W.say('Lorenzo si allena con noi ogni mattina. Si arrabbia tanto, ma è un bravo ragazzo.', who);
          if (await W.trade('katya', 'lorenzo', 9, who)) W.set('scambio4');
        } },
      { id: 'anziano', where: 'cina', x: 5, y: 3, look: 'vecchio', name: 'Maestro anziano',
        talk: async (W, who) => {
          if (!W.flag('anziano')) {
            W.set('anziano');
            await W.say(['Un vecchio amico mi ha lasciato questa carta.', 'Vola via ogni volta che la metto nel cassetto: forse vuole viaggiare con te.'], who);
            return W.gain('chicca', 8, 'Chicca Fossa si unisce a te!');
          }
          return W.say('Il Taiji è come l\'acqua: morbido, ma scava la roccia.', who);
        } },
    ],
  };

  maps.lancenigo = {
    name: 'Lancenigo', check: [11, 9],
    tiles: [
      'TTTTTTTTTT::TTTTTTTTTT',
      'TTTTTTTTTT::TTTTTTTTTT',
      'TT.*......::.......*TT',
      'TT.~~~~...::........TT',
      'TT.~~~~...::........TT',
      'TT.~~~~...::........TT',
      'TT..*.....::........TT',
      'TT........::........TT',
      'TT==================TT',
      'TT..*.....==......*.TT',
      'TT........==........TT',
      'TT........==........TT',
      'TT........==........TT',
      'TT........==........TT',
      'TT........==........TT',
      'TT==================TT',
      'TT*.f..f......f..f.*TT',
      'TTTTTTTTTTTTTTTTTTTTTT',
    ],
    bld: [
      { x: 13, y: 3, w: 7, h: 5, k: 'dojo', door: 3, to: 'dojo' },
      { x: 3, y: 10, w: 5, h: 4, k: 'casa', door: 2, to: 'casa_mia', roof: '#d8503c' },
      { x: 13, y: 10, w: 5, h: 4, k: 'casa', door: 2, to: 'casa', roof: '#3a8ad8' },
    ],
    signs: [
      { x: 9, y: 3, text: 'LANCENIGO · Qui ha sede la Stone Temple Tao. A nord, il Percorso 1 porta a Ponte della Priula.' },
      { x: 12, y: 7, text: 'STONE TEMPLE TAO · Scuola di Tradizionali Arti Orientali. Taijiquan stile Chen.' },
    ],
    npc: [
      { id: 'bimbo', x: 8, y: 5, look: 'bimbo', name: 'Bimbo', move: 'wander',
        say: ['Mio fratello dice che nell\'erba alta ci sono gli spiriti delle carte!', 'Io una volta ho visto Vittorio sparire nel nulla. Ma forse era solo andato via.'] },
      { id: 'vecchio', x: 19, y: 9, look: 'vecchio', name: 'Signor Bepi',
        say: s => (s.flags.starter ? ['Quindi parti! Le carte con il bordo dorato sono quelle cresciute con te: allenale bene.'] : ['Il Maestro Samuele è passato di qui stamattina. Aveva una fretta...']) },
      { id: 'vicina', x: 8, y: 15, look: 'gente2', name: 'Vicina', move: 'wander',
        say: ['Chi vince le sfide guadagna monete. Con le monete, in bottega, si comprano pergamene e bustine di carte.'] },
    ],
    trig: [{ x: 10, y: 2, w: 2, if: s => !s.flags.starter, run: async W => {
      await W.say('Una voce ti chiama da lontano: «{n}! Il Maestro Samuele ti aspetta alla Stone Temple Tao!»');
      await W.walk('player', 'down', 1);
    } }],
    exits: [{ x: 10, y: 0, w: 2, to: 'percorso1', tx: 7, ty: 28 }],
  };

  maps.dojo = {
    name: 'Stone Temple Tao', inside: true, entry: [5, 8], terrain: 'lancenigo', music: 'tempio',
    tiles: [
      'WWWWWWWWWWW',
      'WWWWWWWWWWW',
      'pmmmmmmmmmp',
      'wmmmmmmmmmw',
      'wmmmmmmmmmw',
      'wmmmmmmmmmw',
      'wmmmmmmmmmw',
      'wwwwwwwwwww',
      'xwwwwwwwwwx',
      'wwwwwewwwww',
    ],
    exits: [{ x: 5, y: 9, to: '@back' }],
    npc: [
      { id: 'samuele', x: 5, y: 3, look: 'samuele', name: 'Samuele', face: 'samuele',
        talk: async (W, who) => {
          const s = W.s;
          if (!s.flags.starter) {
            await W.say(['Eccoti, {n}! Sei pronto?', 'Chi parte per il viaggio sceglie un primo compagno. Ecco tre carte: prendi quella che ti somiglia di più.'], who);
            let id = null;
            while (!id) {
              id = await W.pickCard(STARTERS, 'Scegli il tuo primo compagno');
              if (await W.ask(`Scegli ${nameOf(id)}?`) !== 0) id = null;
            }
            W.set('starter', id);
            await W.gain(id, 3, `${nameOf(id)} è il tuo primo compagno!`);
            await W.say('E per cominciare, due allieve del corso base viaggeranno con te.', who);
            await W.gain('nicole', 2, 'Nicole Fava si unisce a te!');
            await W.gain('caterina', 2, 'Caterina Fighera si unisce a te!');
          }
          // ogni passo si segna appena fatto: se l'app si chiude a metà, si riprende da qui
          if (!s.flags.rival1) {
            W.face('rival', 'right');
            await W.say(['Ehi, aspetta! Maestro, anch\'io voglio una carta!', 'Prendo questa!'], RIV);
            await W.say(`${RIVAL} sceglie ${nameOf(rivalCard(s))}!`);
            await W.say(['{n}, facciamo subito una sfida! Vediamo chi ha scelto meglio!'], RIV);
            await W.challenge({ name: RIVAL, cards: [rivalCard(s), 'vittorio', 'viola'], lv: [2, 1, 1], cpu: 'facile', terrain: 'lancenigo', music: 'rivale',
              win: 'Cosa?! Ho perso? Era solo il riscaldamento!', lose: 'Visto? Ho scelto meglio io!',
              onLose: async () => {} }, RIV);
            await W.say(['Mi alleno e ci rivediamo lungo la strada. Non ti lascerò vincere ancora!'], RIV);
            W.set('rival1');
            await W.walk('rival', 'down', 3);
            W.refresh();
          }
          if (!s.flags.pergamene) {
            W.set('pergamene');
            await W.say(['Bella sfida! Prendi queste 5 pergamene.', 'Quando sconfiggi uno spirito nell\'erba alta, una pergamena può reclutarlo nella tua squadra.'], who);
            W.scrolls(5); W.sfx('item');
            await W.say('Hai ricevuto 5 pergamene!');
            await W.say([
              'Nel mondo ci sono quattro palestre con un sigillo ciascuna.',
              'La prima è la Palestrina delle medie a Ponte della Priula, a nord. Poi l\'Inghilterra e la Cina.',
              'Con tre sigilli potrai incontrare le Leggende nel Tempio Ancestrale. E poi... tornerai qui, per l\'ultima prova: con me.',
              'Premi MENU per vedere le carte e scegliere la squadra. In bocca al lupo!',
            ], who);
            return;
          }
          if (s.badges.includes(3)) return W.say(['{n}, sei Campione della Stone Temple!', 'Continua ad allenarti e a collezionare carte: l\'album aspetta di essere completato.'], who);
          if (s.flags['tr:tempio:wangting']) {
            await W.say(['Hai incontrato le Leggende e sei tornato a casa. Sapevo che ce l\'avresti fatta.', 'È il momento dell\'ultima prova.'], who);
            if (await W.ask('Sei pronto per la sfida finale con il Maestro?', ['Sono pronto', 'Non ancora'], who) !== 0) return W.say('Allenati con calma. Io sono qui.', who);
            const win = await W.challenge({ name: 'Maestro Samuele', cards: ['samuele', 'andrea', 'chicca'], lv: 10, cpu: 'difficile', terrain: 'lancenigo', badge: 3,
              intro: 'Non mi tratterrò. Gomiti di Ferro!', win: ['Incredibile... L\'allievo ha superato il Maestro.', 'Il Sigillo del Tempio è tuo.'],
              lose: 'Ci sei quasi. Riprova quando vuoi.', onLose: async () => {} }, who);
            if (win) await W.ending();
            return;
          }
          return W.say(hint(s) || 'Continua così!', who);
        } },
      { id: 'rival', x: 3, y: 5, dir: 'right', look: 'rival', name: RIVAL, hide: s => !!s.flags.rival1,
        say: ['Anch\'io aspetto la mia prima carta! Il Maestro dice che devo avere pazienza...', '...ancora pazienza.'] },
      { id: 'katya', x: 8, y: 4, dir: 'left', look: 'katya', name: 'Katya', face: 'katya',
        talk: async (W, who) => {
          if (!W.flag('firma')) { W.set('firma'); return W.say(['Ah, {n}! Firma qui, per favore.', '...e anche qui. E qui. E qui.', 'Perfetto: ora sei iscritto ufficialmente!'], who); }
          return W.say('Ricordati: la mia Firma Urgente blocca le mosse speciali di tutti gli avversari. Usala al momento giusto!', who);
        } },
      { id: 'niccolo', x: 2, y: 7, dir: 'right', look: 'niccolo', name: 'Niccolò', face: 'niccolo',
        say: ['Lei, giovane allievo, è pronto per il viaggio?', 'Mi raccomando: dia del Lei agli avversari. Li confonde moltissimo.'] },
    ],
  };

  maps.percorso1 = {
    name: 'Percorso 1',
    tiles: [
      'TTTTTTT::TTTTTTT',
      'TTTTTTT::TTTTTTT',
      'TT,,,,.::.....TT',
      'TT,,,,.::.,,,,TT',
      'TT,,,,.::.,,,,TT',
      'TT....:::.,,,,TT',
      'TT....:.......TT',
      'TTvvvv:vvvvv..TT',
      'TT....:.......TT',
      'TT.r..:..*....TT',
      'TT....::::::..TT',
      'TT,,,.....,:..TT',
      'TT,,,,....,:..TT',
      'TT,,,,...,,:..TT',
      'TT,,,....,,:..TT',
      'TT...ffff..:..TT',
      'TT.........:..TT',
      'TTvvvvvvv..:vvTT',
      'TT.........:..TT',
      'TT..:::::::::.TT',
      'TT..:,,,,,,...TT',
      'TT..:,,,,,,,..TT',
      'TT..:,,,,,,,..TT',
      'TT..:.,,,,,...TT',
      'TT..:.........TT',
      'TT*.::::....*.TT',
      'TT....:::.....TT',
      'TTTTT..::..TTTTT',
      'TTTTTT.::.TTTTTT',
      'TTTTTTT::TTTTTTT',
    ],
    signs: [{ x: 9, y: 26, text: 'PERCORSO 1 · Nord: Ponte della Priula · Sud: Lancenigo' }],
    items: [{ x: 13, y: 2, scrolls: 2 }, { x: 2, y: 14, money: 200 }],
    npc: [
      { id: 'marco', x: 10, y: 9, dir: 'left', look: 'allievo', name: 'Allievo Marco',
        trainer: { cards: ['nicole', 'vittorio'], lv: 2, cpu: 'facile', sight: 4,
          intro: 'Ehi! Anche tu hai appena iniziato? Allora siamo pari!', win: 'Accidenti, sei forte! Devo allenarmi di più.', after: 'Il corso del lunedì non lo salto più, promesso.' } },
      { id: 'giulia', x: 3, y: 19, dir: 'right', look: 'allieva', name: 'Allieva Giulia',
        trainer: { cards: ['viola', 'annalisa'], lv: 2, cpu: 'facile', sight: 5,
          intro: 'Il mio Volto Marmoreo ti farà tremare! ...Più o meno.', win: 'Volevo solo provare il mio Canto Apocalittico...', after: 'Le carte Allievo costano poco: se ne mettono tante in squadra!' } },
      { id: 'consiglio', x: 12, y: 22, look: 'gente', name: 'Escursionista',
        say: ['Camminando nell\'erba alta incontrerai gli spiriti delle carte.', 'Se vinci, una pergamena può reclutarli. Se non ti va di combattere, puoi sempre scappare!', 'Tieni premuto B per correre.'] },
    ],
    wild: { rate: 0.09, pool: [['nicole', 1, 2], ['caterina', 1, 2], ['annalisa', 1, 3], ['vittorio', 2, 3], ['viola', 2, 3], ['grazia', 2, 3, 5]] },
    exits: [{ x: 7, y: 29, w: 2, to: 'lancenigo', tx: 10, ty: 1 }, { x: 7, y: 0, w: 2, to: 'priula', tx: 7, ty: 18 }],
  };

  maps.priula = {
    name: 'Ponte della Priula', check: [8, 12], shop: ['pergamena', 'pergamene5', 'bustinaA'],
    tiles: [
      'TTTTTTTTTTTTTT~~~TTTTTTT',
      'TTTTTTTTTTTTTT~~~TTTTTTT',
      'TT..*.........~~~.....TT',
      'TT............~~~.....TT',
      'TT............~~~.....TT',
      'TTTT.....*....~~~.....TT',
      ':::::=========bbb=====TT',
      'TTTT....=.....~~~..*..TT',
      'TT......=.....~~~.....TT',
      'TT......=.....~~~.....TT',
      'TT......=.....~~~.....TT',
      'TT......=.....~~~.....TT',
      'TT============~~~.....TT',
      'TT......=.....~~~,,,,,TT',
      'TT.*....=.....~~~,,,,,TT',
      'TT......=...*.~~~,,,,,TT',
      'TT......=.....~~~,,,,,TT',
      'TTTTTTT.=.TTTT~~~TTTTTTT',
      'TTTTTTT.=TTTTT~~~TTTTTTT',
      'TTTTTTT::TTTTT~~~TTTTTTT',
    ],
    bld: [
      { x: 5, y: 2, w: 5, h: 4, k: 'casa', door: 2, to: 'casa', room: 'priula-a', roof: '#e8a030' },
      { x: 2, y: 8, w: 5, h: 4, k: 'bottega', door: 2, to: 'bottega', roof: '#3a78d8' },
      { x: 9, y: 8, w: 5, h: 4, k: 'casa', door: 2, to: 'casa', roof: '#8a4ab0' },
      { x: 17, y: 2, w: 5, h: 4, k: 'palestra', door: 2, to: 'palestrina', roof: '#3aa060' },
    ],
    signs: [
      { x: 12, y: 5, text: 'PONTE DELLA PRIULA · Il ponte sul Piave. A ovest: la Grotta del Montello.' },
      { x: 17, y: 7, text: 'PALESTRINA DELLE MEDIE · Capopalestra: Federica Siciliano. Il regno degli allievi!' },
    ],
    npc: [
      { id: 'guardia', x: 3, y: 6, dir: 'right', look: 'guardia', name: 'Guardia', hide: s => s.badges.length >= 1,
        say: ['Più avanti c\'è la Grotta del Montello: buia e piena di allenatori tosti.', 'Senza il Sigillo dell\'Allievo non ti lascio passare!'] },
      { id: 'pescatore', x: 13, y: 3, dir: 'right', look: 'pescatore', name: 'Pescatore', fixed: true,
        say: ['Nel Piave non si pescano carte. Ci ho provato per tre anni.', 'Però lungo l\'argine, nell\'erba alta, dicono che gli spiriti abbondino.'] },
      { id: 'ragazza', x: 4, y: 14, look: 'gente2', name: 'Ragazza', move: 'wander',
        say: ['La Federica allena gli allievi delle medie. Sono tantissimi e urlano tantissimo.', 'Nella sua palestra gli Allievi hanno +10 ATK e +10 DEF: portane qualcuno!'] },
    ],
    wild: { rate: 0.08, pool: [['christian', 2, 4], ['grazia', 2, 3], ['annastella', 2, 4], ['viola', 2, 4], ['alessandro', 3, 4, 5]] },
    exits: [{ x: 7, y: 19, w: 2, to: 'percorso1', tx: 7, ty: 1 }, { x: 0, y: 6, to: 'montello', tx: 22, ty: 3 }],
  };

  maps.bottega = {
    name: 'Bottega', inside: true, entry: [3, 5],
    tiles: [
      'WWWWWWWW',
      'WWWWWWWW',
      'wkwwwxxx',
      'wkwwwwww',
      'wkwwwwww',
      'wwwwwwpw',
      'wwwewwww',
    ],
    exits: [{ x: 3, y: 6, to: '@back' }],
    npc: [
      { id: 'commessa', x: 0, y: 3, dir: 'right', look: 'commessa', name: 'Commessa', fixed: true,
        talk: async (W, who) => {
          await W.say('Benvenuto in bottega! Pergamene, bustine di carte... e compriamo le tue copie doppie.', who);
          await W.shop((maps[W.s.back && W.s.back.map] || {}).shop || ['pergamena']);
          await W.say('Torna presto!', who);
        } },
      { id: 'cliente', x: 6, y: 3, look: 'gente', name: 'Cliente', move: 'wander',
        say: ['Le bustine danno carte più forti man mano che conquisti sigilli.', 'Quelle Istruttori le vendono solo a Treviso e più avanti.'] },
    ],
  };

  maps.palestrina = {
    name: 'Palestrina delle medie', inside: true, entry: [4, 10], terrain: 'priula', music: 'tempio',
    tiles: [
      'WWWWWWWWW',
      'WWWWWWWWW',
      'pmmmmmmmp',
      'mmmmmmmmm',
      'mmmmmmmmm',
      'xxxmmmxxx',
      'mmmmmmmmm',
      'mmmmmmmmm',
      'xxmmmmmxx',
      'mmmmmmmmm',
      'wwwwwwwww',
      'wwwwewwww',
    ],
    exits: [{ x: 4, y: 11, to: '@back' }],
    npc: [
      { id: 'federica', x: 4, y: 2, look: 'federica', name: 'Federica', face: 'federica',
        trainer: { cards: ['federica', 'annastella', 'remigio', 'annalisa'], lv: [5, 4, 4, 4], cpu: 'normale', badge: 0, sight: 2,
          intro: ['Benvenuto nella Palestrina delle medie!', 'Qui gli allievi crescono forti... e io li difendo tutti. Dominio dell\'Infante!'],
          win: ['Che sfida! I miei bambini non-morti sono stanchissimi.', 'Ti sei meritato il Sigillo dell\'Allievo. Ora la guardia del Montello ti lascerà passare.'],
          after: 'La Grotta del Montello è buia: dentro si vede poco, ma gli spiriti ci vedono benissimo.' } },
      { id: 'allievo1', x: 0, y: 7, dir: 'right', look: 'allievo', name: 'Allievo delle medie',
        trainer: { cards: ['grazia', 'christian', 'caterina'], lv: 3, cpu: 'normale', sight: 8,
          intro: 'Per arrivare da Federica devi passare da me!', win: 'Uffa! Ma la merenda me la merito lo stesso.', after: 'Federica usa tanti allievi. Le carte forti contro tanti nemici sono utili!' } },
      { id: 'allievo2', x: 8, y: 4, dir: 'left', look: 'allieva', name: 'Allieva delle medie',
        trainer: { cards: ['adriano', 'celeste'], lv: 4, cpu: 'normale', sight: 8,
          intro: 'Adriano non si lascia stordire da nessuno. Provaci!', win: 'Il Ballo Dirompente non è bastato...', after: 'Vai, Federica ti aspetta!' } },
      { id: 'guida', x: 6, y: 10, look: 'gente', name: 'Guida',
        say: ['Ehi, campione in erba! Qui gli Allievi hanno +10 ATK e +10 DEF.', 'Vale anche per i tuoi: una squadra di allievi qui è fortissima!'] },
    ],
  };

  maps.montello = {
    name: 'Grotta del Montello', dark: true, music: 'grotta', edge: '#',
    tiles: [
      '########################',
      '#cccc###cccccc###cccccc#',
      '#cocc###cc##cc###cc##cc#',
      '#cccccccc##cccccccccc#cc',
      '####cccc###cc####ccc#cc#',
      '#ccccc~~ccccc####cccccc#',
      '#cc###~~###cc#cccccc####',
      '#cc###cc###cccccc##ccco#',
      '#cccccccc#####ccc##cccc#',
      '####ccc###ccccccc##cc###',
      '#ccccccc###cc####ccccc##',
      '#cc#cccc###cc####cc#cc##',
      '#cc#cc~~~ccccccccc#cccc#',
      '#cc#cc~~~###cc####ccco##',
      '#ccccccccc##cccccccccc##',
      '#####c####ccc###ccc#####',
      '#cccccc###ccccc#ccccccc#',
      '#cccocc###cc#cccccc#ccc#',
      '#cccccc######c#####cccc#',
      '#############c##########',
    ],
    items: [{ x: 1, y: 1, scrolls: 3 }, { x: 21, y: 7, card: 'remigio', lv: 4 }, { x: 5, y: 17, money: 500 }],
    npc: [
      { id: 'dario', x: 1, y: 8, dir: 'right', look: 'speleo', name: 'Speleologo Dario',
        trainer: { cards: ['alessandro', 'remigio', 'vittorio'], lv: 5, cpu: 'normale', sight: 6,
          intro: 'Shh! Hai sentito? Qui sotto qualcuno sussurra da giorni...', win: 'Va bene, va bene! Ma il sussurro c\'è davvero.', after: 'Il sussurro viene da sud, vicino all\'uscita.' } },
      { id: 'marta', x: 16, y: 12, dir: 'left', look: 'allieva', name: 'Esploratrice Marta',
        trainer: { cards: ['celeste', 'grazia', 'nicole'], lv: 5, cpu: 'normale', sight: 5,
          intro: 'Mi sono persa, ma una sfida la faccio volentieri!', win: 'Almeno ora so dove sono: in fondo alla classifica.', after: 'Nel buio guarda bene: per terra ci sono pergamene e perfino carte.' } },
      { id: 'smarrito', x: 20, y: 16, dir: 'left', look: 'allievo', name: 'Allievo smarrito',
        trainer: { cards: ['christian', 'caterina', 'annalisa', 'viola'], lv: 5, cpu: 'normale', sight: 4,
          intro: 'Quattro carte e una gran paura del buio. Combattiamo, così non ci penso!', win: 'Grazie, mi sento meglio. Più o meno.', after: 'Hai visto quell\'Istruttore che parla da solo vicino all\'uscita?' } },
      { id: 'signorello', x: 13, y: 18, dir: 'up', look: 'signorello', name: 'Lorenzo Signorello', face: 'signorello',
        trainer: { cards: ['signorello', 'lorenzo', 'adriano', 'nicole'], lv: [7, 6, 6, 6], cpu: 'normale', sight: 2, vanish: true, music: 'capopalestra',
          intro: ['Shhh... Senti? È il Sussurro Eterno.', 'Parlo con ogni manifestazione dell\'esistenza. E oggi mi hanno detto che saresti arrivato tu.'],
          win: ['Il Montello ha parlato: sei degno.', 'Prendi la mia carta. Ti sussurrerò consigli da lontano.'],
          after: '...',
          onWin: W => W.gain('signorello', 6, 'Lorenzo Signorello si unisce a te!') } },
    ],
    wild: { on: 'c', rate: 0.05, pool: [['christian', 3, 5], ['celeste', 3, 5], ['adriano', 3, 5], ['remigio', 4, 5], ['alessandro', 3, 5], ['lorenzo', 4, 5, 4], ['strahinja', 5, 5, 2],
      ['sara', 5, 5, 1], ['carla', 5, 5, 1], ['flavio', 5, 5, 1], ['federico', 5, 5, 1], ['oksana', 5, 5, 1]] },
    exits: [{ x: 23, y: 3, to: 'priula', tx: 1, ty: 6 }, { x: 13, y: 19, to: 'percorso2', tx: 7, ty: 1 }],
  };

  maps.percorso2 = {
    name: 'Percorso 2',
    tiles: [
      'TTTTTTT:TTTTTTTT',
      'TTTTTT.:.TTTTTTT',
      'TT....::......TT',
      'TT,,,,.:.,,,,.TT',
      'TT,,,,.:.,,,,.TT',
      'TT,,,,.:.,,,,.TT',
      'TT....:::.....TT',
      'TTvvvv:vvvvvv.TT',
      'TT~~~~b~~~~...TT',
      'TT~~~~b~~~~...TT',
      'TT....:.......TT',
      'TT.r..:..,,,,,TT',
      'TT....:..,,,,,TT',
      'TT,,,,:..,,,,,TT',
      'TT,,,,:.......TT',
      'TT,,,,::::::..TT',
      'TT.........:..TT',
      'TTfffffffff:ffTT',
      'TT.....*...:..TT',
      'TT.ffff....:..TT',
      'TT.........:..TT',
      'TT,,,,,,...:..TT',
      'TT,,,,,,...:..TT',
      'TT,,,,,,..::..TT',
      'TT........:...TT',
      'TTTTTT...::TTTTT',
      'TTTTTTT..:TTTTTT',
      'TTTTTTT::TTTTTTT',
    ],
    signs: [{ x: 9, y: 2, text: 'PERCORSO 2 · Nord: Grotta del Montello · Sud: Treviso' }],
    items: [{ x: 13, y: 2, scrolls: 2 }, { x: 2, y: 18, money: 400 }, { x: 12, y: 13, card: 'annalisa', lv: 5 }],
    npc: [
      { id: 't1', x: 11, y: 10, dir: 'left', look: 'gente', name: 'Corridore Elia',
        trainer: { cards: ['lorenzo', 'annastella'], lv: 6, cpu: 'normale', sight: 5,
          intro: 'Corro qui ogni mattina. Oggi corro... contro di te!', win: 'Ho il fiatone. Anche le mie carte.', after: 'Il Berserker dell\'Ingiustizia di Lorenzo dà +20 ATK: occhio!' } },
      { id: 't2', x: 5, y: 24, dir: 'right', look: 'allieva', name: 'Allieva Sofia',
        trainer: { cards: ['strahinja', 'nicole', 'viola'], lv: 6, cpu: 'normale', sight: 5,
          intro: 'Strahinja ha mal di schiena, ma combatte lo stesso!', win: 'Nessuno nota i suoi dolori... nemmeno tu.', after: 'A Treviso c\'è l\'aeroporto: da lì si vola in Inghilterra.' } },
      { id: 'rival2', x: 11, y: 20, dir: 'up', look: 'rival', name: RIVAL, show: s => !!s.flags.rival1,
        trainer: { cards: s => [rivalCard(s), 'remigio', 'christian', 'caterina'], lv: [7, 6, 6, 6], cpu: 'normale', sight: 3, vanish: true, music: 'rivale',
          intro: ['{n}! Ti aspettavo!', 'Ho preso il Sigillo dell\'Allievo anch\'io. Ora vediamo chi è più forte davvero!'],
          win: ['Di nuovo?! Va bene, va bene...', 'Vado in Cina ad allenarmi con i veri Maestri. Ci rivediamo là!'],
          lose: 'Te l\'avevo detto! Allenati ancora, {n}!' } },
    ],
    wild: { rate: 0.09, pool: [['vittorio', 4, 6], ['viola', 4, 6], ['annastella', 4, 6], ['remigio', 5, 6], ['lorenzo', 5, 6, 5], ['niccolo', 6, 6, 2]] },
    exits: [{ x: 7, y: 0, to: 'montello', tx: 13, ty: 18 }, { x: 7, y: 27, w: 2, to: 'treviso', tx: 12, ty: 1 }],
  };

  maps.treviso = {
    name: 'Treviso', check: [13, 5], shop: ['pergamena', 'pergamene5', 'bustinaA', 'bustinaI'],
    tiles: [
      'TTTTTTTTTTTT==TTTTTTTTTTTT',
      'TT..........==..........TT',
      'TT..........==..........TT',
      'TT..........==..........TT',
      'TT..........==..........TT',
      'TT======================TT',
      'TT.*......*.==.*......*.TT',
      '~~~~~~~~~~~~bb~~~~~~~~~~~~',
      '~~~~~~~~~~~~bb~~~~~~~~~~~~',
      'TT.*......*.==.*......*.TT',
      'TT..........==..........TT',
      'TT..........==..........TT',
      'TT..........==..........TT',
      'TT..........==..........TT',
      'TT======================TT',
      'TT..........==..........TT',
      'TT..*****...==...*****..TT',
      'TT..........==..........TT',
      'TT..........==..........TT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    bld: [
      { x: 3, y: 1, w: 5, h: 4, k: 'bottega', door: 2, to: 'bottega', roof: '#3a78d8' },
      { x: 15, y: 1, w: 8, h: 4, k: 'aeroporto', door: 4, to: 'aeroporto' },
      { x: 3, y: 10, w: 5, h: 4, k: 'casa', door: 2, to: 'casa', room: 'treviso-a', roof: '#c8482a' },
      { x: 17, y: 10, w: 5, h: 4, k: 'casa', door: 2, to: 'casa', roof: '#3aa060' },
    ],
    signs: [{ x: 11, y: 4, text: 'TREVISO · Città d\'acque. A est l\'Aeroporto Canova: voli per l\'Inghilterra e la Cina.' }],
    npc: [
      { id: 'canali', x: 8, y: 6, look: 'gente2', name: 'Trevigiana',
        say: ['Lo sai che il canale qui si chiama Buranelli?', 'D\'estate ci si siede sul bordo con un gelato e si guardano passare le anatre.'] },
      { id: 'viaggiatrice', x: 16, y: 6, look: 'commessa', name: 'Viaggiatrice', move: 'wander',
        say: ['Dall\'aeroporto si vola in Inghilterra: là c\'è la palestra del Maestro Liming Yue.', 'Per la Cina, invece, serve il secondo sigillo.'] },
      { id: 'ciclista', x: 9, y: 15, dir: 'right', look: 'gente', name: 'Ciclista Paolo',
        trainer: { cards: ['vittorio', 'remigio', 'grazia'], lv: 7, cpu: 'normale', sight: 3,
          intro: 'Fermo lì! Ho appena fatto il giro delle mura in bici: sono caldissimo!', win: 'Forato. Anche la squadra.', after: 'Il Potenziamento Tysoniano di Remigio si somma fino a tre volte!' } },
      { id: 'turista', x: 22, y: 14, dir: 'left', look: 'inglese2', name: 'Turista Anna',
        trainer: { cards: ['federica', 'celeste', 'annalisa'], lv: 7, cpu: 'normale', sight: 10,
          intro: 'Sono in vacanza, ma una sfida non si rifiuta mai!', win: 'Che bella città. Peccato per la sconfitta.', after: 'La prossima volta vengo con le carte Maestro.' } },
      { id: 'chiuso', x: 12, y: 18, look: 'vecchio', name: 'Signore', fixed: true,
        say: ['Il centro storico è chiuso per la Festa della Carta.', 'Torna un altro giorno, magari nel prossimo aggiornamento!'] },
    ],
    exits: [{ x: 12, y: 0, w: 2, to: 'percorso2', tx: 7, ty: 26 }],
  };

  maps.aeroporto = {
    name: 'Aeroporto Canova', inside: true, entry: [4, 6],
    tiles: [
      'WWWWWWWWWW',
      'WWWWWWWWWW',
      'pwwwwwwwwp',
      'wwkkkkkkww',
      'wwwwwwwwww',
      'wRRRRRRRRw',
      'wwwwwwwwww',
      'wwwwewwwww',
    ],
    exits: [{ x: 4, y: 7, to: '@back' }],
    npc: [
      { id: 'hostess', x: 4, y: 2, look: 'commessa', name: 'Banco partenze', fixed: true,
        talk: async (W, who) => { await W.say('Benvenuto all\'Aeroporto Canova! Dove vuoi andare?', who); if (!await W.fly()) await W.say('Buona giornata!', who); } },
      { id: 'passeggero', x: 8, y: 4, look: 'gente', name: 'Passeggero',
        say: ['Ho perso il volo per la Cina. Di nuovo.', 'Dicono che a Chenjiagou, nell\'erba di bambù, si incontrino perfino gli spiriti dei Maestri.'] },
    ],
  };

  maps.inghilterra = {
    name: 'Inghilterra', check: [12, 15], weather: 'pioggia',
    tiles: [
      'TTTTTTTTTTTTTTTTTTTTTT',
      'TT...............,,,TT',
      'TT...............,,,TT',
      'TT...............,,,TT',
      'TT..............,,,,TT',
      'TT..............,,,,TT',
      'TT=i=========i==,,,,TT',
      'TT==================TT',
      'TT....U.....==......TT',
      'TT..........==......TT',
      'TT..........==......TT',
      'TT..........==......TT',
      'TT..........==..*...TT',
      'TT==========i=======TT',
      'TT..*.......==....*.TT',
      'TT..........==......TT',
      'TT..........==......TT',
      'TTTTTTTTTTTTTTTTTTTTTT',
    ],
    bld: [
      { x: 7, y: 1, w: 7, h: 5, k: 'palestra', door: 3, to: 'palestra_liming', roof: '#5a6a7a' },
      { x: 2, y: 2, w: 5, h: 4, k: 'casa', door: 2, to: 'casa', room: 'ing-a', roof: '#7a5a8a', wall: '#e4dccc' },
      { x: 3, y: 9, w: 5, h: 4, k: 'casa', door: 2, to: 'casa', room: 'ing-b', roof: '#5a6a7a', wall: '#d8c8b0' },
      { x: 15, y: 9, w: 5, h: 4, k: 'casa', door: 2, to: 'casa', room: 'ing', roof: '#8a3a3a', wall: '#e4dccc' },
    ],
    signs: [{ x: 15, y: 8, text: 'INGHILTERRA · Palestra del Maestro Liming Yue: disciplina inglese, mosse speciali più rapide.' }],
    npc: [
      { id: 'pilota', x: 14, y: 15, dir: 'left', look: 'pilota', name: 'Pilota',
        talk: async (W, who) => { await W.say('Il mio aereo è pronto. Si parte?', who); if (!await W.fly()) await W.say('Quando vuoi, sono qui.', who); } },
      { id: 'mercante', x: 19, y: 15, dir: 'left', look: 'inglese', name: 'Bancarella',
        talk: async (W, who) => { await W.say('Pergamene e bustine, signore! Accettiamo anche monete italiane.', who); await W.shop(['pergamena', 'pergamene5', 'bustinaA', 'bustinaI']); } },
      { id: 'pioggia', x: 8, y: 15, look: 'inglese2', name: 'Signora con ombrello', move: 'wander',
        say: ['Qui piove sempre. Il Maestro Liming Yue dice che la pioggia allena la pazienza.'] },
      { id: 'arthur', x: 9, y: 10, dir: 'right', look: 'inglese', name: 'Gentleman Arthur',
        trainer: { cards: ['niccolo', 'annalisa', 'grazia'], lv: 7, cpu: 'normale', sight: 3,
          intro: 'Good morning! Una sfida tra gentiluomini?', win: 'Splendid! Ben giocato, davvero.', after: 'Il parco a nord è pieno di spiriti. Portati un ombrello.' } },
      { id: 'emma', x: 17, y: 7, dir: 'left', look: 'inglese2', name: 'Lady Emma',
        trainer: { cards: ['federica', 'celeste', 'viola'], lv: 7, cpu: 'normale', sight: 5,
          intro: 'Una signora non rifiuta mai un duello. Prego, prima tu.', win: 'Oh my. Che maleducazione vincere così bene.', after: 'Il Maestro Liming Yue è severo, ma giusto.' } },
    ],
    wild: { rate: 0.1, n: 2, cpu: 'normale', pool: [['federica', 6, 8], ['niccolo', 6, 8], ['strahinja', 6, 8], ['celeste', 6, 7], ['grazia', 6, 7], ['signorello', 8, 8, 2]] },
  };

  maps.palestra_liming = {
    name: 'Palestra del Maestro Liming Yue', inside: true, entry: [5, 10], terrain: 'liming', music: 'tempio',
    tiles: [
      'WWWWWWWWWWW',
      'WWWWWWWWWWW',
      'pmmmmmmmmmp',
      'mmmmmmmmmmm',
      'mmxxxmxxxmm',
      'mmmmmmmmmmm',
      'mmmmmmmmmmm',
      'xxxmmmmmxxx',
      'mmmmmmmmmmm',
      'mmmmmmmmmmm',
      'wwwwwwwwwww',
      'wwwwwewwwww',
    ],
    exits: [{ x: 5, y: 11, to: '@back' }],
    npc: [
      { id: 'liming', x: 5, y: 2, look: 'liming', name: 'Maestro Liming Yue',
        trainer: { cards: ['niccolo', 'strahinja', 'federica', 'nicole'], lv: 8, cpu: 'normale', badge: 1, sight: 2,
          intro: ['Benvenuto. In questa palestra le mosse speciali si ricaricano un turno prima.', 'Disciplina, puntualità, tè alle cinque. Cominciamo.'],
          win: ['Ottima disciplina, {n}.', 'Il Sigillo della Disciplina è tuo. Ora puoi volare in Cina, a Chenjiagou.'],
          after: 'A Chenjiagou troverai Chen Delang nella Piazza del Taiji. Salutamelo.' } },
      { id: 'inglese1', x: 0, y: 8, dir: 'right', look: 'inglese', name: 'Allievo inglese',
        trainer: { cards: ['strahinja', 'caterina', 'viola'], lv: 7, cpu: 'normale', sight: 10,
          intro: 'Allievo del Maestro Liming Yue, al tuo servizio. E alla tua sconfitta!', win: 'Bloody hell!', after: 'Il Maestro usa tanti Istruttori: le mosse che valgono doppio sugli Istruttori qui brillano.' } },
      { id: 'inglese2', x: 10, y: 5, dir: 'left', look: 'inglese2', name: 'Allieva inglese',
        trainer: { cards: ['niccolo', 'annastella', 'vittorio'], lv: 7, cpu: 'normale', sight: 10,
          intro: 'Lei è pronto, giovane? Il Maestro ci ha insegnato a dare del Lei.', win: 'Lei... ha vinto.', after: 'Il Maestro è in fondo. Si inchini, prima di sfidarlo.' } },
      { id: 'guida', x: 8, y: 10, look: 'gente', name: 'Guida',
        say: ['Qui le mosse speciali si ricaricano un turno prima: per entrambe le squadre!', 'Il Maestro schiera Istruttori. Carte come Oksana o Federico, se le hai, fanno effetto doppio su di loro.'] },
    ],
  };

  maps.chenjiagou = {
    name: 'Chenjiagou', check: [12, 18], edge: 'Y',
    tiles: [
      'YYYYYYYYYYYYYYYYYYYYYYYY',
      'YY.K................K.YY',
      'YY....................YY',
      'YY.,,,............,,,.YY',
      'YY.,,,............,,,.YY',
      'YY.,,,............,,,.YY',
      'YY.....L...gg...L.....YY',
      'YY.........gg.........YY',
      'YYGGGG..gggggggg..GGGGYY',
      'YY.....LggggggggL.....YY',
      'YY......gggggggg......YY',
      'YY..K...gggggggg...K..YY',
      'YY......gggggggg......YY',
      'YY.....LggggggggL.....YY',
      'YY,,,,..gggggggg..,,,,YY',
      'YY,,,,....::::....,,,,YY',
      'YY,,,,....::::....,,,,YY',
      'YY..........::........YY',
      'YY..........::........YY',
      'YY..K.......::.....K..YY',
      'YY..........::........YY',
      'YYYYYYYYYYYYYYYYYYYYYYYY',
    ],
    bld: [
      { x: 8, y: 1, w: 8, h: 5, k: 'tempio', door: 4, to: 'tempio' },
      { x: 2, y: 9, w: 5, h: 4, k: 'casa', door: 2, to: 'casa', room: 'cina-a', roof: '#2f7a72', wall: '#efe0c0' },
      { x: 17, y: 9, w: 5, h: 4, k: 'casa', door: 2, to: 'casa', room: 'cina', roof: '#b8322a', wall: '#efe0c0' },
    ],
    signs: [{ x: 10, y: 18, text: 'CHENJIAGOU · Villaggio natale del Taijiquan stile Chen. A nord: la Piazza del Taiji e il Tempio Ancestrale.' }],
    npc: [
      { id: 'pilota', x: 14, y: 20, dir: 'left', look: 'pilota', name: 'Pilota',
        talk: async (W, who) => { await W.say('Pronto a ripartire?', who); if (!await W.fly()) await W.say('Ti aspetto qui.', who); } },
      { id: 'bancarella', x: 6, y: 17, dir: 'right', look: 'monaco', name: 'Bancarella',
        talk: async (W, who) => { await W.say('Pergamene, bustine Istruttori e Maestri! Qualità garantita dal villaggio.', who); await W.shop(['pergamena', 'pergamene5', 'bustinaI', 'bustinaM']); } },
      { id: 'chen', x: 12, y: 10, look: 'chen', name: 'Chen Delang', face: 'chen',
        trainer: { cards: ['chen', 'chicca', 'katya'], lv: 9, cpu: 'difficile', badge: 2, sight: 3, terrain: 'chenjiagou',
          intro: ['Benvenuto nella Piazza del Taiji, dove tutto è cominciato.', 'Qui Maestri e Leggende sono più forti. Mostrami cosa hai imparato. Spallata del Prodigio!'],
          win: ['La tua forma è buona. Il tuo cuore, ancora meglio.', 'Prendi il Sigillo della Tradizione. Ora il Tempio Ancestrale ti aprirà le porte.'],
          after: 'Nel Tempio vivono gli spiriti di Chen Zhenglei e Chen Wangting. Non sottovalutarli.' } },
      { id: 'discepolo1', x: 9, y: 14, dir: 'right', look: 'monaco', name: 'Discepolo',
        trainer: { cards: ['elia', 'caterina', 'nicole'], lv: 8, cpu: 'difficile', sight: 4, terrain: 'chenjiagou',
          intro: 'La Piazza è sacra. Dimostra di meritarla!', win: 'Il mio Disallineamento Temporale non è bastato.', after: 'Il Maestro Chen è al centro della Piazza.' } },
      { id: 'discepolo2', x: 15, y: 12, dir: 'left', look: 'monaco', name: 'Discepola',
        trainer: { cards: ['katya', 'annalisa', 'vittorio'], lv: 8, cpu: 'difficile', sight: 3, terrain: 'chenjiagou',
          intro: 'Prima di arrivare dal Maestro, firmi qui. E perdi.', win: 'Firmato. Hai vinto tu.', after: 'Vai, il Maestro ti aspetta.' } },
      { id: 'monaco', x: 12, y: 6, look: 'monaco', name: 'Monaco', hide: s => s.badges.length >= 3,
        say: ['Il Tempio Ancestrale è aperto solo a chi porta tre sigilli.'] },
      { id: 'rival3', x: 12, y: 6, dir: 'down', look: 'rival', name: RIVAL, show: s => s.badges.length >= 3 && !!s.flags.rival1,
        trainer: { cards: s => [rivalCard(s), 'lorenzo', 'strahinja', 'annalisa'], lv: [10, 9, 9, 9], cpu: 'difficile', sight: 3, vanish: true, music: 'rivale', terrain: 'chenjiagou',
          intro: ['{n}! Anch\'io ho tre sigilli. Il Tempio è mio!', 'Questa volta ho studiato. Ultima sfida, ultima occasione!'],
          win: ['...Va bene. Hai vinto tu. Davvero.', 'Entra nel Tempio. E salutami le Leggende.'],
          lose: 'Te l\'avevo detto! Torna quando sei pronto.' } },
      { id: 'vecchina', x: 20, y: 17, look: 'nonna', name: 'Anziana del villaggio', move: 'wander',
        say: ['Nel bambù vivono gli spiriti dei Maestri. Ogni tanto, perfino Andrea o Chen.', 'Servono tante pergamene: sono spiriti orgogliosi.'] },
    ],
    wild: { rate: 0.1, n: 2, cpu: 'normale', pool: [['chicca', 7, 9], ['katya', 7, 9], ['elia', 8, 9], ['federica', 7, 8], ['samuele', 8, 9, 3], ['andrea', 9, 9, 2], ['chen', 9, 9, 2]] },
  };

  maps.tempio = {
    name: 'Tempio Ancestrale', inside: true, entry: [8, 20], music: 'tempio', terrain: 'chenjiagou',
    tiles: [
      'GGGGGGGGGGGGGGGGGG',
      'GGGGGgggggggGGGGGG',
      'GGGGGgLgggLgGGGGGG',
      'GGGGGgggggggGGGGGG',
      'GGGGGGGGgGGGGGGGGG',
      'GggggggggggggggggG',
      'GgLggggggggggggLgG',
      'GggggggggggggggggG',
      'GGGGGggGGGGggGGGGG',
      'GggggggggggggggggG',
      'GgGGGGGGggGGGGGGgG',
      'GgGggggggggggggGgG',
      'GgGgGGGGggGGGGgGgG',
      'GgggGLggggggLGgggG',
      'GGGGGGggggggGGGGGG',
      'GggggggggggggggggG',
      'GgLggggggggggggLgG',
      'GggggggggggggggggG',
      'GggggggggggggggggG',
      'GgLggggggggggggLgG',
      'GggggggggggggggggG',
      'GGGGGGGGeGGGGGGGGG',
    ],
    exits: [{ x: 8, y: 21, to: '@back' }],
    items: [{ x: 1, y: 13, scrolls: 5 }, { x: 16, y: 13, card: 'elia', lv: 8 }, { x: 5, y: 1, money: 1000 }],
    npc: [
      { id: 'm1', x: 3, y: 17, dir: 'right', look: 'monaco', name: 'Monaco del Tempio',
        trainer: { cards: ['chicca', 'annalisa', 'nicole'], lv: 9, cpu: 'difficile', sight: 7,
          intro: 'Il silenzio del Tempio va rispettato. Combattiamo in silenzio.', win: '...', after: 'Le Leggende riposano in fondo al Tempio.' } },
      { id: 'm2', x: 13, y: 11, dir: 'left', look: 'monaco', name: 'Monaco del Tempio',
        trainer: { cards: ['elia', 'caterina', 'vittorio'], lv: 9, cpu: 'difficile', sight: 6,
          intro: 'Solo chi è puro di cuore arriva alle Leggende.', win: 'Il tuo cuore è puro. E le tue carte forti.', after: 'Prosegui verso nord.' } },
      { id: 'm3', x: 15, y: 7, dir: 'left', look: 'monaco', name: 'Monaca del Tempio',
        trainer: { cards: ['katya', 'remigio', 'annastella'], lv: 9, cpu: 'difficile', sight: 8,
          intro: 'Ultima prova prima della sala delle Leggende!', win: 'Passa pure. Che le Leggende siano con te.', after: 'Chen Zhenglei ti aspetta nella sala.' } },
      { id: 'zhenglei', x: 8, y: 5, look: 'zhenglei', name: 'Chen Zhenglei', face: 'zhenglei',
        trainer: { cards: ['zhenglei', 'annalisa', 'nicole', 'caterina'], lv: 10, cpu: 'difficile', sight: 2, vanish: true, music: 'leggenda',
          intro: ['Sei arrivato fin qui. Bene.', 'Io sono lo spirito del Gran Maestro. Ciuffata Cosmica!'],
          win: ['Il tuo Taiji è sincero.', 'Il mio spirito viaggerà con te.'],
          onWin: W => W.gain('zhenglei', 8, 'Chen Zhenglei si unisce a te!') } },
      { id: 'wangting', x: 8, y: 2, look: 'wangting', name: 'Chen Wangting', face: 'wangting',
        trainer: { cards: ['wangting', 'andrea'], lv: 10, cpu: 'difficile', sight: 1, vanish: true, music: 'leggenda',
          intro: ['Io ho creato quest\'arte, quattro secoli fa.', 'Vediamo se l\'hai capita davvero. Creazione Marziale!'],
          win: ['Hai capito. Il Taiji vive in te.', 'Ora torna a casa, {n}: il tuo Maestro ti aspetta per l\'ultima prova.'],
          onWin: W => W.gain('wangting', 8, 'Chen Wangting si unisce a te!') } },
    ],
  };

  window.MONDO = { RIVAL, LOOKS, BADGES, ITEMS, FLY, LOOK_AT, INTRO, INTRO_END, maps };
})();
