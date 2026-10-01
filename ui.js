/* STONE TEMPLE TAO — interfaccia per telefono */
(function () {
  'use strict';
  const S = window.STT;
  const $app = document.getElementById('app');
  const $layer = document.getElementById('layer');

  // ------------------------------------------------------------ memoria locale
  function store(k, v) { try { localStorage.setItem('stt_' + k, JSON.stringify(v)); } catch (e) { /* niente */ } }
  function load(k, d) { try { const v = localStorage.getItem('stt_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function drop(k) { try { localStorage.removeItem('stt_' + k); } catch (e) { /* niente */ } }

  const reduced = (() => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  const DEFAULTS = { sfx: true, music: true, vibration: true, anim: reduced ? 'off' : 'full', speed: 'normale', events: true, allUnlocked: false, bigText: false, effectCards: true };
  const settings = Object.assign({}, DEFAULTS, load('settings', {}));
  if (load('anim', null)) { settings.anim = load('anim', settings.anim); drop('anim'); }
  // il vecchio "3D veloce" ora è 3D + velocità veloce
  if (settings.anim === 'fast') { settings.anim = 'full'; settings.speed = 'veloce'; }

  // velocità di gioco: moltiplica animazioni 3D, pause del computer e scritte
  const SPEED = { lenta: 0.55, normale: 1, veloce: 1.8 };
  const SPEED_OPTS = [['lenta', '🐢', 'Lenta'], ['normale', '▶︎', 'Normale'], ['veloce', '🐇', 'Veloce']];
  const speedK = () => SPEED[settings.speed] || 1;
  const pace = ms => ms / speedK();
  function applyPace() {
    document.documentElement.style.setProperty('--pace', String(1 / speedK()));
    document.documentElement.classList.toggle('big', !!settings.bigText); // testo grande
  }
  applyPace();
  function speedHtml() {
    return `<div class="speed" role="group" aria-label="Velocità di gioco">${SPEED_OPTS.map(([v, ic, l]) =>
      `<button data-act="speed" data-v="${v}" aria-pressed="${settings.speed === v}" aria-label="Velocità ${l.toLowerCase()}" title="Velocità ${l.toLowerCase()}">${ic}</button>`).join('')}</div>`;
  }

  function saveSettings() { store('settings', settings); applySound(); applyPace(); }
  function applySound() {
    if (!window.Sound) return;
    Sound.setSfx(settings.sfx); Sound.setMusic(settings.music); Sound.setVibration(settings.vibration);
  }
  applySound();
  const sfx = (n, k) => { if (window.Sound) Sound.play(n, k); };

  const A = {
    screen: 'home', mode: 'cpu', level: load('level', 'normale'),
    names: load('names', ['Giocatore 1', 'Giocatore 2']),
    teams: [[], []], builder: 0, filter: 'all',
    game: null, setup: null, log: [], view: 0, me: 0, sel: null, busy: false, logOpen: false, banner: '', first: 0,
    tut: -1, on: null, toast: null,
    terrain: load('terrain', 'random'), weapons: [null, null],
  };

  // ------------------------------------------------------------ utilità
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const face = id => `background-image:url(${S.img('volti/' + id + '.jpg')})`;
  const RANK_SHORT = { A: 'Allievo', I: 'Istruttore', M: 'Maestro', L: 'Leggenda' };
  const LEVEL_LABEL = { facile: 'Facile', normale: 'Normale', difficile: 'Difficile' };

  // ------------------------------------------------------------ palestre (carte terreno) e armi
  const terrainBg = id => (S.TERRAIN[id] && window.Arena3D && Arena3D.terrainArt ? Arena3D.terrainArt(id) : '');
  // la palestra scelta (se sbloccata) o una a caso fra quelle sbloccate
  function pickTerrain(v) {
    if (S.TERRAIN[v] && !lockedAt('terrain', v)) return v;
    const ok = S.TERRAINS.filter(t => !lockedAt('terrain', t.id));
    return ok[Math.floor(Math.random() * ok.length)].id;
  }
  const randomWeapon = cards => ({ id: S.WEAPONS[Math.floor(Math.random() * S.WEAPONS.length)].id, card: cards[Math.floor(Math.random() * cards.length)] });
  function sanitizeWeapon(w, cards) {
    return w && typeof w === 'object' && S.WEAPON[w.id] && Array.isArray(cards) && cards.includes(w.card) ? { id: w.id, card: w.card } : null;
  }
  // l'arma resta a una carta della squadra: se quella carta esce, passa alla prima
  function fixWeapon(b) {
    if (A.weapons[b] && lockedAt('weapon', A.weapons[b].id)) A.weapons[b] = null; // arma non ancora sbloccata
    const w = A.weapons[b], t = A.teams[b];
    if (w && !t.includes(w.card)) w.card = t[0] || null;
  }
  function terrainCard(id) {
    const t = S.TERRAIN[id];
    return `<div class="terrain-card"><span class="art" style="background-image:url(${terrainBg(id)})"></span><div><div class="eyebrow">Carta terreno · ${esc(t.place)}</div><b>${esc(t.name)}</b><p>${esc(t.desc)}</p></div></div>`;
  }

  function moveMeta(m) {
    if (m.passive) return m.cd ? `Passiva · si ricarica in ${m.cd} turni` : 'Passiva';
    if (m.once) return 'Una volta per partita';
    if (m.free) return `Non usa il turno · ricarica ${m.cd} turni`;
    return m.cd ? `Ricarica ${m.cd} turn${m.cd > 1 ? 'i' : 'o'}` : '';
  }

  // ------------------------------------------------------------ carte segrete (easter egg)
  // Stanno cifrate in segreto.dat: senza la frase giusta nessuno può leggerle, nemmeno aprendo il codice.
  let secretOwned = false; // sbloccate su questo telefono (non solo prestate per una partita online)
  let secretKey = null;    // chiave (base64), da passare all'avversario online se le usi
  const shown = () => S.CARDS.filter(c => !c.secret || secretOwned);
  const normPhrase = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const toB64 = u8 => btoa(String.fromCharCode.apply(null, u8));
  const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  // opt: { phrase } oppure { key }; persist = sbloccate per sempre su questo telefono
  async function openSecret(opt) {
    if (!secretKey) {
      const buf = new Uint8Array(await (await fetch('segreto.dat')).arrayBuffer());
      if (String.fromCharCode.apply(null, buf.slice(0, 4)) !== 'STT1') throw new Error('segreto.dat non valido');
      const salt = buf.slice(4, 20), iv = buf.slice(20, 32);
      let raw = opt.key ? fromB64(opt.key) : null;
      if (!raw) {
        const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(normPhrase(opt.phrase || '')), 'PBKDF2', false, ['deriveBits']);
        raw = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, 256));
      }
      const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
      const pack = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, buf.slice(32))));
      const mod = { exports: null };
      new Function('module', pack.src)(mod);
      const p = mod.exports(S.H);
      S.addCards(p.cards);
      if (window.Arena3D) { Object.assign(Arena3D.MOVES, p.moves3d); Object.assign(Arena3D.LOOK, p.look); Object.assign(Arena3D.FACE, p.face || {}); }
      for (const k in pack.img) S.IMG[k] = URL.createObjectURL(new Blob([fromB64(pack.img[k])], { type: 'image/jpeg' }));
      secretKey = toB64(raw);
    }
    if (opt.persist) { secretOwned = true; store('chiave', secretKey); if (award('segreto')) toastQuick('🏅 Medaglia segreta: Custode del segreto'); }
  }
  const secretFor = ids => (secretKey && ids.some(id => S.CARD[id] && S.CARD[id].secret) ? secretKey : undefined);
  function secretPrompt() {
    openLayer(`<div class="overlay formula" role="dialog" aria-label="Pergamena segreta">
      <div class="eyebrow">Pergamena segreta</div>
      <h2>Pronuncia la parola</h2>
      <input id="segreto" autocomplete="off" autocapitalize="off" spellcheck="false">
      <p id="segreto-esito" aria-live="polite"></p>
      <button class="btn primary" data-act="egg-try">Svela</button>
      <button class="btn ghost" data-act="close">Chiudi</button>
    </div>`);
    setTimeout(() => { const i = document.getElementById('segreto'); if (i) i.focus(); }, 50);
  }

  // ------------------------------------------------------------ carte sbloccate
  const STARTERS = ['samuele', 'katya', 'niccolo', 'federica', 'grazia', 'vittorio', 'annastella', 'alessandro', 'viola', 'caterina'];
  // Le Leggende (i due Chen) si sbloccano solo vincendo il torneo
  const LEGENDS = S.CARDS.filter(c => c.rank === 'L').map(c => c.id);
  function unlocked() {
    if (settings.allUnlocked) return shown().map(c => c.id);
    let u = load('unlocked', STARTERS).filter(id => S.CARD[id]);
    if (u.length < S.TEAM_SIZE) u = STARTERS.slice();
    if ((torneo().titles || 0) > 0) u = u.concat(LEGENDS.filter(id => !u.includes(id)));
    if (secretOwned) u = u.concat(S.CARDS.filter(c => c.secret && !u.includes(c.id)).map(c => c.id));
    return u;
  }
  function unlockRandom(n) {
    if (settings.allUnlocked) return [];
    const have = unlocked();
    const locked = shown().map(c => c.id).filter(id => !have.includes(id) && !LEGENDS.includes(id));
    const got = [];
    while (got.length < n && locked.length) got.push(locked.splice(Math.floor(Math.random() * locked.length), 1)[0]);
    if (got.length) store('unlocked', have.concat(got));
    if (got.length && !shown().some(c => !c.secret && !LEGENDS.includes(c.id) && !have.concat(got).includes(c.id))) award('collezione');
    return got;
  }

  // ------------------------------------------------------------ classifica (su questo telefono)
  function stats() { return load('stats', { players: {}, cards: {} }); }
  function recordResult(g) {
    const st = stats();
    g.players.forEach((p, i) => {
      const key = p.cpu ? `Computer (${LEVEL_LABEL[p.cpu] || p.cpu})` : p.name;
      const r = st.players[key] || (st.players[key] = { w: 0, l: 0, cpu: !!p.cpu });
      if (g.winner === i) r.w++; else r.l++;
      p.cards.forEach(id => {
        const c = st.cards[id] || (st.cards[id] = { p: 0, w: 0 });
        c.p++; if (g.winner === i) c.w++;
      });
    });
    store('stats', st);
  }

  // ------------------------------------------------------------ torneo
  const TORNEO = [
    { name: 'Gli allievi del lunedì', level: 'facile', terrain: 'priula', weapon: { id: 'dagan', card: 'viola' }, cards: ['grazia', 'viola', 'annastella', 'caterina'], text: 'Si parte con calma: la classe dei principianti.' },
    { name: 'Il corso serale', level: 'normale', terrain: 'lancenigo', weapon: { id: 'dao', card: 'alessandro' }, cards: ['vittorio', 'alessandro', 'christian', 'adriano'], text: 'Dopo il lavoro, ma pieni di energia.' },
    { name: 'La squadra agonistica', level: 'difficile', terrain: 'priula', weapon: { id: 'qiang', card: 'lorenzo' }, cards: ['lorenzo', 'celeste', 'remigio', 'chicca'], text: 'Allenati per le gare: non regalano niente.' },
    { name: 'Gli istruttori', level: 'facile', terrain: 'liming', weapon: { id: 'shuangjian', card: 'samuele' }, cards: ['samuele', 'niccolo', 'strahinja', 'federica'], text: 'Tutti gli Istruttori insieme: chi insegna sa anche combattere.' },
    { name: 'Il Tempio dei Maestri', level: 'difficile', terrain: 'chenjiagou', weapon: { id: 'jian', card: 'andrea' }, cards: ['andrea', 'chen', 'katya'], boost: 1.1, text: 'La sfida finale: tre Maestri, più forti del solito. Chi vince sblocca le Leggende.' },
  ];
  const torneo = () => load('torneo', { stage: 0, titles: 0 });

  // ------------------------------------------------------------ effetti di stato
  function chipList(g, f, compact) {
    const out = [];
    const d = s => (s.perm ? '' : ` ${s.dur}`);
    for (const s of f.st) {
      const v = s.value;
      switch (s.type) {
        case 'stun': out.push(['bad', compact ? `Stord.${d(s)}` : `Stordimento${d(s)}`]); break;
        case 'block': out.push(['bad', compact ? `Blocc.${d(s)}` : `Tecniche bloccate${d(s)}`]); break;
        case 'confuse': out.push(['bad', compact ? `Conf.${d(s)}` : `Confusione${d(s)} (${Math.round(v * 100)}%)`]); break;
        case 'dot': out.push(['bad', `−${v}/t${d(s)}`]); break;
        case 'defZero': out.push(['bad', `DEF 0${d(s)}`]); break;
        case 'atkAdd': out.push([v > 0 ? 'good' : 'bad', `ATK ${v > 0 ? '+' : ''}${v}${d(s)}`]); break;
        case 'defAdd': out.push([v > 0 ? 'good' : 'bad', `DEF ${v > 0 ? '+' : ''}${v}${d(s)}`]); break;
        case 'atkMul': out.push([v > 1 ? 'good' : 'bad', `ATK ×${+v.toFixed(2)}${d(s)}`]); break;
        case 'defMul': out.push([v > 1 ? 'good' : 'bad', `DEF ×${+v.toFixed(2)}${d(s)}`]); break;
        case 'invuln': out.push(['good', compact ? `Invuln.${d(s)}` : `Invulnerabilità${d(s)}`]); break;
        case 'evade': out.push(['good', `Schiva${d(s)}`]); break;
        case 'counter': out.push(['good', compact ? `Dadi${d(s)}` : `Contrattacco pronto${d(s)}`]); break;
        case 'hidden': out.push(['good', `Sparizione${d(s)}`]); break;
        case 'immune': out.push(['good', `Immunità${d(s)}`]); break;
        case 'nextAtkMul': out.push(['good', `Colpo ×${v}`]); break;
        case 'feint': out.push(['good', 'Finta']); break;
        case 'dmgOut': out.push(['good', `Danni ×${v}${d(s)}`]); break;
        case 'dmgIn': out.push(['bad', `Subisce ×${v}${d(s)}`]); break;
        case 'stunGuard': if (!compact) out.push(['info', `Non stordibile${d(s)}`]); break;
        case 'vibrOff': if (!compact) out.push(['info', `Vibrazione spenta${d(s)}`]); break;
        case 'reflect': out.push(['good', compact ? `Respinge${d(s)}` : `Respinge i colpi ×2${d(s)}`]); break;
        case 'swap': out.push(['bad', compact ? `ATK⇄DEF${d(s)}` : `ATK e DEF invertiti${d(s)}`]); break;
      }
    }
    if (f.card === 'adriano' && !f.form && !f.st.some(s => s.type === 'vibrOff')) out.push(['info', compact ? 'Immune' : 'Vibrazione: immune']);
    if (f.card === 'celeste' && !f.form && f.cds[1] === 0) out.push(['info', compact ? 'Eterea' : 'Presenza eterea pronta']);
    if (f.form) out.push(['info', compact ? `= ${S.CARD[f.form].name.split(' ')[0]}` : `Trasformata in ${S.CARD[f.form].name}`]);
    if (compact && out.length > 3) return out.slice(0, 2).concat([['', `+${out.length - 2}`]]);
    return out;
  }
  const chipsHtml = list => list.map(([c, t]) => `<span class="chip ${c}">${esc(t)}</span>`).join('');

  // ------------------------------------------------------------ router
  function go(screen) { A.screen = screen; closeLayer(); render(); window.scrollTo(0, 0); if (screen === 'account') accountLoad(); }
  function render() {
    const fn = {
      home: renderHome, setup: renderSetup, build: renderBuild, battle: renderBattle, collection: renderCollection,
      rules: renderRules, ranking: renderRanking, settings: renderSettings, torneo: renderTorneo, online: renderOnline, live: renderLive, missioni: renderMissioni, medaglie: renderMedaglie,
      account: renderAccount,
    }[A.screen];
    $app.innerHTML = fn();
    // in partita, sullo sfondo, la palestra in cui si combatte
    const ter = A.screen === 'battle' && A.game && A.game.terrain;
    document.body.style.setProperty('--terrain', ter ? `url(${terrainBg(ter)})` : 'none');
    if (A.screen === 'online') focusOnline();
  }

  // ------------------------------------------------------------ HOME
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (A.screen === 'home') render(); });
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = (() => { try { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone; } catch (e) { return false; } })();

  function renderHome() {
    const ids = unlocked().slice().sort(() => Math.random() - 0.5).slice(0, 5);
    const save = load('save', null);
    const tutDone = load('tutorial', false);
    const t = torneo();
    const nUnl = unlocked().length;
    return `<div class="home">
      <div class="hero">
        <img src="img/retro.jpg" alt="Retro delle carte Stone Temple Tao" data-act="egg">
        <div>
          <div class="eyebrow">Scuola di Tradizionali Arti Orientali</div>
          <h1>Stone Temple Cards Game</h1>
          <p>Il torneo di carte della palestra: ${shown().length} combattenti, 3 contro 3, una riserva a testa.</p>
        </div>
      </div>
      <div class="fan" aria-hidden="true">${ids.map((id, i) => `<img src="${S.img(id + '.jpg')}" alt="" style="transform:rotate(${(i - 2) * 7}deg) translateY(${Math.abs(i - 2) * 8}px)">`).join('')}</div>
      <div class="menu">
        ${cloudOn() ? `<button class="btn acc-btn ${Cloud.signedIn() ? '' : 'primary'}" data-act="go" data-v="account">${accountLabel()}</button>` : ''}
        ${save ? `<button class="btn primary" data-act="resume">Riprendi partita · turno ${Math.ceil(save.turnNo / 2)}</button>` : ''}
        ${!tutDone ? `<button class="btn ${save ? '' : 'primary'}" data-act="tutorial">Prima volta? Fai il tutorial</button>` : ''}
        <button class="btn ${save || !tutDone ? '' : 'primary'}" data-act="mode" data-v="cpu">Sfida il computer</button>
        <button class="btn" data-act="go" data-v="live">🏆 Torneo dal vivo<small>4 o 8 giocatori, tabellone sul telefono di chi organizza</small></button>
        <button class="btn" data-act="go" data-v="torneo">Torneo · incontro ${Math.min(t.stage + 1, 5)} di 5${t.titles ? ` · 🏆 ${t.titles}` : ''}</button>
        <div class="menu-2">
          <button class="btn" data-act="mode" data-v="pvp">2 giocatori<small>stesso telefono</small></button>
          <button class="btn" data-act="go" data-v="online">Online<small>due telefoni</small></button>
        </div>
        <div class="menu-2">
          <button class="btn ghost" data-act="go" data-v="collection">Carte<small>${nUnl}/${shown().length} sbloccate</small></button>
          <button class="btn ghost" data-act="go" data-v="ranking">Classifica</button>
        </div>
        <div class="menu-2">
          <button class="btn ${readyMissions() ? 'primary' : ''}" data-act="go" data-v="missioni">🎯 Missioni<small>${readyMissions() ? `${readyMissions()} premi da riscuotere` : `livello ${myLevel()}`}</small></button>
          <button class="btn" data-act="go" data-v="medaglie">🏅 Medaglie<small>${MEDALS.filter(x => myMedals()[x.id]).length}/${MEDALS.length}</small></button>
        </div>
        <div class="menu-2">
          <button class="btn ghost" data-act="go" data-v="rules">Regole</button>
          <button class="btn ghost" data-act="go" data-v="settings">Impostazioni</button>
        </div>
        ${!standalone && installEvt ? '<button class="btn ghost" data-act="install">Installa come app</button>' : ''}
        ${!standalone && !installEvt && isIOS && window.top === window ? '<p class="hint">Per installarla: tocca Condividi e poi "Aggiungi alla schermata Home".</p>' : ''}
      </div>
      <p class="footnote">Partita media: 5–10 minuti · Squadra da 4 carte e 10 Punti Dojo</p>
    </div>`;
  }

  // ------------------------------------------------------------ SETUP
  function renderSetup() {
    const cpu = A.mode === 'cpu';
    return `<div class="topbar"><button class="back" data-act="go" data-v="home">← Menu</button><div class="eyebrow">${cpu ? 'Contro il computer' : '2 giocatori'}</div></div>
    <div class="setup">
      <h2>${cpu ? 'Scegli la sfida' : 'Chi combatte?'}</h2>
      ${cpu ? `
        <div class="eyebrow">Difficoltà del computer</div>
        <div class="seg" role="group" aria-label="Difficoltà">
          ${['facile', 'normale', 'difficile'].map(l => `<button data-act="level" data-v="${l}" aria-pressed="${A.level === l}">${l}</button>`).join('')}
        </div>
        <label class="field-label" for="n0"><span class="eyebrow">Il tuo nome</span><input id="n0" maxlength="16" value="${esc(A.names[0])}"></label>
      ` : `
        <label class="field-label" for="n0"><span class="eyebrow">Giocatore 1</span><input id="n0" maxlength="16" value="${esc(A.names[0])}"></label>
        <label class="field-label" for="n1"><span class="eyebrow">Giocatore 2</span><input id="n1" maxlength="16" value="${esc(A.names[1])}"></label>
      `}
      ${terrainPicker()}
      <p class="hint" style="text-align:left">Ognuno sceglie 4 carte spendendo al massimo ${S.BUDGET} Punti Dojo: le prime 3 vanno in campo, la quarta resta in riserva ed entra quando una tua carta va K.O.</p>
      <button class="btn primary" data-act="to-build">Scegli la squadra →</button>
    </div>`;
  }

  function terrainPicker() {
    const opts = [{ id: 'random', name: 'A sorte', place: 'Una palestra a caso', desc: "Si scopre all'inizio della sfida." }].concat(S.TERRAINS);
    const sel = opts.find(o => o.id === A.terrain) || opts[0];
    return `<div class="eyebrow">Dove si combatte?</div>
      <div class="terrains">${opts.map(o => `<button class="terrain" data-act="terrain" data-v="${o.id}" aria-pressed="${sel.id === o.id}">
        <span class="art" ${o.id === 'random' ? '' : `style="background-image:url(${terrainBg(o.id)})"`}>${o.id === 'random' ? '🎲' : lockedAt('terrain', o.id) ? `<span class="lock-lv">🔒 Liv. ${lockedAt('terrain', o.id)}</span>` : ''}</span>
        <span class="tn">${esc(o.name)}</span><span class="tp">${esc(o.place)}</span></button>`).join('')}</div>
      <p class="hint" style="text-align:left"><b>${esc(sel.name)}</b> · ${esc(sel.desc)}</p>`;
  }

  // ------------------------------------------------------------ COSTRUZIONE SQUADRA
  function builderTitle() {
    if (A.mode === 'torneo') return `Torneo · incontro ${torneo().stage + 1}`;
    if (A.mode === 'online') return 'La tua squadra';
    return `Squadra di ${esc(A.names[A.builder])}`;
  }
  function synergyList(team) {
    const active = S.synergiesFor(team).map(x => x.id);
    return `<div class="syn">${S.SYNERGIES.map(x => `<div class="syn-row ${active.includes(x.id) ? 'on' : ''}"><b>${active.includes(x.id) ? '✓ ' : ''}${esc(x.name)}</b><span>${esc(x.desc)}</span></div>`).join('')}</div>`;
  }
  function weaponBox() {
    const team = A.teams[A.builder], w = A.weapons[A.builder];
    const opts = ['<option value="">Nessuna arma</option>'].concat(S.WEAPONS.map(x => { const l = lockedAt('weapon', x.id); return `<option value="${x.id}" ${w && w.id === x.id ? 'selected' : ''} ${l ? 'disabled' : ''}>${l ? `🔒 ${esc(x.name)} · livello ${l}` : `${esc(x.name)} · ${esc(x.cn)}`}</option>`; })).join('');
    const who = team.map(id => `<option value="${id}" ${w && w.card === id ? 'selected' : ''}>${esc(S.CARD[id].name)}</option>`).join('');
    return `<div class="weapon-box"><div class="eyebrow">⚔️ Arma della squadra</div>
      <div class="wrow"><select data-change="weapon" aria-label="Arma">${opts}</select>
      <select data-change="weapon-card" aria-label="Chi porta l'arma" ${w && team.length ? '' : 'disabled'}>${who || '<option>Prima scegli le carte</option>'}</select></div>
      <p class="hint" style="text-align:left">${w ? esc(S.WEAPON[w.id].desc) : "Una carta della squadra può portare un'arma dello stile Chen. Non costa Punti Dojo."}</p></div>`;
  }
  function renderBuild() {
    fixWeapon(A.builder);
    const team = A.teams[A.builder];
    const cost = S.teamCost(team);
    const pool = unlocked();
    const pips = Array.from({ length: S.BUDGET }, (_, i) => `<i class="${i < cost ? (cost > S.BUDGET ? 'over' : 'on') : ''}"></i>`).join('');
    const slots = [0, 1, 2, 3].map(i => {
      const id = team[i];
      const who = i < 3 ? `Campo ${i + 1}` : 'Riserva';
      if (!id) return `<button class="slot ${i === 3 ? 'res' : ''}" aria-label="${who} vuoto" disabled><span class="who">${who}</span></button>`;
      return `<button class="slot ${i === 3 ? 'res' : ''}" data-act="unpick" data-v="${i}" aria-label="Togli ${esc(S.CARD[id].name)}"><span class="who">${who}</span><span class="face" style="${face(id)}"></span><span class="nm">${esc(S.CARD[id].name)}</span></button>`;
    }).join('');
    const filters = [['all', 'Tutti'], ['M', 'Maestri'], ['I', 'Istruttori'], ['A', 'Allievi']];
    const cards = shown().filter(c => A.filter === 'all' || c.rank === A.filter).map(c => {
      const locked = !pool.includes(c.id);
      const chosen = team.includes(c.id);
      const nope = !chosen && (locked || team.length >= S.TEAM_SIZE || cost + c.cost > S.BUDGET);
      return `<div class="pick ${chosen ? 'chosen' : ''} ${nope ? 'nope' : ''} ${locked ? 'locked' : ''} ${variantOf(c.id)}" role="button" tabindex="0" data-act="pick" data-v="${c.id}" aria-label="${esc(c.name)}, costo ${c.cost}${locked ? ', da sbloccare' : ''}">
        <span class="face" style="${face(c.id)}"></span>
        <span class="rank ${c.rank}">${RANK_SHORT[c.rank]}</span>
        <span class="cost num">${c.cost}</span>
        ${locked ? '<span class="lock">🔒</span>' : ''}
        <span class="meta"><span class="nm">${esc(c.name)}</span><span class="st num">PV ${c.hp} · ATK ${c.atk} · DEF ${c.def}</span></span>
        <span class="info-dot" data-act="card" data-v="${c.id}" aria-label="Dettagli ${esc(c.name)}">i</span>
      </div>`;
    }).join('');
    const opp = A.mode === 'torneo' ? TORNEO[torneo().stage] : null;
    return `<div class="topbar"><button class="back" data-act="build-back">← Indietro</button><div class="eyebrow">${builderTitle()}</div></div>
    <div class="builder">
      ${opp ? `<div class="vs-card"><div class="eyebrow">Avversario · ${LEVEL_LABEL[opp.level]} · ${esc(S.TERRAIN[opp.terrain].name)}</div><b>${esc(opp.name)}</b><div class="faces-row">${opp.cards.map(id => `<i style="${face(id)}" title="${esc(S.CARD[id].name)}"></i>`).join('')}</div></div>` : ''}
      <div class="slots">${slots}</div>
      <div class="budget num"><span>Punti Dojo</span><div class="pips">${pips}</div><span>${cost}/${S.BUDGET}</span></div>
      ${weaponBox()}
      <details class="syn-box"><summary>Sinergie di squadra (${S.synergiesFor(team).length} attive)</summary>${synergyList(team)}</details>
      <div class="filters" role="group" aria-label="Filtra per grado">${filters.map(([v, l]) => `<button data-act="filter" data-v="${v}" aria-pressed="${A.filter === v}">${l}</button>`).join('')}</div>
      ${pool.length < shown().length ? `<p class="hint" style="text-align:left">🔒 ${shown().length - pool.length} carte da sbloccare: ogni vittoria ne sblocca una.</p>` : ''}
      <div class="pool">${cards}</div>
    </div>
    <div class="dock"><div class="row">
      <button class="btn" data-act="random-team">Casuale</button>
      <button class="btn primary" data-act="confirm-team" ${team.length === S.TEAM_SIZE && cost <= S.BUDGET ? '' : 'disabled'}>${team.length === S.TEAM_SIZE ? 'Conferma' : `Scegli ${S.TEAM_SIZE - team.length} cart${S.TEAM_SIZE - team.length === 1 ? 'a' : 'e'}`}</button>
    </div></div>`;
  }

  // ------------------------------------------------------------ DETTAGLIO CARTA
  function cardSheet(id) {
    const c = S.CARD[id];
    const diff = (k) => c.orig[k] !== c[k] ? `<s class="num">${c.orig[k]}</s> ` : '';
    const locked = !unlocked().includes(id);
    const st = stats().cards[id];
    openLayer(`<div class="sheet-wrap" data-act="close"><div class="sheet" role="dialog" aria-label="${esc(c.name)}" data-stop>
      <div class="sheet-head"><div><h3>${esc(c.name)}${locked ? ' 🔒' : ''}</h3><p>${esc(c.title || RANK_SHORT[c.rank])} · costo ${c.cost} Punti Dojo${st ? ` · vinte ${st.w} su ${st.p}` : ''}</p></div></div>
      ${locked ? `<p class="hint" style="text-align:left">${c.rank === 'L' ? 'Leggenda: si sblocca vincendo il torneo.' : 'Carta da sbloccare: vinci una partita per ottenerne una nuova.'}</p>` : ''}
      <div class="statline num"><span>PV <b>${c.hp}</b></span><span>ATK ${diff('atk')}<b>${c.atk}</b></span><span>DEF ${diff('def')}<b>${c.def}</b></span></div>
      ${c.moves.map(m => `<div class="move special"><div class="mh"><span class="mn">${esc(m.name)}</span><span class="why">${esc(moveMeta(m))}</span></div><div class="md">${esc(m.desc)}</div></div>`).join('')}
      <div class="card-full"><img src="${S.img(id + '.jpg')}" alt="Carta originale di ${esc(c.name)}"></div>
      <p class="hint">Carta originale. In gioco valgono i valori scritti sopra (i numeri barrati sono quelli stampati).</p>
      <button class="btn" data-act="close">Chiudi</button>
    </div></div>`);
  }

  // ------------------------------------------------------------ COLLEZIONE
  function renderCollection() {
    const pool = unlocked();
    return `<div class="topbar"><button class="back" data-act="go" data-v="home">← Menu</button><div class="eyebrow">${pool.length}/${shown().length} sbloccate</div></div>
    <h2 style="margin-bottom:12px">Collezione</h2>
    <div class="collection">${shown().map(c => { const lk = !pool.includes(c.id); return `<div class="pick ${lk ? 'locked' : ''} ${variantOf(c.id)}" role="button" tabindex="0" data-act="card" data-v="${c.id}">
      <span class="face" style="${face(c.id)}"></span><span class="rank ${c.rank}">${RANK_SHORT[c.rank]}</span><span class="cost num">${c.cost}</span>${lk ? '<span class="lock">🔒</span>' : ''}
      <span class="meta"><span class="nm">${esc(c.name)}</span><span class="st num">PV ${c.hp} · ATK ${c.atk} · DEF ${c.def}</span></span></div>`; }).join('')}</div>
    <h3 class="sec">Palestre</h3>
    <div class="coll-list">${S.TERRAINS.map(t => terrainCard(t.id)).join('')}</div>
    <h3 class="sec">Armi</h3>
    <div class="coll-list">${S.WEAPONS.map(w => `<div class="weapon-row"><b>⚔️ ${esc(w.name)}</b><small>${esc(w.cn)}</small><p>${esc(w.desc)}</p></div>`).join('')}</div>`;
  }

  // ------------------------------------------------------------ CLASSIFICA
  function renderRanking() {
    const st = stats();
    const players = Object.entries(st.players).map(([n, r]) => ({ n, ...r, t: r.w + r.l })).sort((a, b) => b.w - a.w || (b.w / b.t) - (a.w / a.t));
    const cards = Object.entries(st.cards).filter(([id]) => S.CARD[id]).map(([id, r]) => ({ id, ...r, pct: r.w / r.p })).sort((a, b) => b.pct - a.pct || b.p - a.p);
    const pct = (w, t) => t ? Math.round(100 * w / t) + '%' : '—';
    return `<div class="topbar"><button class="back" data-act="go" data-v="home">← Menu</button><div class="eyebrow">Su questo telefono</div></div>
    <div class="rank-page">
      <h2>Classifica</h2>
      <button class="btn" data-act="go" data-v="account">🌍 Classifica generale</button>
      <h3 class="sec">Giocatori</h3>
      ${players.length ? `<table class="board num"><thead><tr><th>#</th><th>Nome</th><th>V</th><th>S</th><th>%</th></tr></thead><tbody>
        ${players.map((p, i) => `<tr class="${p.cpu ? 'cpu' : ''}"><td>${i + 1}</td><td>${esc(p.n)}</td><td>${p.w}</td><td>${p.l}</td><td>${pct(p.w, p.t)}</td></tr>`).join('')}
      </tbody></table>` : '<p class="hint" style="text-align:left">Ancora nessuna partita giocata su questo telefono.</p>'}
      <h3 class="sec">Carte più vincenti</h3>
      ${cards.length ? `<div class="card-rank">${cards.map(c => `<div class="cr-row"><i style="${face(c.id)}"></i><span>${esc(S.CARD[c.id].name)}</span><b class="num">${pct(c.w, c.p)}</b><small class="num">${c.w}/${c.p}</small></div>`).join('')}</div>` : '<p class="hint" style="text-align:left">Gioca qualche partita per vedere quali carte vincono di più.</p>'}
      <p class="hint" style="text-align:left">La classifica conta le partite giocate su questo telefono, comprese quelle online.</p>
      ${players.length ? '<button class="btn ghost" data-act="reset-stats">Azzera classifica</button>' : ''}
    </div>`;
  }

  // ------------------------------------------------------------ IMPOSTAZIONI
  function renderSettings() {
    const seg = (key, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button data-act="set" data-k="${key}" data-v="${v}" aria-pressed="${String(settings[key]) === String(v)}">${l}</button>`).join('')}</div>`;
    const yn = key => seg(key, [[true, 'Sì'], [false, 'No']]);
    return `<div class="topbar"><button class="back" data-act="go" data-v="home">← Menu</button><div class="eyebrow">Impostazioni</div></div>
    <div class="setup">
      <h2>Impostazioni</h2>
      <div class="eyebrow">Velocità di gioco</div>${seg('speed', SPEED_OPTS.map(([v, ic, l]) => [v, `${ic} ${l}`]))}
      <p class="hint" style="text-align:left">Si cambia anche durante la partita, con i tasti in alto a destra.</p>
      <div class="eyebrow">Testo grande</div>${yn('bigText')}
      <p class="hint" style="text-align:left">Ingrandisce scritte e pulsanti, per chi legge meglio così.</p>
      <div class="eyebrow">Animazioni 3D</div>${seg('anim', [['full', 'Sì'], ['off', 'No']])}
      <div class="eyebrow">Effetti sonori</div>${yn('sfx')}
      <div class="eyebrow">Musica</div>${yn('music')}
      <div class="eyebrow">Vibrazione</div>${yn('vibration')}
      <div class="eyebrow">Eventi in palestra</div>${yn('events')}
      <p class="hint" style="text-align:left">Ogni 3 round capita qualcosa in palestra (lezione extra, aria condizionata rotta…) che vale per entrambe le squadre.</p>
      <div class="eyebrow">Carte effetto</div>${yn('effectCards')}
      <p class="hint" style="text-align:left">Ogni giocatore pesca 2 carte effetto (pausa acqua, kiai…) da usare una volta durante la sfida.</p>
      <div class="eyebrow">Tutte le carte sbloccate</div>${yn('allUnlocked')}
      <p class="hint" style="text-align:left">Utile per le serate in palestra: tutti possono usare tutte le carte subito.</p>
      <button class="btn ghost" data-act="replay-tutorial">Rifai il tutorial</button>
      <button class="btn ghost" data-act="reset-progress">Azzera progressi (carte, torneo)</button>
    </div>`;
  }

  // ------------------------------------------------------------ TORNEO
  function renderTorneo() {
    const t = torneo();
    return `<div class="topbar"><button class="back" data-act="go" data-v="home">← Menu</button><div class="eyebrow">Torneo${t.titles ? ` · 🏆 ${t.titles}` : ''}</div></div>
    <div class="setup">
      <h2>Torneo del Tempio</h2>
      <p class="hint" style="text-align:left">Cinque incontri contro squadre sempre più forti. Se perdi puoi ritentare l'incontro. Ogni vittoria sblocca una carta; il primo titolo sblocca anche le Leggende (Chen Wangting e Chen Zhenglei).</p>
      <ol class="ladder">${TORNEO.map((o, i) => `<li class="${i < t.stage ? 'done' : i === t.stage ? 'now' : ''}">
        <div class="lad-head"><span class="num">${i + 1}</span><b>${esc(o.name)}</b><em>${LEVEL_LABEL[o.level]}</em></div>
        <div class="lad-body"><div class="faces-row">${o.cards.map(id => `<i style="${face(id)}"></i>`).join('')}</div><small>${esc(o.text)}</small></div>
      </li>`).join('')}</ol>
      <button class="btn primary" data-act="torneo-go">Combatti l'incontro ${t.stage + 1}</button>
      ${t.stage > 0 ? '<button class="btn ghost" data-act="torneo-reset">Ricomincia il torneo</button>' : ''}
    </div>`;
  }

  // ------------------------------------------------------------ TORNEO DAL VIVO (serata in palestra)
  // Tabellone a eliminazione diretta per 4 o 8 persone. Ogni incontro si gioca qui (in 2 sullo stesso
  // telefono) oppure altrove, segnando a mano chi ha vinto. Salvato sul telefono.
  const ROUND_NAMES = { 1: 'Finale', 2: 'Semifinali', 4: 'Quarti di finale' };
  const live = () => load('live', null);
  // ricostruisce i turni successivi dai vincitori, tenendo i risultati già validi
  function liveRebuild(L) {
    for (let r = 1; r < L.rounds.length; r++) {
      const prev = L.rounds[r - 1];
      L.rounds[r] = L.rounds[r].map((m, i) => {
        const a = prev[2 * i].w || null, b = prev[2 * i + 1].w || null;
        return m.a === a && m.b === b ? m : { a, b, w: null };
      });
    }
    const fin = L.rounds[L.rounds.length - 1][0];
    L.champion = fin.w || null;
    return L;
  }
  function liveNew(names) {
    const p = names.slice().sort(() => Math.random() - 0.5);
    const rounds = [];
    let n = p.length / 2;
    rounds.push(Array.from({ length: n }, (_, i) => ({ a: p[2 * i], b: p[2 * i + 1], w: null })));
    while ((n /= 2) >= 1) rounds.push(Array.from({ length: n }, () => ({ a: null, b: null, w: null })));
    return { rounds, champion: null };
  }
  function renderLive() {
    const L = live();
    const top = `<div class="topbar"><button class="back" data-act="go" data-v="home">← Menu</button><div class="eyebrow">Serata in palestra</div></div>`;
    if (!L) {
      const size = A.liveSize || 8, names = load('liveNames', []);
      return `${top}<div class="setup"><h2>Torneo dal vivo</h2>
        <p class="hint" style="text-align:left">Scrivi i nomi dei partecipanti: l'app li mescola e prepara il tabellone. Ogni incontro si gioca su questo telefono o altrove, segnando chi ha vinto.</p>
        <div class="eyebrow">Quanti giocatori?</div>
        <div class="seg" role="group">${[4, 8].map(n => `<button data-act="live-size" data-v="${n}" aria-pressed="${size === n}">${n}</button>`).join('')}</div>
        <div class="live-names">${Array.from({ length: size }, (_, i) => `<input id="ln${i}" maxlength="16" placeholder="Giocatore ${i + 1}" value="${esc(names[i] || '')}" aria-label="Giocatore ${i + 1}">`).join('')}</div>
        <button class="btn primary" data-act="live-start">Mescola e crea il tabellone</button></div>`;
    }
    const rounds = L.rounds.map((round, r) => `<h3 class="sec">${ROUND_NAMES[round.length]}</h3><div class="lm-list">${round.map((m, i) => {
      const ready = m.a && m.b;
      const locked = r + 1 < L.rounds.length && L.rounds[r + 1][i >> 1].w; // il turno dopo è già stato giocato
      const row = who => `<div class="lm-row ${who && m.w === who ? 'win' : ''} ${who && m.w && m.w !== who ? 'lose' : ''}">${who ? esc(who) : '<i>in attesa</i>'}${who && m.w === who ? ' 🏆' : ''}</div>`;
      return `<div class="lm">${row(m.a)}<div class="lm-vs">contro</div>${row(m.b)}
        ${ready && !locked ? `<div class="lm-btns">${m.w ? '<span class="lm-fix">Correggi:</span>' : `<button class="btn small primary" data-act="live-play" data-r="${r}" data-i="${i}">Gioca qui</button>`}
          <button class="btn small" data-act="live-win" data-r="${r}" data-i="${i}" data-v="a">Vince ${esc(m.a.split(' ')[0])}</button>
          <button class="btn small" data-act="live-win" data-r="${r}" data-i="${i}" data-v="b">Vince ${esc(m.b.split(' ')[0])}</button></div>` : ''}</div>`;
    }).join('')}</div>`).join('');
    return `${top}<div class="setup"><h2>Torneo dal vivo</h2>
      ${L.champion ? `<div class="champion" role="status"><div class="trophy">🏆</div><div class="eyebrow">Campione della serata</div><b>${esc(L.champion)}</b></div>` : ''}
      ${rounds}
      <button class="btn ghost" data-act="live-reset">${L.champion ? 'Nuovo torneo' : 'Annulla il torneo'}</button></div>`;
  }
  function liveResult(r, i, winner) {
    const L = live();
    if (!L) return;
    L.rounds[r][i].w = winner;
    liveRebuild(L);
    store('live', L);
    if (L.champion) { sfx('win'); if (window.Sound) Sound.buzz([80, 40, 80, 40, 200]); }
  }

  // ------------------------------------------------------------ PROGRESSI: livelli, premi, carte speciali, medaglie, missioni
  // Con l'account i punti stanno online; senza, sul telefono (stessa tabella dei punti).
  const XP_WIN = { facile: 20, normale: 30, difficile: 45 };
  const xpFor = (mode, level, win) => (!win ? 10 : mode === 'online' ? 50 : mode === 'torneo' ? 40 : mode === 'tutorial' ? 10 : XP_WIN[level] || 20);
  const lv = xp => Math.floor(Math.sqrt(Math.max(0, xp) / 25)) + 1;
  const lvXp = l => 25 * (l - 1) * (l - 1);
  const signedIn = () => cloudOn() && Cloud.signedIn();
  function myXp() { if (signedIn()) { const p = load('profilo', null); return p ? p.xp : 0; } return load('xp_locale', 0); }
  const myLevel = () => lv(myXp());
  // da quale parte del tavolo sta chi tiene il telefono (in 2 sullo stesso telefono e nei replay: nessuna)
  const mySide = () => (A.mode === 'online' ? A.me : (A.mode === 'pvp' || A.mode === 'replay' ? -1 : 0));

  // premi di livello: armi e palestre in più (le altre ci sono da subito)
  const REWARDS = [
    { lv: 2, weapon: 'shuangjian' }, { lv: 3, weapon: 'qiang' }, { lv: 4, terrain: 'liming' },
    { lv: 5, weapon: 'shuangdao' }, { lv: 6, weapon: 'dadao' }, { lv: 8, terrain: 'chenjiagou' },
  ];
  const rewardName = r => (r.weapon ? `l'arma ${S.WEAPON[r.weapon].name}` : `la palestra ${S.TERRAIN[r.terrain].name}`);
  function lockedAt(kind, id) {
    if (settings.allUnlocked) return 0;
    const r = REWARDS.find(x => x[kind] === id);
    return r && myLevel() < r.lv ? r.lv : 0;
  }
  // dopo aver guadagnato punti: livello nuovo e premi sbloccati
  function levelUp(before, after) {
    const a = lv(before), b = lv(after);
    if (b <= a) return '';
    const got = REWARDS.filter(r => r.lv > a && r.lv <= b && !settings.allUnlocked).map(rewardName);
    sfx('win');
    return `<div class="unlock"><div class="eyebrow">Livello ${b}!</div><p>${got.length ? `Hai sbloccato ${esc(got.join(' e '))}.` : 'Sali ancora per nuovi premi.'}</p></div>`;
  }
  function addLocalXp(n) { const before = load('xp_locale', 0); store('xp_locale', before + n); return levelUp(before, before + n); }

  // carte dorate (5 vittorie con la carta in squadra) e olografiche (15)
  const variantOf = id => { const w = load('vittorie_carte', {})[id] || 0; return w >= 15 ? 'olo' : w >= 5 ? 'oro' : ''; };
  const VARIANT_NAME = { oro: 'dorata', olo: 'olografica' };

  // medaglie
  const MEDALS = [
    { id: 'prima', e: '🥇', name: 'Prima vittoria', desc: 'Vinci una sfida.' },
    { id: 'dieci', e: '🎖️', name: 'Dieci vittorie', desc: 'Vinci 10 sfide.' },
    { id: 'cinquanta', e: '🏵️', name: 'Cinquanta vittorie', desc: 'Vinci 50 sfide.' },
    { id: 'campione', e: '🏆', name: 'Campione del Tempio', desc: 'Vinci il torneo del Tempio.' },
    { id: 'leggenda', e: '🐉', name: 'Leggendario', desc: 'Vinci con una Leggenda in squadra.' },
    { id: 'intatto', e: '🛡️', name: 'Imbattuto', desc: 'Vinci senza perdere nessuna carta.' },
    { id: 'rimonta', e: '🔥', name: 'Rimonta', desc: 'Vinci con una sola carta rimasta.' },
    { id: 'doppiok', e: '💥', name: 'Doppio K.O.', desc: 'Manda K.O. due carte con una sola mossa.' },
    { id: 'difficile', e: '🧠', name: 'Più forte del computer', desc: 'Batti il computer a livello difficile.' },
    { id: 'online', e: '📡', name: 'Sfida a distanza', desc: 'Vinci una sfida online.' },
    { id: 'palestre', e: '🗺️', name: 'Giramondo', desc: 'Vinci in tutte e 4 le palestre.' },
    { id: 'armi', e: '⚔️', name: "Maestro d'armi", desc: 'Vinci con ognuna delle 8 armi.' },
    { id: 'effetti', e: '🃏', name: 'Asso nella manica', desc: 'Usa 10 carte effetto.' },
    { id: 'oro', e: '✨', name: "Carta d'oro", desc: 'Rendi dorata una carta (5 vittorie con lei).' },
    { id: 'collezione', e: '📚', name: 'Collezionista', desc: 'Sblocca tutte le carte.' },
    { id: 'fedele', e: '📅', name: 'Fedele al Tempio', desc: 'Gioca in 7 giorni diversi.' },
    { id: 'segreto', e: '🗝️', name: 'Custode del segreto', desc: 'Scopri le carte segrete.', hidden: true },
  ];
  const myMedals = () => load('medaglie', {});
  function award(id) {
    const m = myMedals();
    if (m[id]) return null;
    m[id] = dayKey(); store('medaglie', m);
    if (signedIn()) Cloud.addMedals([id]).catch(() => { /* alla prossima sincronizzazione */ });
    return MEDALS.find(x => x.id === id);
  }
  async function syncMedals() {
    try {
      const remote = await Cloud.medals(), m = myMedals();
      remote.forEach(id => { if (!m[id] && MEDALS.some(x => x.id === id)) m[id] = dayKey(); });
      store('medaglie', m);
      await Cloud.addMedals(Object.keys(m).filter(id => !remote.includes(id)));
    } catch (e) { /* offline o aggiornamento del database non ancora fatto */ }
  }

  // missioni: 3 al giorno e 2 a settimana, scelte dalla data (uguali per tutti)
  const DAILY = [
    { id: 'g-vinci2', text: 'Vinci 2 sfide', need: 2, add: s => (s.win ? 1 : 0) },
    { id: 'g-gioca3', text: 'Gioca 3 sfide', need: 3, add: () => 1 },
    { id: 'g-speciali5', text: 'Usa 5 mosse speciali', need: 5, add: s => s.specials },
    { id: 'g-ko4', text: 'Manda K.O. 4 carte avversarie', need: 4, add: s => s.kos },
    { id: 'g-allievi', text: 'Vinci con almeno 2 Allievi in squadra', need: 1, add: s => (s.win && s.allievi >= 2 ? 1 : 0) },
    { id: 'g-arma', text: "Vinci con un'arma in squadra", need: 1, add: s => (s.win && s.weapon ? 1 : 0) },
    { id: 'g-effetto2', text: 'Usa 2 carte effetto', need: 2, add: s => s.effects },
    { id: 'g-normale', text: 'Batti il computer a livello normale o difficile', need: 1, add: s => (s.win && s.mode === 'cpu' && s.level !== 'facile' ? 1 : 0) },
  ];
  const WEEKLY = [
    { id: 's-vinci10', text: 'Vinci 10 sfide', need: 10, add: s => (s.win ? 1 : 0) },
    { id: 's-torneo', text: 'Vinci 3 incontri del torneo', need: 3, add: s => (s.win && s.mode === 'torneo' ? 1 : 0) },
    { id: 's-online', text: 'Gioca 2 sfide online', need: 2, add: s => (s.mode === 'online' ? 1 : 0) },
    { id: 's-difficile', text: 'Batti 3 volte il computer difficile', need: 3, add: s => (s.win && s.mode === 'cpu' && s.level === 'difficile' ? 1 : 0) },
    { id: 's-ko20', text: 'Manda K.O. 20 carte avversarie', need: 20, add: s => s.kos },
    { id: 's-palestre', text: 'Vinci in 3 palestre diverse', need: 3, distinct: s => (s.win ? s.terrain : null) },
  ];
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function weekKey(d = new Date()) { // settimana ISO, come il database (AAAA-Wnn)
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    const w = Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
    return `${t.getUTCFullYear()}-W${String(w).padStart(2, '0')}`;
  }
  function pickFor(key, pool, n) {
    let h = 7; for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
    const rnd = () => { h = (h + 0x6D2B79F5) | 0; let t = Math.imul(h ^ (h >>> 15), h | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const p = pool.slice(), out = [];
    while (out.length < n) out.push(p.splice(Math.floor(rnd() * p.length), 1)[0]);
    return out;
  }
  function currentMissions() {
    const d = dayKey(), w = weekKey(), st = load('missioni', {});
    const mk = (m, period, xp) => Object.assign({}, m, { period, xp, key: `${period}|${m.id}` }, { st: st[`${period}|${m.id}`] || { p: 0, set: [], claimed: false } });
    return pickFor(d, DAILY, 3).map(m => mk(m, d, 30)).concat(pickFor(w, WEEKLY, 2).map(m => mk(m, w, 120)));
  }
  const readyMissions = () => currentMissions().filter(m => m.st.p >= m.need && !m.st.claimed).length;
  function missionProgress(s) {
    const st = load('missioni', {}), now = currentMissions(), done = [];
    const keep = {};
    now.forEach(m => {
      const x = st[m.key] || { p: 0, set: [], claimed: false };
      if (!x.claimed && x.p < m.need) {
        if (m.distinct) { const v = m.distinct(s); if (v && !x.set.includes(v)) x.set.push(v); x.p = x.set.length; }
        else x.p = Math.min(m.need, x.p + m.add(s));
        if (x.p >= m.need) done.push(m);
      }
      keep[m.key] = x;
    });
    store('missioni', keep); // le missioni dei giorni passati spariscono
    return done;
  }
  async function claimMission(key) {
    const m = currentMissions().find(x => x.key === key);
    if (!m || m.st.claimed || m.st.p < m.need) return;
    const mark = () => { const st = load('missioni', {}); (st[key] = st[key] || m.st).claimed = true; store('missioni', st); };
    if (signedIn()) {
      try {
        const xp = await Cloud.claimMission(m.id, m.period);
        const p = load('profilo', null), before = p ? p.xp : 0;
        if (p) { p.xp += xp; store('profilo', p); }
        mark(); toastQuick(`+${xp} punti esperienza!`);
        const up = levelUp(before, before + xp); if (up) toastQuick(`Livello ${lv(before + xp)}!`);
      } catch (e) {
        if (/già riscattata/.test(e.message)) mark();
        toastQuick(e.message);
      }
    } else {
      mark();
      const up = addLocalXp(m.xp);
      toastQuick(`+${m.xp} punti esperienza!${up ? ` Livello ${myLevel()}!` : ''}`);
    }
    render();
  }

  // riepilogo della partita appena finita, dal punto di vista di chi tiene il telefono
  function matchSummary(g) {
    const side = mySide(), pl = g.players[side], st = A.stats || {};
    return {
      win: g.winner === side, mode: A.mode, level: g.players[1 - side].cpu || null,
      allievi: pl.cards.filter(id => S.CARD[id] && S.CARD[id].rank === 'A').length,
      legend: pl.cards.some(id => S.CARD[id] && S.CARD[id].rank === 'L'),
      weapon: (A.setup.players[side].weapon || {}).id || null, terrain: g.terrain,
      specials: st.specials || 0, kos: st.kos || 0, effects: st.effects || 0, doubleKo: !!st.doubleKo,
      lost: pl.ko.length, alive: pl.field.length + pl.reserve.length, cards: pl.cards,
    };
  }
  // tutto quello che succede a fine partita: punti (senza account), carte speciali, medaglie, missioni
  function afterMatch(g, cloudGame) {
    if (mySide() < 0 || A.liveMatch) return '';
    const s = matchSummary(g);
    let html = '';
    if (!cloudGame) { const xp = xpFor(s.mode, s.level, s.win); html += `<p class="xp-line">+${xp} punti esperienza · Livello ${lv(load('xp_locale', 0) + xp)}</p>` + addLocalXp(xp); }
    const prog = load('prog', { wins: 0, effects: 0, days: [], terrains: [], weapons: [] });
    prog.effects += s.effects;
    if (!prog.days.includes(dayKey())) prog.days = prog.days.concat(dayKey()).slice(-30);
    const newMedals = [];
    const give = id => { const m = award(id); if (m) newMedals.push(m); };
    if (s.win) {
      prog.wins++;
      if (s.terrain && !prog.terrains.includes(s.terrain)) prog.terrains.push(s.terrain);
      if (s.weapon && !prog.weapons.includes(s.weapon)) prog.weapons.push(s.weapon);
      // carte dorate e olografiche
      const vc = load('vittorie_carte', {}), upgraded = [];
      s.cards.forEach(id => { const before = variantOf(id); vc[id] = (vc[id] || 0) + 1; store('vittorie_carte', vc); const now = variantOf(id); if (now !== before) upgraded.push([id, now]); });
      if (upgraded.length) { give('oro'); html += `<div class="unlock"><div class="eyebrow">Carte speciali!</div><p>${upgraded.map(([id, v]) => `${esc(S.CARD[id].name)} ora è ${VARIANT_NAME[v]}`).join(' · ')}</p></div>`; }
      if (prog.wins >= 1) give('prima');
      if (prog.wins >= 10) give('dieci');
      if (prog.wins >= 50) give('cinquanta');
      if (s.legend) give('leggenda');
      if (s.lost === 0) give('intatto');
      if (s.alive === 1) give('rimonta');
      if (s.mode === 'cpu' && s.level === 'difficile') give('difficile');
      if (s.mode === 'online') give('online');
      if (prog.terrains.length >= S.TERRAINS.length) give('palestre');
      if (prog.weapons.length >= S.WEAPONS.length) give('armi');
    }
    if (s.doubleKo) give('doppiok');
    if (prog.effects >= 10) give('effetti');
    if (prog.days.length >= 7) give('fedele');
    store('prog', prog);
    const done = missionProgress(s);
    if (done.length) html += `<div class="unlock"><div class="eyebrow">🎯 Missione completata!</div><p>${done.map(m => esc(m.text)).join(' · ')}</p><p>Riscuoti il premio in Missioni.</p></div>`;
    if (newMedals.length) html += `<div class="unlock"><div class="eyebrow">🏅 Nuova medaglia!</div><p>${newMedals.map(m => `${m.e} ${esc(m.name)}`).join(' · ')}</p></div>`;
    return html;
  }

  // ------------------------------------------------------------ MISSIONI E MEDAGLIE (schermate)
  function levelCard() {
    const xp = myXp(), l = lv(xp), from = lvXp(l), to = lvXp(l + 1);
    const next = REWARDS.find(r => r.lv > l);
    return `<div class="acc-card">
      <div class="eyebrow">${signedIn() ? 'Il tuo account' : 'Su questo telefono (entra per salvare i punti online)'}</div>
      <div class="acc-lvl"><span class="num">Livello ${l}</span> · ${esc(cloudOn() ? Cloud.titleOf(l) : '')}</div>
      <div class="xpbar"><i style="width:${(100 * (xp - from) / (to - from)).toFixed(1)}%"></i></div>
      <small class="num">${xp} punti · ${to - xp} al livello ${l + 1}${next && !settings.allUnlocked ? ` · al livello ${next.lv} sblocchi ${esc(rewardName(next))}` : ''}</small>
    </div>`;
  }
  function missionRow(m) {
    const ok = m.st.p >= m.need;
    return `<div class="mission ${m.st.claimed ? 'claimed' : ok ? 'ready' : ''}">
      <div class="mi-head"><b>${esc(m.text)}</b><span class="num">+${m.xp}</span></div>
      <div class="xpbar"><i style="width:${(100 * Math.min(m.st.p, m.need) / m.need).toFixed(0)}%"></i></div>
      <div class="mi-foot"><small class="num">${Math.min(m.st.p, m.need)} / ${m.need}</small>
        ${m.st.claimed ? '<small>✓ Riscossa</small>' : ok ? `<button class="btn small primary" data-act="mis-claim" data-v="${esc(m.key)}">Riscuoti</button>` : ''}</div></div>`;
  }
  function renderMissioni() {
    const ms = currentMissions();
    return `<div class="topbar"><button class="back" data-act="go" data-v="home">← Menu</button><div class="eyebrow">Missioni</div></div>
    <div class="setup"><h2>Missioni</h2>
      ${levelCard()}
      <h3 class="sec">Oggi</h3>${ms.filter(m => m.xp === 30).map(missionRow).join('')}
      <h3 class="sec">Questa settimana</h3>${ms.filter(m => m.xp === 120).map(missionRow).join('')}
      <p class="hint" style="text-align:left">Valgono le sfide contro il computer, il torneo, il tutorial e le sfide online (non quelle in 2 sullo stesso telefono). Ogni giorno e ogni lunedì arrivano missioni nuove.</p>
      <h3 class="sec">Premi di livello</h3>
      <div class="rewards">${REWARDS.map(r => `<div class="${myLevel() >= r.lv || settings.allUnlocked ? 'got' : ''}"><b class="num">Liv. ${r.lv}</b><span>${esc(rewardName(r))}</span></div>`).join('')}</div>
      <p class="hint" style="text-align:left">Spada, sciabola, i due bastoni e le palestre di Lancenigo e Ponte della Priula ci sono da subito. Le carte diventano dorate dopo 5 vittorie con loro in squadra e olografiche dopo 15.</p>
    </div>`;
  }
  function renderMedaglie() {
    const m = myMedals(), got = MEDALS.filter(x => m[x.id]).length;
    return `<div class="topbar"><button class="back" data-act="go" data-v="home">← Menu</button><div class="eyebrow">${got}/${MEDALS.length}</div></div>
    <div class="setup"><h2>Medaglie</h2>
      <div class="medals">${MEDALS.map(x => {
        const has = !!m[x.id], secret = x.hidden && !has;
        return `<div class="medal ${has ? 'got' : ''}"><span class="me-e">${secret ? '❔' : x.e}</span><b>${secret ? '???' : esc(x.name)}</b><small>${secret ? 'Una medaglia segreta.' : esc(x.desc)}</small>${has ? `<small class="num">${esc(m[x.id].split('-').reverse().join('/'))}</small>` : ''}</div>`;
      }).join('')}</div></div>`;
  }

  // ------------------------------------------------------------ REGOLE
  function renderRules() {
    return `<div class="topbar"><button class="back" data-act="go" data-v="home">← Menu</button><div class="eyebrow">Regolamento</div></div>
    <div class="rules">
      <h2>Come si gioca</h2>
      <h3>La squadra</h3>
      <ul>
        <li>Scegli <b>4 carte</b> spendendo al massimo <b>${S.BUDGET} Punti Dojo</b> (il numero dorato sulla carta).</li>
        <li>Le prime 3 vanno <b>in campo</b>, la quarta resta <b>in riserva</b>: entra da sola quando una tua carta va K.O.</li>
        <li><b>Sinergie</b>: alcune combinazioni di gradi danno un bonus (per esempio 2 Maestri: +15 PV ai Maestri). Le vedi mentre scegli la squadra.</li>
      </ul>
      <h3>Il turno</h3>
      <ul>
        <li>Nel tuo turno <b>ogni tua carta in campo agisce una volta</b>, nell'ordine che vuoi. Tocca una carta e scegli: <code>Attacco</code> o una delle sue <b>mosse speciali</b>.</li>
        <li>Quando scegli il bersaglio vedi i <b>danni previsti</b> sopra ogni carta avversaria.</li>
        <li>Le mosse speciali hanno una <b>ricarica</b>: dopo l'uso devi aspettare qualche turno. Alcune si usano una sola volta per partita.</li>
        <li>Puoi chiudere il turno prima con <code>Fine turno</code>.</li>
        <li>Chi inizia (a sorte) al primo turno agisce con <b>2 carte</b> e solo con attacchi base.</li>
      </ul>
      <h3>I danni</h3>
      <p>Danni = ATK × 50 ÷ (50 + DEF del bersaglio), con un piccolo margine casuale. Con DEF 50 il colpo si dimezza, con DEF 100 arriva un terzo.</p>
      <h3>Effetti</h3>
      <ul>
        <li><b>Stordimento / Paralisi</b>: la carta salta la sua azione. Finito lo stordimento, non può essere stordita di nuovo per un turno.</li>
        <li><b>Confusione</b>: a ogni azione offensiva c'è il 35% di probabilità di colpirsi per sbaglio.</li>
        <li><b>Tecniche bloccate</b>: può fare solo l'attacco base.</li>
        <li>Gli effetti durano i turni indicati sul chip. Uno stesso effetto non si somma: si rinnova.</li>
        <li><b>Istruttori e Maestri</b> contano per alcune mosse (per esempio la Risposta Scazzata li stordisce per 2 turni invece di 1).</li>
        <li><b>Leggende</b>: Chen Wangting (Fondatore Supremo) e Chen Zhenglei (Gran Maestro) costano 6 Punti Dojo, contano come Maestri e si sbloccano vincendo il torneo.</li>
      </ul>
      <h3>Eventi in palestra</h3>
      <p>Ogni 3 round capita qualcosa (lezione extra, aria condizionata rotta, musica a palla…) che vale per tutte le carte in campo, di entrambe le squadre. Si possono spegnere dalle impostazioni.</p>
      <h3>Palestre (carte terreno)</h3>
      <p>Ogni sfida si combatte in una palestra, scelta prima della partita o a sorte. Il suo effetto vale per entrambe le squadre.</p>
      <ul>${S.TERRAINS.map(t => `<li><b>${esc(t.name)}</b> (${esc(t.place)}): ${esc(t.desc)}</li>`).join('')}</ul>
      <h3>Armi</h3>
      <p>Mentre scegli la squadra puoi dare un'arma dello stile Chen a una tua carta. Non costa Punti Dojo.</p>
      <ul>${S.WEAPONS.map(w => `<li><b>${esc(w.name)}</b> (${esc(w.cn)}): ${esc(w.desc)}</li>`).join('')}</ul>
      <h3>Carte effetto</h3>
      <p>All'inizio ognuno pesca 2 carte effetto (si vedono sotto la propria squadra). Dal secondo turno se ne può giocare una per turno, senza usare l'azione di una carta; ognuna vale una volta sola. Si possono spegnere dalle impostazioni.</p>
      <ul>${S.EFFECTS.map(x => `<li>${x.e} <b>${esc(x.name)}</b>: ${esc(x.desc)}</li>`).join('')}</ul>
      <h3>Vittoria</h3>
      <p>Vince chi manda K.O. tutte le carte avversarie, riserva compresa. Ogni vittoria sblocca una nuova carta.</p>
      <h3>Segreti</h3>
      <ul>
        <li>Quando Chen usa la Spallata del Prodigio, a volte parte la musica dei Prodigy…</li>
      </ul>
    </div>`;
  }

  // ------------------------------------------------------------ ACCOUNT, LIVELLI E CLASSIFICA GENERALE (cloud.js)
  const cloudOn = () => !!window.Cloud;
  function accountLabel() {
    const p = load('profilo', null);
    if (cloudOn() && Cloud.signedIn() && p) { const l = Cloud.levelOf(p.xp); return `👤 ${esc(p.nome)} · Livello ${l}<small>${esc(Cloud.titleOf(l))} · classifica generale</small>`; }
    return 'Entra o registrati<small>classifica generale, livelli, carte salvate online</small>';
  }
  // carte sbloccate: le unisco a quelle salvate online (niente segrete, niente Leggende)
  async function syncCollection() {
    try {
      const ok = id => S.CARD[id] && !S.CARD[id].secret && !LEGENDS.includes(id);
      const remote = await Cloud.collection();
      const merged = [...new Set(load('unlocked', STARTERS).filter(ok).concat(remote.filter(ok)))];
      store('unlocked', merged);
      await Cloud.addToCollection(merged.filter(id => !remote.includes(id)));
    } catch (e) { /* riprovo la prossima volta */ }
  }
  async function accountLoad() {
    const c = A.acc || (A.acc = {});
    if (cloudOn() && Cloud.signedIn()) {
      try {
        c.prof = await Cloud.profile(); c.loaded = true;
        if (c.prof) { store('profilo', c.prof); syncCollection(); syncMedals(); }
        if (c.prof && c.afterLogin) { c.afterLogin = false; toastQuick(`Bentornato, ${c.prof.nome}!`); go('home'); return; }
      } catch (e) { c.msg = e.message; c.loaded = true; }
    }
    try { c.board = await Cloud.leaderboard(); c.boardErr = ''; } catch (e) { c.boardErr = 'Classifica non disponibile: serve internet.'; }
    try { c.week = await Cloud.weeklyBoard(); } catch (e) { c.week = null; }
    if (A.screen === 'account') render();
  }
  function boardHtml(c) {
    const tab = c.week && c.tab !== 'all' ? 'week' : 'all';
    const tabs = c.week ? `<div class="seg board-tabs" role="group"><button data-act="board-tab" data-v="week" aria-pressed="${tab === 'week'}">Settimana</button><button data-act="board-tab" data-v="all" aria-pressed="${tab === 'all'}">Sempre</button></div>` : '';
    if (tab === 'week') {
      const mine = c.prof && c.prof.nome;
      return tabs + (c.week.length ? `<table class="board num"><thead><tr><th>#</th><th>Nome</th><th>Punti</th><th>V</th></tr></thead><tbody>
        ${c.week.map((p, i) => `<tr class="${p.nome === mine ? 'me' : ''}"><td>${i + 1}</td><td>${esc(p.nome)}</td><td>${p.xp}</td><td>${p.vittorie}</td></tr>`).join('')}
      </tbody></table><p class="hint" style="text-align:left">Punti fatti da lunedì: si riparte da zero ogni settimana.</p>` : '<p class="hint" style="text-align:left">Nessuno ha ancora giocato questa settimana: il primo posto è libero!</p>');
    }
    return tabs + boardHtmlAll(c);
  }
  function boardHtmlAll(c) {
    if (c.boardErr) return `<p class="hint" style="text-align:left">${esc(c.boardErr)}</p>`;
    if (!c.board) return '<p class="hint">Carico la classifica…</p>';
    if (!c.board.length) return '<p class="hint" style="text-align:left">Ancora nessun giocatore: il primo posto è libero!</p>';
    const mine = c.prof && c.prof.nome;
    return `<table class="board num"><thead><tr><th>#</th><th>Nome</th><th>Liv.</th><th>Punti</th><th>V</th><th>S</th></tr></thead><tbody>
      ${c.board.map((p, i) => `<tr class="${p.nome === mine ? 'me' : ''}"><td>${i + 1}</td><td>${esc(p.nome)}</td><td>${Cloud.levelOf(p.xp)}</td><td>${p.xp}</td><td>${p.vittorie}</td><td>${p.sconfitte}</td></tr>`).join('')}
    </tbody></table>`;
  }
  function renderAccount() {
    const c = A.acc || (A.acc = {});
    const top = `<div class="topbar"><button class="back" data-act="go" data-v="home">← Menu</button><div class="eyebrow">Account</div></div>`;
    if (!cloudOn()) return `${top}<div class="setup"><p class="hint">Account non disponibile.</p></div>`;
    const dis = c.busy ? 'disabled' : '';
    const msg = c.msg ? `<p class="err" role="alert">${esc(c.msg)}</p>` : '';
    let body;
    const info = c.info ? `<p class="ok-msg" role="status">${esc(c.info)}</p>` : '';
    const emailF = `<label class="field-label" for="acc-email"><span class="eyebrow">Email</span><input id="acc-email" type="email" inputmode="email" autocomplete="email" value="${esc(c.email || '')}"></label>`;
    const passF = (label, auto) => `<label class="field-label" for="acc-pass"><span class="eyebrow">${label}</span><input id="acc-pass" type="password" autocomplete="${auto}" value="${esc(c.pw || '')}"></label>
      <label class="showpw"><input type="checkbox" data-change="showpw"> Mostra la password</label>`;
    const guest = c.start ? '<button class="btn ghost" data-act="acc-guest">Gioca senza account</button>' : '';
    const mode = c.mode || 'login';
    if (Cloud.signedIn() && mode === 'newpass') {
      body = `<h2>Nuova password</h2>
        <p class="hint" style="text-align:left">Scegli la nuova password per il tuo account (almeno 6 caratteri).</p>
        ${passF('Nuova password', 'new-password')}${msg}
        <button class="btn primary" data-act="acc-newpass" ${dis}>Salva la password</button>`;
    } else if (!Cloud.signedIn()) {
      if (mode === 'signup') body = `<h2>Crea il tuo account</h2>
        <p class="hint" style="text-align:left">Con un account entri nella classifica generale, sali di livello vincendo le sfide e ritrovi le tue carte anche su un altro telefono.</p>
        ${emailF}${passF('Password (almeno 6 caratteri)', 'new-password')}${msg}${info}
        <button class="btn primary" data-act="acc-signup" ${dis}>${c.busy ? 'Un attimo…' : 'Crea account'}</button>
        <button class="btn ghost" data-act="acc-mode" data-v="login">Ho già un account</button>${guest}`;
      else if (mode === 'recover') body = `<h2>Password dimenticata</h2>
        <p class="hint" style="text-align:left">Scrivi la tua email: ti mandiamo un link per sceglierne una nuova. Se non lo trovi, guarda nella posta indesiderata.</p>
        ${emailF}${msg}${info}
        <button class="btn primary" data-act="acc-recover" ${dis}>${c.busy ? 'Invio…' : 'Mandami il link'}</button>
        <button class="btn ghost" data-act="acc-mode" data-v="login">Torna all'accesso</button>`;
      else body = `<h2>Entra</h2>
        <p class="hint" style="text-align:left">Entra nel tuo account per la classifica generale, i livelli e le carte salvate online.</p>
        ${emailF}${passF('Password', 'current-password')}${msg}${info}
        <button class="btn primary" data-act="acc-login" ${dis}>${c.busy ? 'Un attimo…' : 'Entra'}</button>
        <button class="btn ghost small" data-act="acc-mode" data-v="recover">Password dimenticata?</button>
        <div class="or">non hai ancora un account?</div>
        <button class="btn" data-act="acc-mode" data-v="signup">Registrati</button>${guest}`;
    } else if (!c.loaded) {
      body = '<p class="hint">Carico il profilo…</p>';
    } else if (!c.prof) {
      body = `<h2>Come ti chiami?</h2>
        <p class="hint" style="text-align:left">È il nome che vedranno tutti nella classifica generale (da 2 a 20 caratteri).</p>
        <label class="field-label" for="acc-name"><span class="eyebrow">Nome da combattente</span><input id="acc-name" maxlength="20" value="${esc(A.names[0] !== 'Giocatore 1' ? A.names[0] : '')}"></label>
        ${msg}
        <button class="btn primary" data-act="acc-create" ${dis}>Entra in classifica</button>
        <button class="btn ghost" data-act="acc-logout">Esci dall'account</button>`;
    } else {
      const p = c.prof, l = Cloud.levelOf(p.xp), from = Cloud.xpFor(l), to = Cloud.xpFor(l + 1);
      body = `<div class="acc-card">
          <div class="eyebrow">${esc(Cloud.email())}</div>
          <b class="acc-name">${esc(p.nome)}</b>
          <div class="acc-lvl"><span class="num">Livello ${l}</span> · ${esc(Cloud.titleOf(l))}</div>
          <div class="xpbar" role="progressbar" aria-valuemin="${from}" aria-valuemax="${to}" aria-valuenow="${p.xp}"><i style="width:${(100 * (p.xp - from) / (to - from)).toFixed(1)}%"></i></div>
          <small class="num">${p.xp} punti · ${to - p.xp} al livello ${l + 1} · ${p.vittorie} vittorie, ${p.sconfitte} sconfitte</small>
        </div>
        <p class="hint" style="text-align:left">Punti a ogni sfida: vittoria contro il computer 20 / 30 / 45 (facile, normale, difficile), torneo 40, online 50; anche una sconfitta vale 10.</p>
        ${msg}
        <details class="syn-box"><summary>Cambia nome o esci</summary>
          <div class="acc-edit"><input id="acc-name" maxlength="20" value="${esc(p.nome)}" aria-label="Nuovo nome"><button class="btn small" data-act="acc-rename" ${dis}>Cambia nome</button></div>
          <button class="btn ghost" data-act="acc-logout">Esci dall'account</button>
        </details>`;
    }
    return `${top}<div class="setup">${body}<h3 class="sec">🌍 Classifica generale</h3>${boardHtml(c)}</div>`;
  }
  // esegue una richiesta all'account mostrando "attendere" e l'eventuale errore
  function accDo(promise, after) {
    const c = A.acc;
    c.busy = true; c.msg = ''; render();
    c.info = '';
    promise.then(r => { c.busy = false; if (after) after(r); render(); })
      .catch(e => { c.busy = false; c.msg = e.message || 'Qualcosa non ha funzionato.'; render(); });
  }

  // ------------------------------------------------------------ ONLINE
  function renderOnline() {
    const o = A.on || (A.on = { phase: 'menu' });
    const ok = window.Net && Net.available();
    let body = '';
    if (!ok) {
      body = `<p class="hint" style="text-align:left">${window.top !== window
        ? 'Il gioco online funziona dal sito del gioco (GitHub Pages) o dall\'app installata, non dentro questa anteprima.'
        : 'Questo browser non supporta il gioco online. Prova con Chrome o Safari aggiornati.'}</p>`;
    } else if (o.phase === 'menu') {
      body = `<label class="field-label" for="n0"><span class="eyebrow">Il tuo nome</span><input id="n0" maxlength="16" value="${esc(A.names[0])}"></label>
        <button class="btn primary" data-act="on-host">Crea una partita</button>
        <div class="or">oppure</div>
        <label class="field-label" for="oncode"><span class="eyebrow">Codice dell'altro giocatore</span><input id="oncode" maxlength="5" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ES. K7QXM" value="${esc(o.typed || '')}"></label>
        <button class="btn" data-act="on-join">Entra nella partita</button>
        ${o.error ? `<p class="err">${esc(o.error)}</p>` : ''}
        <p class="hint" style="text-align:left">Serve internet su entrambi i telefoni. Chi crea la partita legge il codice all'altro, che lo inserisce qui.</p>`;
    } else if (o.phase === 'wait-host') {
      body = `<div class="code-box"><div class="eyebrow">Il tuo codice</div><div class="code num">${esc(o.code || '…')}</div><p>Dillo all'altro giocatore: lo inserisce in "Online → Entra nella partita".</p></div>
        <p class="hint">In attesa che l'altro giocatore entri…</p>
        <button class="btn ghost" data-act="on-cancel">Annulla</button>`;
    } else if (o.phase === 'connecting') {
      body = `<p class="hint">Collegamento in corso…</p><button class="btn ghost" data-act="on-cancel">Annulla</button>`;
    }
    return `<div class="topbar"><button class="back" data-act="on-cancel">← Menu</button><div class="eyebrow">Online</div></div>
    <div class="setup"><h2>Gioca online</h2>${body}</div>`;
  }
  function focusOnline() { /* niente focus automatico: sul telefono aprirebbe la tastiera */ }

  // ------------------------------------------------------------ BATTAGLIA
  function tileHtml(g, f, opts) {
    const atk = Math.round(S.effAtk(g, f)), def = Math.round(S.effDef(g, f));
    const pct = Math.max(0, f.hp / f.maxHp);
    const cls = pct > 0.5 ? '' : pct > 0.25 ? 'mid' : 'low';
    const k = (v, b) => v > b ? 'up' : v < b ? 'down' : '';
    const classes = ['tile'];
    if (opts.acted) classes.push('acted');
    if (S.isStunned(f)) classes.push('stunned');
    if (opts.selected) classes.push('selected');
    if (opts.target) classes.push('target');
    if (opts.dim) classes.push('dim');
    if (opts.hinted) classes.push('hinted');
    if (f.owner === mySide() && variantOf(f.card)) classes.push(variantOf(f.card));
    let pv = '';
    if (opts.preview) {
      const [lo, hi] = opts.preview;
      pv = `<span class="pv num ${lo >= f.hp ? 'ko' : ''}">${lo === 0 && hi === 0 ? 'Bloccato' : lo >= f.hp ? 'K.O.!' : `−${lo}–${hi}`}</span>`;
    }
    return `<button class="${classes.join(' ')}" data-act="tile" data-v="${f.uid}" aria-label="${esc(f.name)}, ${f.hp} PV su ${f.maxHp}">
      <span class="face" style="${face(f.card)}"><span class="rank ${f.rank}">${RANK_SHORT[f.rank]}</span>${f.weapon ? `<span class="wpn" title="${esc(S.WEAPON[f.weapon].name)}">⚔️</span>` : ''}${pv}</span>
      <span class="body">
        <span class="nm">${esc(f.name)}</span>
        <span class="hp"><i class="${cls}" style="width:${(pct * 100).toFixed(1)}%"></i></span>
        <span class="stats num"><span><b>${f.hp}</b> PV</span><span>A<b class="${k(atk, f.baseAtk)}">${atk}</b></span><span>D<b class="${k(def, f.baseDef)}">${def}</b></span></span>
        <span class="chips">${chipsHtml(chipList(g, f, true))}</span>
      </span>
    </button>`;
  }

  function rowHtml(g, p) {
    const pl = g.players[p];
    const localTurn = isLocalTurn() && g.turn === p;
    const sel = A.sel;
    const actor = sel ? S.byUid(g, sel.actor) : null;
    const tiles = pl.field.map(f => {
      const isT = sel && sel.targets.includes(f.uid);
      return tileHtml(g, f, {
        acted: localTurn && f.acted,
        selected: sel && sel.actor === f.uid,
        target: isT,
        dim: sel && !isT && sel.actor !== f.uid,
        preview: isT && actor && f.owner !== actor.owner ? S.previewDamage(g, actor, sel.inner, f) : null,
        hinted: A.hint && (A.hint.a.actor === f.uid || A.hint.a.target === f.uid),
      });
    }).join('');
    return `<div class="row-fighters ${pl.field.length > 3 ? 'four' : ''}" style="grid-template-columns:repeat(${Math.max(pl.field.length, 3)},1fr)">${tiles}</div>`;
  }

  function sideBar(g, p) {
    const pl = g.players[p];
    const res = pl.reserve.length ? `Riserva: ${pl.reserve.map(f => esc(f.name.split(' ')[0])).join(', ')}` : 'Nessuna riserva';
    const syn = pl.syn && pl.syn.length ? pl.syn.map(id => S.SYNERGIES.find(x => x.id === id).name).map(esc).join(', ') : '';
    const fx = pl.hand ? ` · 🃏 ${pl.hand.length - pl.usedFx.length}` : '';
    return `<div class="bar"><div class="side-name ${g.turn === p && g.winner === null ? 'active' : ''}"><i class="turn-dot"></i><span>${esc(pl.name)}</span></div><div class="res-info">${res} · K.O. ${pl.ko.length}${fx}<span class="syn-tag">${syn}</span></div></div>`;
  }
  // le carte effetto in mano a chi tiene il telefono
  function handHtml(g, p) {
    const pl = g.players[p];
    if (!pl.hand) return '';
    const usable = isLocalTurn() && g.turn === p && !A.busy ? S.effectOptions(g).map(x => x.id) : [];
    return `<div class="hand" aria-label="Carte effetto">${pl.hand.map(id => {
      const x = S.EFFECT[id], used = pl.usedFx.includes(id), on = A.sel && A.sel.effect === id;
      return `<button class="fx-card ${used ? 'used' : ''} ${on ? 'on' : ''}" data-act="effect" data-v="${id}" ${usable.includes(id) && !used ? '' : 'disabled'} aria-label="${esc(x.name)}: ${esc(x.desc)}">
        <span class="fx-e">${x.e}</span><span class="fx-t"><b>${esc(x.name)}</b><small>${used ? 'Usata' : esc(x.desc)}</small></span></button>`;
    }).join('')}</div>`;
  }

  // il consiglio c'è nel proprio turno, ma non online (sarebbe un aiuto contro un'altra persona)
  const canHint = () => isLocalTurn() && !A.busy && !A.sel && A.mode !== 'online';
  function hintText(g, a) {
    if (a.effect) { const t = a.target ? S.byUid(g, a.target) : null; return `Gioca ${S.EFFECT[a.effect].name}${t ? ` su ${t.name}` : ''}`; }
    const u = S.byUid(g, a.actor), opt = S.actorOptions(g, u).find(o => o.i === a.move);
    const m = opt ? opt.move : S.BASIC, t = a.target ? S.byUid(g, a.target) : null;
    const label = a.pick ? `${m.name} → ${S.refMove(a.pick).name}` : m.name;
    return `${u.name}: ${label}${t ? ` su ${t.name}` : ''}`;
  }

  // è il turno di chi tiene in mano questo telefono?
  function isLocalTurn() {
    const g = A.game;
    if (!g || g.winner !== null || g.players[g.turn].cpu || A.mode === 'replay') return false;
    if (A.mode === 'online' && g.turn !== A.me) return false;
    return true;
  }

  function renderBattle() {
    const g = A.game;
    const me = A.view, opp = 1 - me;
    const lines = g.log.slice(A.logOpen ? -80 : -3).map(t => `<p>${esc(t)}</p>`).join('');
    let banner = A.banner;
    if (!banner) {
      if (g.winner !== null) banner = `${g.players[g.winner].name} ha vinto!`;
      else if (A.sel) banner = 'Tocca il bersaglio';
      else if (isLocalTurn()) banner = g.turnNo <= 2 ? 'Tocca una tua carta per farla agire' : `Turno ${Math.ceil(g.turnNo / 2)} · tocca a ${g.players[g.turn].name}`;
      else if (A.mode === 'online') banner = `Tocca a ${g.players[g.turn].name}…`;
      else banner = `${g.players[g.turn].name} sta pensando…`;
    }
    const canEnd = isLocalTurn() && !A.busy;
    return `<div class="battle">
      <div class="bar"><button class="back" data-act="quit">← Esci</button><div class="eyebrow num turn-lbl">Turno ${Math.ceil(g.turnNo / 2)}${A.mode === 'torneo' ? ` · Torneo ${torneo().stage + 1}/5` : ''}</div>${speedHtml()}</div>
      ${sideBar(g, opp)}
      ${rowHtml(g, opp)}
      <div class="mid">
        ${g.terrain ? `<button class="terrain-chip" data-act="terrain-info">🏯 ${esc(S.TERRAIN[g.terrain].name)} · ${esc(S.TERRAIN[g.terrain].place)}</button>` : ''}
        ${tutorialHtml() || (A.hint ? `<div class="hint-box" role="status"><span>💡 ${esc(A.hint.text)}</span><button class="btn small primary" data-act="hint-do">Fai così</button></div>` : `<div class="banner" aria-live="polite">${esc(banner)}</div>`)}
        <div class="log ${A.logOpen ? 'open' : ''}" data-act="log" role="button" tabindex="0" aria-label="Registro della partita">${lines || '<p>La sfida ha inizio.</p>'}</div>
      </div>
      ${rowHtml(g, me)}
      ${sideBar(g, me)}
      ${handHtml(g, me)}
      <div class="actions-row ${canHint() ? 'three' : ''}">
        ${A.sel ? '<button class="btn" data-act="cancel-sel">Annulla</button>' : `<button class="btn ghost" data-act="log">${A.logOpen ? 'Chiudi registro' : 'Registro'}</button>`}
        ${canHint() ? '<button class="btn" data-act="hint">💡 Consiglio</button>' : ''}
        <button class="btn primary" data-act="end-turn" ${canEnd && !A.sel ? '' : 'disabled'}>Fine turno</button>
      </div>
    </div>`;
  }

  // ------------------------------------------------------------ TUTORIAL
  const TUT = [
    'Benvenuto nel Tempio! In basso ci sono le tue carte, in alto quelle avversarie. Tocca una tua carta per farla agire.',
    'Ogni carta può fare un Attacco oppure usare una mossa speciale (in arancione). Scegli Attacco.',
    'Ora tocca un avversario in alto. Il numero rosso sulla carta sono i danni previsti.',
    'Bene! Nel tuo turno ogni carta agisce una volta. Chi inizia, al primo turno, usa solo 2 carte: fai agire la seconda.',
    'Ora puoi usare le mosse speciali: tocca una carta e scegline una in arancione. Dopo l\'uso si ricaricano per qualche turno.',
    'Le etichette colorate sulle carte sono gli effetti (stordimento, ATK in più…). Tocca una carta avversaria per leggerli tutti.',
    'Quando una tua carta va K.O. entra la riserva. Vince chi manda K.O. tutte le carte avversarie. Ora tocca a te!',
  ];
  function tutorialHtml() {
    if (A.mode !== 'tutorial' || A.tut < 0 || A.tut >= TUT.length || !A.game || A.game.winner !== null) return '';
    return `<div class="tut" role="status"><i style="${face('samuele')}"></i><div><b>Samuele Contessa · Istruttore</b><p>${esc(TUT[A.tut])}</p>${A.tut === TUT.length - 1 ? '<button class="btn small" data-act="tut-done">Ho capito</button>' : ''}</div></div>`;
  }
  // avanza il tutorial quando succede la cosa giusta
  function tutEvent(kind) {
    if (A.mode !== 'tutorial' || A.tut < 0) return;
    const s = A.tut;
    const g = A.game;
    if ((s === 0 && kind === 'sheet') || (s === 1 && kind === 'target') || (s === 2 && kind === 'acted')) A.tut++;
    else if (s === 3 && kind === 'myturn' && g.turnNo >= 3) A.tut = 4;
    else if (s === 4 && kind === 'special') { A.tut = 5; A.tutTurn = g.turnNo; }
    else if (s === 5 && (kind === 'enemy-sheet' || (kind === 'myturn' && g.turnNo > A.tutTurn))) A.tut = 6;
    if (A.tut !== s && A.screen === 'battle' && !$layer.querySelector('.sheet')) render();
  }

  // ------------------------------------------------------------ schede in partita
  function actorSheet(f) {
    const g = A.game;
    const mine = isLocalTurn() && f.owner === g.turn && !A.busy;
    const opts = S.actorOptions(g, f);
    const c = S.cardOf(f);
    const chips = chipList(g, f, false);
    const list = opts.map(o => {
      const m = o.move;
      const disabled = !mine || !o.ok;
      const meta = o.ok ? moveMeta(m) : o.why;
      return `<button class="move ${m.basic ? '' : 'special'}" data-act="move" data-uid="${f.uid}" data-i="${o.i}" ${disabled ? 'disabled' : ''}>
        <span class="mh"><span class="mn">${esc(m.name)}</span><span class="why">${esc(mine || m.basic ? meta : moveMeta(m))}</span></span>
        <span class="md">${esc(m.desc)}</span></button>`;
    }).join('');
    openLayer(`<div class="sheet-wrap" data-act="close"><div class="sheet" role="dialog" aria-label="${esc(f.name)}" data-stop>
      <div class="sheet-head"><span class="face" style="${face(f.card)}"></span><div><h3>${esc(f.name)}</h3>
        <p class="num">${RANK_SHORT[f.rank]} · PV ${f.hp}/${f.maxHp} · ATK ${Math.round(S.effAtk(g, f))} · DEF ${Math.round(S.effDef(g, f))}${f.form ? ` · come ${esc(c.name)}` : ''}</p></div></div>
      ${f.weapon ? `<p class="wline">⚔️ <b>${esc(S.WEAPON[f.weapon].name)}</b> · ${esc(S.WEAPON[f.weapon].desc)}</p>` : ''}
      ${chips.length ? `<div class="chips">${chipsHtml(chips)}</div>` : ''}
      ${list}
      <button class="btn ghost" data-act="close">Chiudi</button>
    </div></div>`);
    tutEvent(mine ? 'sheet' : (f.owner !== A.view ? 'enemy-sheet' : ''));
  }

  function copySheet(f, i) {
    const g = A.game;
    const list = S.copyOptions(g, f).map(o => `<button class="move special" data-act="copy-pick" data-uid="${f.uid}" data-i="${i}" data-card="${o.ref.card}" data-mi="${o.ref.i}">
      <span class="mh"><span class="mn">${esc(o.move.name)}</span><span class="why">da ${esc(o.from)}</span></span><span class="md">${esc(o.move.desc)}</span></button>`).join('');
    openLayer(`<div class="sheet-wrap" data-act="close"><div class="sheet" role="dialog" data-stop>
      <div class="sheet-head"><div><h3>Apprendimento Fulmineo</h3><p>Quale mossa vuoi copiare?</p></div></div>
      ${list}<button class="btn ghost" data-act="close">Annulla</button></div></div>`);
  }

  function chooseMove(uid, i, pick) {
    const g = A.game;
    const f = S.byUid(g, uid);
    const opt = S.actorOptions(g, f).find(o => o.i === i);
    if (!opt || !opt.ok) return;
    const m = opt.move;
    if (m.target === 'copy' && !pick) { copySheet(f, i); return; }
    if (m.target === 'bottle') pick = g.lastSpecial;
    const inner = pick ? S.refMove(pick) : m;
    closeLayer();
    if (S.needsTarget(inner)) {
      const targets = S.targetsFor(g, f, inner).map(t => t.uid);
      A.sel = { actor: uid, move: i, pick, targets, inner };
      A.banner = `${inner.name}: tocca il bersaglio`;
      if (A.mode === 'tutorial' && A.tut === 1) A.tut = 2;
      render();
    } else {
      act({ actor: uid, move: i, pick, target: null }, inner);
    }
  }

  async function act(a, inner) {
    const g = A.game;
    A.hint = null;
    if (inner && inner.formula) a.formula = await formulaPrompt(inner);
    A.sel = null; A.banner = '';
    A.busy = true;
    const special = a.move >= 0;
    await perform(a, true);
    A.busy = false;
    tutEvent('acted');
    if (special) tutEvent('special');
    afterAction();
  }

  // ------------------------------------------------------------ esecuzione delle azioni
  // Ogni azione passa da qui: la registro (per salvataggio e online) e la eseguo.
  function applyAct(a) {
    const g = A.game;
    if (a.pass) S.passTurn(g); else S.doAction(g, a);
    A.log.push(a);
  }

  function use3D() { return settings.anim !== 'off' && window.Arena3D && window.Arena3D.available(); }

  // fotografa chi agisce e chi viene colpito prima che l'azione cambi il campo
  function describe(g, a) {
    const u = S.byUid(g, a.actor);
    const opt = S.actorOptions(g, u).find(o => o.i === a.move);
    const m = opt ? opt.move : S.BASIC;
    const exec = (m.target === 'copy' || m.target === 'bottle') ? S.refMove(a.pick || g.lastSpecial) : m;
    const info = uid => { const f = S.byUid(g, uid); return { uid, card: f.card, name: f.name, rank: f.rank, owner: f.owner, weapon: f.weapon || null, variant: f.owner === mySide() ? variantOf(f.card) : '' }; };
    let tg = [];
    if (a.target) tg = [a.target];
    else if (exec.target === 'enemies') tg = S.enemies(g, u.owner).map(f => f.uid);
    else if (exec.target === 'allies') tg = S.team(g, u.owner).map(f => f.uid).filter(x => x !== u.uid);
    else if (exec.target === 'none' && exec.offensive) tg = S.field(g).map(f => f.uid).filter(x => x !== u.uid);
    return { actor: info(u.uid), move: exec.name, label: exec !== m ? `${m.name} → ${exec.name}` : m.name, targets: tg.map(info), info, formula: a.formula && typeof exec.formula === 'string' ? exec.formula : null };
  }

  function buildSpec(d, evs) {
    const out = {};
    const o = uid => out[uid] || (out[uid] = { dmg: 0, heal: 0 });
    const flags = {};
    for (const e of evs) {
      if (e.type === 'dmg') o(e.uid).dmg += e.amount;
      else if (e.type === 'heal') o(e.uid).heal += e.amount;
      else if (e.type === 'ko') o(e.uid).ko = true;
      else if (e.type === 'status') {
        const x = o(e.uid);
        if (e.text === 'STORDITO') x.stun = true;
        if (e.text === 'PARALIZZATO') { x.stun = true; x.para = true; }
        if (e.text === 'CONFUSO') x.confuse = true;
        if (e.text === 'SCHIVATA') x.dodge = true;
        if (e.text === 'IMMUNE' || e.text === 'RESPINTO') x.immune = true;
        if (e.text === 'DISCEPOLO') x.buff = 'DISCEPOLO';
        if (e.text === 'INVERTITO') x.buff = 'ATK ⇄ DEF';
      } else if (e.type === 'log') {
        if (e.text.includes('Prodigy')) flags.prodigy = true;
        if (e.text.includes('perde il controllo')) flags.confused = true;
        if (e.text.startsWith('🎲 Contrattacco')) flags.counter = true;
      }
    }
    const ids = d.targets.map(t => t.uid);
    const extra = Object.keys(out).filter(uid => uid !== d.actor.uid && !ids.includes(uid));
    const targets = d.targets.concat(extra.map(uid => d.info(uid)))
      .map(t => Object.assign({}, t, { ally: t.owner === d.actor.owner, out: out[t.uid] }));
    const self = out[d.actor.uid];
    if (self && flags.confused) self.confuse = false;
    if (d.formula) flags.formula = d.formula;
    return { attacker: d.actor, move: d.move, label: d.label, targets, self, flags, speed: speedK(), controls: speedHtml(), terrain: A.game.terrain,
      finisher: A.game.winner !== null && A.game.winner === d.actor.owner };
  }

  async function perform(a, local) {
    const g = A.game;
    const d = !a.pass && !a.effect && use3D() ? describe(g, a) : null;
    const turnBefore = g.turn;
    const mover = a.pass ? -1 : a.effect ? g.turn : ((S.byUid(g, a.actor) || {}).owner);
    applyAct(a);
    if (local && A.mode === 'online') Net.send({ t: 'act', n: A.log.length - 1, a });
    const evs = g.events.splice(0);
    // statistiche per missioni e medaglie (dal punto di vista di chi tiene il telefono)
    const side = mySide();
    if (side >= 0 && A.stats && !a.pass) {
      const kos = evs.filter(e => e.type === 'ko' && (S.byUid(g, e.uid) || {}).owner !== side).length;
      A.stats.kos += kos;
      if (mover === side) {
        if (a.effect) A.stats.effects++;
        else if (a.move >= 0) A.stats.specials++;
        if (kos >= 2) A.stats.doubleKo = true;
      }
    }
    saveGame();
    if (!d) { await playEvents(evs); }
    else {
      let cut = evs.findIndex(e => e.type === 'turn');
      if (cut < 0) cut = evs.length;
      try { await window.Arena3D.play(buildSpec(d, evs.slice(0, cut))); } catch (e) { /* in caso di errore si prosegue senza 3D */ }
      render();
      await playEvents(evs.slice(cut));
    }
    if (g.turn !== turnBefore && isLocalTurn()) sfx('turn');
  }

  function afterAction() {
    const g = A.game;
    if (!g) return;
    A.hint = null;
    render();
    if (g.winner !== null) { setTimeout(showWinner, 700); return; }
    if (g.players[g.turn].cpu) { runCPU(); return; }
    if (A.mode === 'pvp' && g.turn !== A.view) handoff();
    if (A.mode === 'online') processRemote();
    if (isLocalTurn()) tutEvent('myturn');
  }

  async function runCPU() {
    const g = A.game;
    A.busy = true; render();
    await sleep(pace(700));
    let guard = 0;
    while (A.game === g && g.winner === null && g.players[g.turn].cpu && guard++ < 30) {
      const a = S.chooseAction(g, g.players[g.turn].cpu);
      if (!a) { applyAct({ pass: true }); g.events.splice(0); break; }
      A.banner = actionBanner(g, a);
      render();
      if (a.actor) mark(a.actor, 'acting'); if (a.target) mark(a.target, 'target');
      await sleep(pace(use3D() ? 450 : 900));
      await perform(a);
      A.banner = '';
      render();
      await sleep(pace(250));
    }
    if (A.game !== g) return;
    A.busy = false;
    A.banner = g.winner === null ? `Tocca a te, ${g.players[g.turn].name}!` : '';
    render();
    if (g.winner === null) { sfx('turn'); tutEvent('myturn'); }
    setTimeout(() => { if (A.banner.startsWith('Tocca a te')) { A.banner = ''; if (A.screen === 'battle' && !A.sel) render(); } }, pace(2200));
    if (g.winner !== null) setTimeout(showWinner, 700);
  }

  function tileEl(uid) { return $app.querySelector(`.tile[data-v="${uid}"]`); }
  function mark(uid, cls) { const el = tileEl(uid); if (el) el.classList.add(cls); }
  function floatOn(uid, text, cls, n) {
    const el = tileEl(uid); if (!el) return;
    const d = document.createElement('span');
    d.className = 'float ' + cls; d.textContent = text;
    d.style.top = `${22 + (n || 0) * 16}%`;
    el.appendChild(d);
    if (cls === 'dmg') { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
  }

  async function playEvents(evs) {
    const count = {};
    let fx = false;
    for (const e of evs) {
      if (e.type === 'dmg' || e.type === 'heal' || e.type === 'status') {
        const n = count[e.uid] = (count[e.uid] || 0) + 1;
        if (e.type === 'dmg') { floatOn(e.uid, `−${e.amount}`, 'dmg', n - 1); sfx(e.amount >= 45 ? 'bighit' : 'hit', e.amount); }
        if (e.type === 'heal') { floatOn(e.uid, `+${e.amount}`, 'heal', n - 1); sfx('heal'); }
        if (e.type === 'status') { floatOn(e.uid, e.text, 'st', n - 1); sfx(e.text === 'SCHIVATA' ? 'dodge' : e.text === 'CONFUSO' ? 'confuse' : e.text === 'IMMUNE' ? 'shield' : 'stun'); }
        fx = true;
        await sleep(pace(160));
      } else if (e.type === 'ko') { mark(e.uid, 'ko'); sfx('ko'); if (window.Sound) Sound.buzz([90, 50, 160]); fx = true; }
      else if (e.type === 'gymevent') { if (fx) { await sleep(pace(500)); fx = false; } await showToast(e.name, e.desc); }
      else if (e.type === 'effect') { const x = S.EFFECT[e.id]; await showToast(`${x.e} ${x.name}`, x.desc, `🃏 Carta effetto · ${A.game.players[e.player].name}`); }
    }
    if (fx) await sleep(pace(650));
  }

  // annuncio degli eventi in palestra
  async function showToast(title, text, eyebrow) {
    sfx('event');
    const el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('role', 'status');
    el.innerHTML = `<div class="eyebrow">${esc(eyebrow || '📣 Evento in palestra')}</div><b>${esc(title)}</b><p>${esc(text)}</p>`;
    document.body.appendChild(el);
    await sleep(pace(2600));
    el.classList.add('out');
    await sleep(300);
    el.remove();
  }

  // passaggio del telefono (2 giocatori)
  function handoff() {
    const g = A.game;
    const p = g.players[g.turn];
    openLayer(`<div class="overlay" role="dialog">
      <div class="eyebrow">Passa il telefono</div>
      <h2>Tocca a ${esc(p.name)}</h2>
      <div class="faces">${p.field.map(f => `<i style="${face(f.card)}"></i>`).join('')}</div>
      <button class="btn primary" data-act="handoff-ok">Sono pronto</button>
    </div>`);
  }

  // ------------------------------------------------------------ fine partita
  function showWinner() {
    const g = A.game;
    if (!g || g.winner === null || A.screen !== 'battle' || A.ended === g) return;
    A.ended = g;
    drop('save');
    recordResult(g);
    // account: la partita vale punti esperienza (non in 2 sullo stesso telefono: non si sa chi è il proprietario)
    const cloudGame = cloudOn() && Cloud.signedIn() && A.mode !== 'pvp';
    if (cloudGame) {
      const meP = A.mode === 'online' ? A.me : 0;
      Cloud.record(g.winner === meP, A.mode, g.players[1 - meP].cpu || null, g.players[meP].cards.filter(id => !S.CARD[id].secret))
        .then(xp => {
          const p = load('profilo', null);
          if (p) { p.xp += xp; if (g.winner === meP) p.vittorie++; else p.sconfitte++; store('profilo', p); }
          const el = document.getElementById('xp-line');
          if (el) el.textContent = `+${xp} punti esperienza${p ? ` · Livello ${Cloud.levelOf(p.xp)}` : ''}`;
          if (p && lv(p.xp) > lv(p.xp - xp)) toastQuick(`Livello ${lv(p.xp)}!`);
        })
        .catch(e => { const el = document.getElementById('xp-line'); if (el) el.textContent = e.message; });
    }
    const w = g.players[g.winner];
    const localWin = A.mode === 'pvp' || (A.mode === 'online' ? g.winner === A.me : g.winner === 0);
    sfx(localWin ? 'win' : 'lose');
    let extra = afterMatch(g, cloudGame);
    // carte sbloccate
    let got = [];
    if (A.mode === 'tutorial') { store('tutorial', true); got = unlockRandom(2); }
    else if (localWin) got = unlockRandom(1);
    if (got.length && cloudOn() && Cloud.signedIn()) Cloud.addToCollection(got.filter(id => !LEGENDS.includes(id))).catch(() => { /* alla prossima sincronizzazione */ });
    // torneo
    let torneoMsg = '';
    if (A.mode === 'torneo') {
      const t = torneo();
      if (g.winner === 0) {
        t.stage++;
        if (t.stage >= TORNEO.length) {
          const first = !(t.titles > 0);
          const md = award('campione'); if (md) extra += `<div class="unlock"><div class="eyebrow">🏅 Nuova medaglia!</div><p>${md.e} ${esc(md.name)}</p></div>`;
          t.stage = 0; t.titles = (t.titles || 0) + 1; got = got.concat(unlockRandom(3));
          if (first && !settings.allUnlocked) got = got.concat(LEGENDS);
          torneoMsg = first ? '🏆 Campione del Tempio! Hai sbloccato le Leggende: Chen Wangting e Chen Zhenglei.' : '🏆 Campione del Tempio! Hai vinto il torneo.';
        }
        else torneoMsg = `Incontro vinto! Prossimo: ${TORNEO[t.stage].name}.`;
      } else torneoMsg = 'Incontro perso: puoi ritentarlo quando vuoi.';
      store('torneo', t);
    }
    if (got.length) extra += `<div class="unlock"><div class="eyebrow">Nuov${got.length > 1 ? 'e carte sbloccate' : 'a carta sbloccata'}!</div><div class="faces">${got.map(id => `<i style="${face(id)}" title="${esc(S.CARD[id].name)}"></i>`).join('')}</div><p>${got.map(id => esc(S.CARD[id].name)).join(', ')}</p></div>`;
    const title = A.mode === 'pvp' ? 'Vittoria!' : (localWin ? (torneoMsg.startsWith('🏆') ? 'Campione!' : 'Vittoria!') : 'Sconfitta');
    const alive = w.field.concat(w.reserve);
    if (A.liveMatch) { const { r, i } = A.liveMatch; liveResult(r, i, w.name); }
    const btns = A.liveMatch ? '<button class="btn primary" data-act="live-back">Torna al tabellone</button>'
      : A.mode === 'torneo'
      ? `<button class="btn primary" data-act="torneo-next">${g.winner === 0 ? (torneo().stage === 0 ? 'Torna al torneo' : 'Prossimo incontro') : 'Ritenta'}</button><button class="btn ghost" data-act="quit-now">Menu</button>`
      : A.mode === 'tutorial'
        ? '<button class="btn primary" data-act="quit-now">Vai al menu</button>'
        : A.mode === 'online'
          ? '<button class="btn primary" data-act="on-rematch">Rivincita</button><button class="btn ghost" data-act="quit-now">Esci</button>'
          : '<button class="btn primary" data-act="rematch">Rivincita</button><button class="btn" data-act="new-game">Cambia squadre</button><button class="btn ghost" data-act="quit-now">Menu</button>';
    openLayer(`<div class="overlay" role="dialog">
      <div class="eyebrow">Fine della sfida · turno ${Math.ceil(g.turnNo / 2)}</div>
      <h2>${title}</h2>
      <p>${esc(w.name)} vince con ${alive.length} cart${alive.length === 1 ? 'a' : 'e'} ancora in piedi.</p>
      <div class="faces">${alive.map(f => `<i style="${face(f.card)}"></i>`).join('')}</div>
      ${torneoMsg ? `<p><b>${esc(torneoMsg)}</b></p>` : ''}
      ${cloudGame ? '<p id="xp-line" class="xp-line" aria-live="polite">Registro la partita…</p>' : ''}
      ${A.mode === 'tutorial' ? '<p>Tutorial completato!</p>' : ''}
      ${extra}
      ${btns}
      <div class="menu-2"><button class="btn" data-act="share-replay">📤 Condividi</button><button class="btn ghost" data-act="watch-replay">▶ Rivedi</button></div>
    </div>`);
  }

  // ------------------------------------------------------------ REPLAY da condividere
  // Una partita è tutta nel suo setup (seme compreso) più l'elenco delle mosse: basta un link per rivederla.
  const toB64url = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const fromB64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  async function packReplay() {
    const setup = Object.assign({}, A.setup, { silent: undefined });
    const bytes = new TextEncoder().encode(JSON.stringify({ r: S.RULES, setup, log: A.log }));
    try { // compresso dove il browser lo permette ("z"), altrimenti così com'è ("j")
      return 'z' + toB64url(new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()));
    } catch (e) { return 'j' + toB64url(bytes); }
  }
  async function unpackReplay(code) {
    const bytes = fromB64url(code.slice(1));
    const json = code[0] === 'z' ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text() : new TextDecoder().decode(bytes);
    const d = JSON.parse(json);
    if (!d || !d.setup || !Array.isArray(d.log) || !Array.isArray(d.setup.players)) throw new Error('replay non valido');
    return d;
  }
  async function shareReplay() {
    const g = A.game;
    const url = `${location.origin}${location.pathname}#replay=${await packReplay()}`;
    const text = `${g.players[0].name} contro ${g.players[1].name}: rivedi la sfida su Stone Temple Cards Game!`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Stone Temple Cards Game', text, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); toastQuick('Link copiato: incollalo dove vuoi.'); }
    catch (e) {
      openLayer(`<div class="overlay" role="dialog"><h2>Il link della sfida</h2><p>Copialo e mandalo a chi vuoi.</p>
        <textarea class="share-link" readonly>${esc(url)}</textarea><button class="btn ghost" data-act="close">Chiudi</button></div>`);
      const t = $layer.querySelector('textarea'); if (t) t.select();
    }
  }
  function startReplay(d) {
    if (d.setup.players.some(p => p.cards.some(id => !S.CARD[id]))) {
      openLayer(`<div class="overlay" role="dialog"><h2>Carte segrete</h2><p>Questa sfida usa carte segrete: per rivederla bisogna averle sbloccate.</p><button class="btn primary" data-act="quit-now">Menu</button></div>`);
      return;
    }
    A.mode = 'replay';
    A.replay = { log: d.log, i: 0, data: d };
    // il setup senza "cpu": nel replay non pensa nessuno, si rivedono le mosse registrate
    A.setup = Object.assign({}, d.setup, { players: d.setup.players.map(p => Object.assign({}, p, { cpu: null })) });
    A.log = [];
    A.game = S.createGame(A.setup); A.game.events = [];
    A.ended = null; A.sel = null; A.hint = null; A.busy = true; A.banner = ''; A.logOpen = false; A.view = 0;
    go('battle');
    if (d.r !== S.RULES) toastQuick('Sfida giocata con una versione precedente: il replay potrebbe non tornare identico.');
    beginOverlay();
  }
  function actionBanner(g, a) {
    if (a.effect) return `${g.players[g.turn].name} gioca ${S.EFFECT[a.effect].name}`;
    const u = S.byUid(g, a.actor);
    if (!u) return '';
    const opt = S.actorOptions(g, u).find(o => o.i === a.move);
    let label = opt ? opt.move.name : '';
    if (opt && a.pick) label = `${opt.move.name} → ${S.refMove(a.pick).name}`;
    return `${u.name}: ${label}`;
  }
  async function runReplay() {
    const g = A.game, R = A.replay;
    while (A.game === g && A.mode === 'replay' && R.i < R.log.length && g.winner === null) {
      const a = R.log[R.i++];
      if (!a.pass) {
        A.banner = `▶ ${actionBanner(g, a)}`; render();
        if (a.actor) mark(a.actor, 'acting'); if (a.target) mark(a.target, 'target');
        await sleep(pace(use3D() ? 350 : 700));
      }
      await perform(a);
      A.banner = ''; render();
      await sleep(pace(250));
    }
    if (A.game !== g) return;
    A.busy = false;
    const w = g.winner !== null ? g.players[g.winner].name : null;
    openLayer(`<div class="overlay" role="dialog"><div class="eyebrow">Fine del replay</div><h2>${w ? `Vince ${esc(w)}` : 'Replay finito'}</h2>
      <button class="btn primary" data-act="replay-again">Rivedi da capo</button><button class="btn ghost" data-act="quit-now">Menu</button></div>`);
  }

  // formula segreta di Flavio
  function formulaPrompt(m) {
    return new Promise(resolve => {
      let left = 10, done = false;
      openLayer(`<div class="overlay formula" role="dialog" aria-label="Formula segreta">
        <div class="eyebrow">${esc(m.name)}</div>
        <h2>Pronuncia la formula!</h2>
        <p>Scrivila entro il tempo per raddoppiare l'effetto.</p>
        <div class="timer num" id="ftimer">10</div>
        <input id="fformula" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(m.formula.split(' ').slice(0, 2).join(' '))}…">
        <button class="btn primary" id="fgo">Lancia la mossa</button>
      </div>`);
      const inp = document.getElementById('fformula');
      const finish = () => {
        if (done) return; done = true; clearInterval(iv);
        const ok = checkFormula(inp.value, m.formula);
        closeLayer(); resolve(ok);
      };
      document.getElementById('fgo').onclick = finish;
      inp.onkeydown = e => { if (e.key === 'Enter') finish(); };
      setTimeout(() => inp.focus(), 50);
      const iv = setInterval(() => { left--; const t = document.getElementById('ftimer'); if (t) t.textContent = left; if (left <= 0) finish(); }, 1000);
    });
  }
  function checkFormula(s, target) {
    const a = s.toLowerCase().replace(/[^a-z]/g, '');
    const b = target.toLowerCase().replace(/[^a-z]/g, '');
    // distanza di Levenshtein: tolleriamo un paio di errori di battitura
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return dp[a.length][b.length] <= 3;
  }

  // ------------------------------------------------------------ avvio partite
  // setup = opzioni di createGame (con seme esplicito): basta questo più l'elenco delle azioni per ricostruire la partita.
  function launch(setup, opts) {
    opts = opts || {};
    A.setup = setup;
    A.log = [];
    A.game = S.createGame(setup);
    A.game.events = [];
    A.stats = { specials: 0, kos: 0, effects: 0, doubleKo: false };
    if (use3D()) Arena3D.preload(setup.players.flatMap(p => p.cards));
    A.ended = null;
    A.sel = null; A.logOpen = false; A.busy = false; A.banner = '';
    A.view = opts.view !== undefined ? opts.view : 0;
    go('battle');
    saveGame();
  }

  function newSetup(players, first, terrain) {
    return {
      seed: Math.floor(Math.random() * 2 ** 31),
      first: first === undefined ? (Math.random() < 0.5 ? 0 : 1) : first,
      gymEvents: settings.events,
      effects: settings.effectCards,
      terrain: terrain === undefined ? pickTerrain(A.terrain) : (S.TERRAIN[terrain] ? terrain : pickTerrain('random')),
      players,
    };
  }

  function startGame(first, sameTeams) {
    const cpu = A.mode === 'cpu';
    if (cpu && !sameTeams) { A.teams[1] = S.randomTeam(null, S.BUDGET - 1, shown().map(c => c.id)); A.weapons[1] = randomWeapon(A.teams[1]); }
    const setup = newSetup([
      { name: A.names[0] || 'Giocatore 1', cards: A.teams[0], weapon: A.weapons[0] },
      { name: cpu ? 'Computer' : (A.names[1] || 'Giocatore 2'), cards: A.teams[1], weapon: A.weapons[1], cpu: cpu ? A.level : null },
    ], first, sameTeams && A.setup ? A.setup.terrain : undefined);
    A.first = setup.first;
    launch(setup, { view: cpu ? 0 : setup.first });
    beginOverlay();
  }

  function startTorneo() {
    const t = torneo(), o = TORNEO[t.stage];
    const setup = newSetup([
      { name: A.names[0] || 'Giocatore 1', cards: A.teams[0], weapon: A.weapons[0] },
      { name: o.name, cards: o.cards, weapon: o.weapon, cpu: o.level, boost: o.boost },
    ], undefined, o.terrain);
    A.first = setup.first;
    launch(setup, { view: 0 });
    beginOverlay();
  }

  function startTutorial() {
    A.mode = 'tutorial';
    A.tut = 0;
    const setup = newSetup([
      { name: A.names[0] || 'Giocatore 1', cards: ['lorenzo', 'grazia', 'remigio', 'caterina'] },
      { name: 'Computer', cards: ['vittorio', 'celeste', 'annastella', 'adriano'], cpu: 'facile' },
    ], 0, 'lancenigo');
    setup.gymEvents = false;
    setup.effects = false;
    A.first = 0;
    launch(setup, { view: 0 });
  }

  function beginOverlay() {
    const g = A.game;
    const opp = A.mode === 'online' ? 1 - A.me : 1;
    // schermata VS: le due squadre entrano dai lati, la scritta VS cala nel mezzo
    const team = (p, side) => {
      const pl = g.players[p];
      return `<div class="vs-team ${side}"><b>${esc(pl.name)}</b>${pl.field.concat(pl.reserve).map(f => `<div class="vs-who"><i style="${face(f.card)}"></i><span>${esc(f.name.split(' ')[0])}${f.weapon ? ' ⚔️' : ''}</span></div>`).join('')}</div>`;
    };
    sfx('event');
    openLayer(`<div class="overlay vs-screen" role="dialog" aria-label="Inizia la sfida">
      <div class="vs-grid">${team(1 - opp, 'left')}<div class="vs-mid">VS</div>${team(opp, 'right')}</div>
      ${g.terrain ? terrainCard(g.terrain) : ''}
      <div class="eyebrow">Lancio della moneta · inizia ${esc(g.players[g.turn].name)}</div>
      <p>Al primo turno chi inizia agisce con 2 carte e solo con attacchi base.</p>
      <button class="btn primary" data-act="begin">Combatti!</button>
    </div>`);
  }

  // ------------------------------------------------------------ salvataggio della partita
  function saveGame() {
    const g = A.game;
    if (!g || A.mode === 'online' || A.mode === 'tutorial' || A.mode === 'replay') return;
    if (g.winner !== null) { drop('save'); return; }
    store('save', { mode: A.mode, level: A.level, names: A.names, teams: A.teams, weapons: A.weapons, setup: A.setup, log: A.log, view: A.view, turnNo: g.turnNo, first: A.first });
  }

  function resumeGame() {
    const s = load('save', null);
    if (!s) return;
    try {
      A.mode = s.mode; A.level = s.level; A.names = s.names; A.teams = s.teams; A.weapons = s.weapons || [null, null]; A.first = s.first;
      const setup = Object.assign({}, s.setup, { silent: true });
      A.setup = s.setup;
      A.game = S.createGame(setup);
      A.log = [];
      for (const a of s.log) applyAct(a);
      A.game.silent = false; A.game.events = [];
      A.ended = null; A.sel = null; A.busy = false; A.banner = ''; A.logOpen = false;
      A.view = A.mode === 'pvp' ? A.game.turn : 0;
      go('battle');
      afterAction();
    } catch (e) {
      drop('save');
      go('home');
    }
  }

  // ------------------------------------------------------------ ONLINE: protocollo
  function onNet(e) {
    const o = A.on || (A.on = { phase: 'menu' });
    if (e.type === 'connected') {
      o.connected = true;
      Net.send({ t: 'hello', name: A.names[0] || 'Giocatore', have: A.mode === 'online' && A.game ? A.log.length : -1 });
      if (o.lost) { o.lost = false; closeLayer(); }
    } else if (e.type === 'disconnected') {
      o.connected = false;
      if (A.mode === 'online' && A.game && A.game.winner === null) connectionLost();
      else if (o.phase === 'lobby') { o.phase = 'menu'; o.error = 'L\'altro giocatore si è scollegato.'; Net.close(); go('online'); }
    } else if (e.type === 'error') {
      if (A.screen === 'online') { o.error = e.message; o.phase = 'menu'; render(); }
    } else if (e.type === 'data') queueMessage(e.data);
  }

  // i messaggi si elaborano in ordine; se portano la chiave delle carte segrete, prima si aprono quelle
  let msgChain = Promise.resolve();
  function queueMessage(m) {
    msgChain = msgChain.then(async () => {
      if (m && typeof m.key === 'string') { try { await openSecret({ key: m.key }); } catch (err) { /* chiave non valida */ } }
      onMessage(m);
    });
  }

  function onMessage(m) {
    const o = A.on;
    if (!m || typeof m !== 'object' || !o) return;
    if (m.t === 'hello') {
      o.oppName = String(m.name || 'Avversario').slice(0, 16);
      if (A.mode === 'online' && A.game) {
        // si è ricollegato durante la partita: gli mando lo stato
        if (Net.role === 'host') Net.send({ t: 'sync', setup: A.setup, log: A.log, key: secretFor(A.setup.players.flatMap(p => p.cards)) });
        return;
      }
      if (o.phase !== 'lobby') {
        o.phase = 'lobby';
        A.mode = 'online'; A.builder = 0; A.filter = 'all';
        A.teams = [load('team0', []).filter(id => unlocked().includes(id)), []];
        if (S.teamCost(A.teams[0]) > S.BUDGET || A.teams[0].length !== S.TEAM_SIZE) A.teams[0] = [];
        A.weapons = [load('weapon0', null), null].map(w => (w && S.WEAPON[w.id] ? w : null));
        go('build');
        toastQuick(`Collegato con ${o.oppName}! Scegli la tua squadra.`);
      }
    } else if (m.t === 'team') {
      o.oppTeam = sanitizeTeam(m.cards);
      o.oppWeapon = sanitizeWeapon(m.weapon, o.oppTeam);
      maybeStartOnline();
    } else if (m.t === 'start') {
      if (Net.role !== 'guest' || !m.setup) return;
      startOnline(m.setup);
    } else if (m.t === 'act') {
      (o.queue = o.queue || []).push(m);
      processRemote();
    } else if (m.t === 'sync-req') {
      Net.send({ t: 'sync', setup: A.setup, log: A.log, key: secretFor(A.setup.players.flatMap(p => p.cards)) });
    } else if (m.t === 'sync') {
      applySync(m);
    } else if (m.t === 'rematch') {
      o.oppRematch = true;
      maybeRematch();
    } else if (m.t === 'bye') {
      if (A.mode === 'online' && A.game && A.game.winner === null) {
        openLayer(`<div class="overlay" role="dialog"><h2>Partita chiusa</h2><p>${esc(o.oppName || 'L\'avversario')} ha lasciato la partita.</p><button class="btn primary" data-act="quit-now">Menu</button></div>`);
      }
    }
  }

  function sanitizeTeam(cards) {
    if (!Array.isArray(cards)) return null;
    const t = cards.filter(id => typeof id === 'string' && S.CARD[id]);
    if (t.length !== S.TEAM_SIZE || new Set(t).size !== S.TEAM_SIZE || S.teamCost(t) > S.BUDGET) return null;
    return t;
  }

  function maybeStartOnline() {
    const o = A.on;
    if (Net.role !== 'host' || !o.myTeam || !o.oppTeam) return;
    const setup = newSetup([
      { name: A.names[0] || 'Giocatore 1', cards: o.myTeam, weapon: o.myWeapon },
      { name: o.oppName || 'Giocatore 2', cards: o.oppTeam, weapon: o.oppWeapon },
    ]);
    Net.send({ t: 'start', setup, key: secretFor(setup.players.flatMap(p => p.cards)) });
    startOnline(setup);
  }

  function startOnline(setup) {
    const o = A.on;
    o.queue = []; o.oppRematch = false; o.myRematch = false;
    A.mode = 'online';
    A.me = Net.role === 'host' ? 0 : 1;
    A.first = setup.first;
    launch(setup, { view: A.me });
    beginOverlay();
  }

  async function processRemote() {
    const o = A.on;
    const g = A.game;
    if (!o || !g || A.busy || A.processing) return;
    if ($layer.querySelector('[data-act="begin"]')) return; // si parte quando chiudo la schermata iniziale
    A.processing = true;
    try {
      while (o.queue && o.queue.length && A.game === g) {
        o.queue.sort((x, y) => x.n - y.n);
        const m = o.queue[0];
        if (m.n < A.log.length) { o.queue.shift(); continue; }
        if (m.n > A.log.length) { Net.send({ t: 'sync-req', have: A.log.length }); break; }
        o.queue.shift();
        A.busy = true;
        const a = m.a || {};
        if (!a.pass) {
          const u = S.byUid(g, a.actor);
          if (u) { A.banner = `${u.name} (${g.players[u.owner].name})`; render(); mark(a.actor, 'acting'); if (a.target) mark(a.target, 'target'); await sleep(pace(use3D() ? 350 : 700)); }
        }
        await perform(a.pass ? { pass: true } : a);
        A.banner = '';
        A.busy = false;
        render();
        if (g.winner !== null) { setTimeout(showWinner, 700); break; }
      }
    } finally {
      A.processing = false;
      A.busy = false;
    }
    if (isLocalTurn()) { render(); }
  }

  function applySync(m) {
    if (!m.setup || !Array.isArray(m.log)) return;
    const same = A.setup && A.setup.seed === m.setup.seed;
    if (!same) { startOnline(m.setup); }
    // ricostruisco la partita dall'inizio con tutte le azioni ricevute
    if (m.log.length >= A.log.length) {
      const setup = Object.assign({}, m.setup, { silent: true });
      A.game = S.createGame(setup);
      A.log = [];
      for (const a of m.log) applyAct(a);
      A.game.silent = false; A.game.events = [];
      A.on.queue = [];
      closeLayer();
      render();
      if (A.game.winner !== null) setTimeout(showWinner, 400);
    }
  }

  function connectionLost() {
    const o = A.on;
    o.lost = true;
    const guest = Net.role === 'guest';
    openLayer(`<div class="overlay" role="dialog">
      <h2>Connessione persa</h2>
      <p>${guest ? 'Il collegamento con l\'altro telefono si è interrotto.' : `In attesa che ${esc(o.oppName || 'l\'altro giocatore')} si ricolleghi…`}</p>
      ${guest ? '<button class="btn primary" data-act="on-rejoin">Ricollegati</button>' : ''}
      <button class="btn ghost" data-act="quit-now">Esci dalla partita</button>
    </div>`);
  }

  function maybeRematch() {
    const o = A.on;
    if (!o.oppRematch || !o.myRematch) return;
    if (Net.role === 'host') {
      const setup = newSetup(A.setup.players.map(p => ({ name: p.name, cards: p.cards, weapon: p.weapon || null })));
      Net.send({ t: 'start', setup, key: secretFor(setup.players.flatMap(p => p.cards)) });
      startOnline(setup);
    }
  }

  function toastQuick(text) {
    const el = document.createElement('div');
    el.className = 'toast small'; el.setAttribute('role', 'status'); el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2200);
  }

  function leaveOnline() {
    if (window.Net && Net.role) { Net.send({ t: 'bye' }); setTimeout(() => Net.close(), 200); }
    A.on = null;
  }

  // ------------------------------------------------------------ LAYER (fogli e sovrapposizioni)
  function openLayer(html) { $layer.innerHTML = html; const b = $layer.querySelector('.btn.primary, .move:not(:disabled), .btn'); if (b && !$layer.querySelector('input')) b.focus({ preventScroll: true }); }
  function closeLayer() { $layer.innerHTML = ''; }

  // ------------------------------------------------------------ EVENTI
  function saveNames() {
    const n0 = document.getElementById('n0'), n1 = document.getElementById('n1');
    if (n0) A.names[0] = n0.value.trim() || 'Giocatore 1';
    if (n1) A.names[1] = n1.value.trim() || 'Giocatore 2';
    store('names', A.names);
  }

  function confirmBox(title, text, yesAct, yesLabel) {
    openLayer(`<div class="overlay" role="dialog"><h2>${esc(title)}</h2><p>${esc(text)}</p><button class="btn primary" data-act="${yesAct}">${esc(yesLabel)}</button><button class="btn" data-act="close">Annulla</button></div>`);
  }

  function handle(e) {
    const el = e.target.closest('[data-act]');
    if (window.Sound) Sound.unlock();
    if (!el) return;
    // clic dentro un foglio: non chiudere
    if (el.dataset.act === 'close' && el.classList.contains('sheet-wrap') && e.target.closest('[data-stop]')) return;
    const kind = el.dataset.act, v = el.dataset.v;
    const g = A.game;
    if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') sfx('tap');
    switch (kind) {
      case 'go': if (v === 'online') A.on = A.on || { phase: 'menu' }; go(v); break;
      case 'mode': A.mode = v; go('setup'); break;
      case 'level': A.level = v; store('level', v); saveNames(); render(); break;
      case 'set': {
        const key = el.dataset.k;
        settings[key] = v === 'true' ? true : v === 'false' ? false : v;
        saveSettings(); render(); break;
      }
      case 'speed':
        settings.speed = v; saveSettings();
        if (window.Arena3D && Arena3D.setSpeed) Arena3D.setSpeed(speedK());
        // aggiorno solo i tasti: un render interromperebbe le scritte sulle carte
        document.querySelectorAll('.speed button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
        break;
      case 'to-build':
        saveNames();
        A.builder = 0; A.filter = 'all';
        A.teams = [load('team0', []), A.mode === 'pvp' ? load('team1', []) : []];
        A.teams = A.teams.map(t => (t.every(id => unlocked().includes(id)) && S.teamCost(t) <= S.BUDGET) ? t : []);
        A.weapons = [load('weapon0', null), A.mode === 'pvp' ? load('weapon1', null) : null].map(w => (w && S.WEAPON[w.id] ? w : null));
        go('build'); break;
      case 'build-back':
        if (A.liveMatch && A.builder === 0) { A.liveMatch = null; go('live'); }
        else if (A.mode === 'online') { leaveOnline(); go('home'); }
        else if (A.mode === 'torneo') go('torneo');
        else if (A.builder === 1) { A.builder = 0; render(); } else go('setup');
        break;
      case 'filter': A.filter = v; render(); break;
      case 'mis-claim': claimMission(v); break;
      case 'board-tab': A.acc.tab = v; render(); break;
      case 'live-size': A.liveSize = +v; render(); break;
      case 'live-start': {
        const size = A.liveSize || 8;
        const names = Array.from({ length: size }, (_, i) => ((document.getElementById('ln' + i) || {}).value || '').trim() || `Giocatore ${i + 1}`);
        if (new Set(names).size !== names.length) { toastQuick('Ogni giocatore deve avere un nome diverso.'); break; }
        store('liveNames', names); store('live', liveNew(names)); render(); break;
      }
      case 'live-win': {
        const L = live(), m = L.rounds[+el.dataset.r][+el.dataset.i];
        liveResult(+el.dataset.r, +el.dataset.i, v === 'a' ? m.a : m.b); render(); break;
      }
      case 'live-play': {
        const L = live(), r = +el.dataset.r, i = +el.dataset.i, m = L.rounds[r][i];
        A.liveMatch = { r, i };
        A.mode = 'pvp'; A.names = [m.a, m.b]; A.teams = [[], []]; A.weapons = [null, null];
        A.builder = 0; A.filter = 'all';
        go('build'); break;
      }
      case 'live-back': A.liveMatch = null; A.game = null; go('live'); break;
      case 'live-reset': confirmBox('Chiudere il torneo?', 'Il tabellone verrà cancellato. I nomi restano per il prossimo.', 'live-reset-yes', 'Chiudi il torneo'); break;
      case 'live-reset-yes': drop('live'); closeLayer(); render(); break;
      case 'acc-mode': A.acc.mode = v; A.acc.msg = ''; A.acc.info = ''; render(); break;
      case 'acc-guest': try { sessionStorage.setItem('stt_ospite', '1'); } catch (err) { /* niente */ } go('home'); break;
      case 'acc-login': case 'acc-signup': case 'acc-recover': {
        const c = A.acc;
        c.email = ((document.getElementById('acc-email') || {}).value || '').trim();
        c.pw = (document.getElementById('acc-pass') || {}).value || ''; // solo in memoria, per non doverla riscrivere dopo un errore
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) { c.msg = 'Scrivi un indirizzo email valido.'; render(); break; }
        if (kind !== 'acc-recover' && c.pw.length < 6) { c.msg = 'La password deve avere almeno 6 caratteri.'; render(); break; }
        if (kind === 'acc-login') accDo(Cloud.signIn(c.email, c.pw), () => { c.pw = ''; c.loaded = false; c.afterLogin = true; accountLoad(); });
        else if (kind === 'acc-signup') accDo(Cloud.signUp(c.email, c.pw), r => {
          c.pw = '';
          if (r.signedIn) { c.loaded = false; accountLoad(); }
          else { c.mode = 'login'; c.info = `Account creato! Ti abbiamo mandato un'email a ${c.email}: apri il link per confermarla, poi entra qui con la tua password.`; }
        });
        else accDo(Cloud.recover(c.email), () => { c.info = `Se ${c.email} ha un account, ti abbiamo mandato il link per la nuova password.`; });
        break;
      }
      case 'acc-newpass': {
        const pw = (document.getElementById('acc-pass') || {}).value || '';
        if (pw.length < 6) { A.acc.msg = 'La password deve avere almeno 6 caratteri.'; render(); break; }
        accDo(Cloud.setPassword(pw), () => { A.acc.mode = 'login'; toastQuick('Password cambiata!'); A.acc.loaded = false; accountLoad(); });
        break;
      }
      case 'acc-create': case 'acc-rename': {
        const nome = ((document.getElementById('acc-name') || {}).value || '').trim();
        if (nome.length < 2) { A.acc.msg = 'Il nome deve avere almeno 2 caratteri.'; render(); break; }
        accDo(kind === 'acc-create' ? Cloud.createProfile(nome) : Cloud.rename(nome), () => { A.acc.loaded = false; accountLoad(); });
        break;
      }
      case 'acc-logout': accDo(Cloud.logout(), () => { drop('profilo'); A.acc = { board: A.acc.board }; }); break;
      case 'egg': {
        const now = Date.now();
        A.egg = (A.egg || []).filter(t => now - t < 4000).concat(now);
        if (A.egg.length >= 7) { A.egg = []; secretPrompt(); }
        break;
      }
      case 'egg-try': {
        const inp = document.getElementById('segreto'), out = document.getElementById('segreto-esito');
        if (!inp) break;
        out.textContent = 'Il tempio ascolta…';
        openSecret({ phrase: inp.value, persist: true })
          .then(() => { closeLayer(); render(); toastQuick('Hai svelato le carte segrete!'); })
          .catch(() => { out.textContent = 'Il tempio resta in silenzio.'; });
        break;
      }
      case 'terrain':
        if (lockedAt('terrain', v)) { toastQuick(`Si sblocca al livello ${lockedAt('terrain', v)}.`); break; }
        A.terrain = v; store('terrain', v); saveNames(); render(); break;
      case 'terrain-info': {
        const t = S.TERRAIN[g.terrain];
        openLayer(`<div class="sheet-wrap" data-act="close"><div class="sheet" role="dialog" aria-label="${esc(t.name)}" data-stop>${terrainCard(g.terrain)}<button class="btn ghost" data-act="close">Chiudi</button></div></div>`);
        break;
      }
      case 'pick': {
        if (!unlocked().includes(v)) { cardSheet(v); break; }
        const t = A.teams[A.builder];
        const i = t.indexOf(v);
        if (i >= 0) t.splice(i, 1);
        else if (t.length < S.TEAM_SIZE && S.teamCost(t) + S.CARD[v].cost <= S.BUDGET) t.push(v);
        render(); break;
      }
      case 'unpick': A.teams[A.builder].splice(+v, 1); render(); break;
      case 'random-team': A.teams[A.builder] = S.randomTeam(null, S.BUDGET - 1, unlocked()); render(); break;
      case 'confirm-team':
        store('team' + A.builder, A.teams[A.builder]);
        store('weapon' + A.builder, A.weapons[A.builder]);
        if (A.mode === 'pvp' && A.builder === 0) {
          A.builder = 1; A.filter = 'all'; render(); window.scrollTo(0, 0);
          openLayer(`<div class="overlay" role="dialog"><div class="eyebrow">Squadra pronta</div><h2>Passa il telefono a ${esc(A.names[1])}</h2><p>Ora tocca a ${esc(A.names[1])} scegliere la sua squadra.</p><button class="btn primary" data-act="close">Sono pronto</button></div>`);
        } else if (A.mode === 'torneo') startTorneo();
        else if (A.mode === 'online') {
          A.on.myTeam = A.teams[0].slice();
          A.on.myWeapon = sanitizeWeapon(A.weapons[0], A.on.myTeam);
          Net.send({ t: 'team', cards: A.on.myTeam, weapon: A.on.myWeapon, key: secretFor(A.on.myTeam) });
          openLayer(`<div class="overlay" role="dialog"><div class="eyebrow">Squadra pronta</div><h2>In attesa di ${esc(A.on.oppName || 'avversario')}</h2><p>La partita parte quando anche l'altra squadra è pronta.</p><button class="btn ghost" data-act="close">Cambia squadra</button></div>`);
          maybeStartOnline();
        } else startGame();
        break;
      case 'card': e.stopPropagation(); cardSheet(v); break;
      case 'close': closeLayer(); if (A.screen === 'battle' && A.mode === 'tutorial') render(); break;
      case 'begin': closeLayer(); if (A.mode === 'replay') runReplay(); else if (g.players[g.turn].cpu) runCPU(); else if (A.mode === 'online') processRemote(); break;
      case 'share-replay': shareReplay(); break;
      case 'watch-replay': startReplay({ r: S.RULES, setup: A.setup, log: A.log.slice() }); break;
      case 'replay-again': closeLayer(); startReplay(A.replay.data); break;
      case 'handoff-ok': A.view = g.turn; closeLayer(); render(); break;
      case 'log': A.logOpen = !A.logOpen; render(); if (A.logOpen) { const l = $app.querySelector('.log'); if (l) l.scrollTop = l.scrollHeight; } break;
      case 'tile': {
        if (!g) break;
        A.hint = null;
        const f = S.byUid(g, v);
        if (!f) break;
        if (A.sel) {
          if (A.sel.targets.includes(v)) {
            if (A.sel.effect) act({ effect: A.sel.effect, target: v });
            else act({ actor: A.sel.actor, move: A.sel.move, pick: A.sel.pick, target: v }, A.sel.inner);
          }
          else if (v === A.sel.actor) { A.sel = null; A.banner = ''; render(); }
          break;
        }
        actorSheet(f);
        break;
      }
      case 'move': if (!A.busy) chooseMove(el.dataset.uid, +el.dataset.i); break;
      case 'copy-pick': chooseMove(el.dataset.uid, +el.dataset.i, { card: el.dataset.card, i: +el.dataset.mi }); break;
      case 'cancel-sel': A.sel = null; A.banner = ''; render(); break;
      case 'effect': {
        if (!isLocalTurn() || A.busy) break;
        A.hint = null;
        const x = S.EFFECT[v];
        if (!S.effectOptions(g).includes(x)) break;
        if (A.sel && A.sel.effect === v) { A.sel = null; A.banner = ''; render(); break; }
        if (x.target === 'none') { act({ effect: v, target: null }); break; }
        A.sel = { effect: v, targets: S.effectTargets(g, g.turn, x).map(f => f.uid) };
        A.banner = `${x.name}: tocca il bersaglio`;
        render(); break;
      }
      case 'hint': {
        // il computer pensa come al livello normale e propone la mossa che sceglierebbe
        const a = S.chooseAction(g, 'normale');
        A.hint = a ? { a, text: hintText(g, a) } : { a: {}, text: 'Nessuna mossa utile: chiudi il turno.' };
        render(); break;
      }
      case 'hint-do': {
        const h = A.hint && A.hint.a;
        if (h && h.effect && !A.busy) { act({ effect: h.effect, target: h.target }); break; }
        if (!h || !h.actor || A.busy) break;
        const u = S.byUid(g, h.actor), opt = S.actorOptions(g, u).find(o => o.i === h.move);
        if (!opt || !opt.ok) { A.hint = null; render(); break; }
        act({ actor: h.actor, move: h.move, pick: h.pick, target: h.target }, h.pick ? S.refMove(h.pick) : opt.move);
        break;
      }
      case 'end-turn':
        A.hint = null;
        if (isLocalTurn() && !A.busy) {
          A.busy = true;
          perform({ pass: true }, true).then(() => { A.busy = false; afterAction(); });
        }
        break;
      case 'quit':
        confirmBox('Abbandoni?', A.mode === 'online' ? 'La partita online verrà chiusa anche per l\'altro giocatore.' : 'Puoi riprendere la partita dal menu.', 'quit-now', 'Esci dalla partita');
        break;
      case 'quit-now':
        if (A.mode === 'online') leaveOnline();
        A.liveMatch = null;
        A.game = null; A.tut = -1; go('home'); break;
      case 'rematch': closeLayer(); startGame(1 - A.first, true); break;
      case 'new-game': A.game = null; closeLayer(); A.builder = 0; go('build'); break;
      case 'resume': resumeGame(); break;
      case 'tutorial': case 'replay-tutorial': startTutorial(); break;
      case 'tut-done': A.tut = TUT.length; render(); break;
      case 'install': if (installEvt) { installEvt.prompt(); installEvt = null; render(); } break;
      case 'reset-stats': confirmBox('Azzerare la classifica?', 'Tutti i risultati salvati su questo telefono verranno cancellati.', 'reset-stats-yes', 'Azzera'); break;
      case 'reset-stats-yes': drop('stats'); closeLayer(); render(); break;
      case 'reset-progress': confirmBox('Azzerare i progressi?', 'Carte sbloccate, torneo e tutorial tornano come all\'inizio. La classifica resta.', 'reset-progress-yes', 'Azzera'); break;
      case 'reset-progress-yes': drop('unlocked'); drop('torneo'); drop('tutorial'); closeLayer(); render(); break;
      // torneo
      case 'torneo-go':
        saveNames();
        A.mode = 'torneo'; A.builder = 0; A.filter = 'all';
        A.teams = [load('team0', []).filter(id => unlocked().includes(id)), []];
        if (A.teams[0].length !== S.TEAM_SIZE || S.teamCost(A.teams[0]) > S.BUDGET) A.teams[0] = [];
        A.weapons = [load('weapon0', null), null].map(w => (w && S.WEAPON[w.id] ? w : null));
        go('build'); break;
      case 'torneo-next': A.game = null; closeLayer(); if (torneo().stage === 0) go('torneo'); else { A.mode = 'torneo'; go('build'); } break;
      case 'torneo-reset': confirmBox('Ricominciare il torneo?', 'Riparti dal primo incontro. I titoli vinti restano.', 'torneo-reset-yes', 'Ricomincia'); break;
      case 'torneo-reset-yes': { const t = torneo(); t.stage = 0; store('torneo', t); closeLayer(); render(); break; }
      // online
      case 'on-host':
        saveNames();
        A.on = { phase: 'wait-host' }; render();
        Net.host(onNet).then(code => { if (A.on && A.on.phase === 'wait-host') { A.on.code = code; render(); } })
          .catch(err => { A.on = { phase: 'menu', error: err.message }; render(); });
        break;
      case 'on-join': {
        saveNames();
        const code = (document.getElementById('oncode') || {}).value || '';
        A.on = { phase: 'connecting', typed: code }; render();
        Net.join(code, onNet).catch(err => { A.on = { phase: 'menu', error: err.message, typed: code }; render(); });
        break;
      }
      case 'on-cancel': leaveOnline(); go('home'); break;
      case 'on-rejoin':
        openLayer('<div class="overlay" role="dialog"><h2>Mi ricollego…</h2></div>');
        Net.rejoin().catch(() => connectionLost());
        break;
      case 'on-rematch':
        A.on.myRematch = true; Net.send({ t: 'rematch' });
        openLayer(`<div class="overlay" role="dialog"><h2>Rivincita</h2><p>In attesa di ${esc(A.on.oppName || 'avversario')}…</p><button class="btn ghost" data-act="quit-now">Esci</button></div>`);
        maybeRematch();
        break;
    }
  }
  document.addEventListener('click', handle);
  // tendine dell'arma nella scelta della squadra
  document.addEventListener('change', e => {
    const k = e.target.dataset && e.target.dataset.change;
    if (!k) return;
    if (k === 'showpw') { const p = document.getElementById('acc-pass'); if (p) p.type = e.target.checked ? 'text' : 'password'; return; }
    const t = A.teams[A.builder], w = A.weapons[A.builder];
    if (k === 'weapon') A.weapons[A.builder] = e.target.value ? { id: e.target.value, card: (w && w.card) || t[0] || null } : null;
    if (k === 'weapon-card' && w) w.card = e.target.value;
    render();
  });
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); handle(e); }
    if (e.key === 'Enter' && ['acc-email', 'acc-pass', 'acc-name'].includes(e.target.id)) { const b = $app.querySelector('[data-act^="acc-"].primary, [data-act="acc-rename"]'); if (b) handle({ target: b }); }
    if (e.key === 'Enter' && e.target.id === 'segreto') handle({ target: document.querySelector('[data-act="egg-try"]') });
    if (e.key === 'Escape' && $layer.innerHTML && !$layer.querySelector('input') && $layer.querySelector('.sheet')) closeLayer();
  });
  window.addEventListener('beforeunload', () => { if (A.mode === 'online' && window.Net && Net.role) Net.send({ t: 'bye' }); });

  // ------------------------------------------------------------ app installabile (fuori dall'anteprima)
  if ('serviceWorker' in navigator && window.top === window && /^https:$|^http:$/.test(location.protocol) && location.hostname !== 'localhost') {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* non installabile qui */ }); });
  }

  // solo per i test automatici (indirizzo che termina con #test)
  if (location.hash === '#test') window.__sttTest = { A, S, packReplay };

  const replayLink = location.hash.startsWith('#replay=');
  render();
  if (cloudOn()) {
    Cloud.init().then(r => {
      if (r.recovery) { A.acc = { mode: 'newpass' }; go('account'); }
      else if (r.signedIn) { toastQuick('Email confermata: sei dentro!'); A.acc = { afterLogin: true }; go('account'); }
      else if (r.error) toastQuick(r.error);
      else if (Cloud.signedIn()) Cloud.profile().then(p => { if (p) { store('profilo', p); syncCollection(); if (A.screen === 'home') render(); } }).catch(() => { /* offline */ });
      // l'accesso è la prima cosa che si vede, finché non si entra o si sceglie di giocare senza account
      let guestNow = false; try { guestNow = !!sessionStorage.getItem('stt_ospite'); } catch (err) { /* niente */ }
      if (!Cloud.signedIn() && !guestNow && !replayLink && A.screen === 'home' && !$layer.innerHTML) { A.acc = Object.assign(A.acc || {}, { start: true }); go('account'); }
    });
  }
  const savedKey = load('chiave', null);
  // carte segrete già sbloccate: le riapro (con due nuovi tentativi se la rete fa i capricci)
  let secretDone;
  const secretReady = new Promise(res => { secretDone = res; });
  function reopenSecret(tries) {
    openSecret({ key: savedKey, persist: true })
      .then(() => { if (A.screen !== 'battle') render(); secretDone(); })
      .catch(e => {
        if (e && e.name === 'OperationError') drop('chiave'); // frase cambiata: chiave vecchia
        if (tries > 0 && !(e && e.name === 'OperationError')) setTimeout(() => reopenSecret(tries - 1), 3000);
        else secretDone();
      });
  }
  if (savedKey) reopenSecret(2); else secretDone();
  // aperto da un link di replay: si rivede la sfida (dopo aver riaperto le eventuali carte segrete)
  if (replayLink) {
    const code = location.hash.slice('#replay='.length);
    history.replaceState(null, '', location.pathname + location.search);
    secretReady.then(() => unpackReplay(code)).then(startReplay).catch(() => toastQuick('Il link della sfida non è valido.'));
  }
})();
