/* STONE TEMPLE TAO — interfaccia per telefono */
(function () {
  'use strict';
  const S = window.STT;
  const $app = document.getElementById('app');
  const $layer = document.getElementById('layer');

  const A = {
    screen: 'home', mode: 'cpu', level: 'normale',
    names: ['Giocatore 1', 'Giocatore 2'],
    teams: [[], []], builder: 0, filter: 'all',
    game: null, view: 0, sel: null, busy: false, logOpen: false, banner: '', first: 0,
  };

  // ------------------------------------------------------------ utilità
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const face = id => `background-image:url(img/volti/${id}.jpg)`;
  const RANK_SHORT = { A: 'Allievo', I: 'Istruttore', M: 'Maestro' };
  function store(k, v) { try { localStorage.setItem('stt_' + k, JSON.stringify(v)); } catch (e) { /* niente */ } }
  function load(k, d) { try { const v = localStorage.getItem('stt_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  A.level = load('level', 'normale');
  const reduced = (() => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  A.anim = load('anim', reduced ? 'off' : 'full'); // full | fast | off
  const ANIM_LABEL = { full: '3D', fast: '3D veloce', off: 'Senza 3D' };
  A.names = load('names', A.names);

  function moveMeta(m) {
    if (m.passive) return m.cd ? `Passiva · si ricarica in ${m.cd} turni` : 'Passiva';
    if (m.once) return 'Una volta per partita';
    if (m.free) return `Non usa il turno · ricarica ${m.cd} turni`;
    return m.cd ? `Ricarica ${m.cd} turn${m.cd > 1 ? 'i' : 'o'}` : '';
  }

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
        case 'counter': out.push(['good', compact ? `Dadi${d(s)}` : `Fuckgammon pronto${d(s)}`]); break;
        case 'hidden': out.push(['good', `Sparizione${d(s)}`]); break;
        case 'immune': out.push(['good', `Immunità${d(s)}`]); break;
        case 'nextAtkMul': out.push(['good', `Colpo ×${v}`]); break;
        case 'feint': out.push(['good', 'Finta']); break;
        case 'dmgOut': out.push(['good', `Danni ×${v}${d(s)}`]); break;
        case 'dmgIn': out.push(['bad', `Subisce ×${v}${d(s)}`]); break;
        case 'stunGuard': if (!compact) out.push(['info', `Non stordibile${d(s)}`]); break;
        case 'vibrOff': if (!compact) out.push(['info', `Vibrazione spenta${d(s)}`]); break;
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
  function go(screen) { A.screen = screen; closeLayer(); render(); window.scrollTo(0, 0); }
  function render() {
    const fn = { home: renderHome, setup: renderSetup, build: renderBuild, battle: renderBattle, collection: renderCollection, rules: renderRules }[A.screen];
    $app.innerHTML = fn();
  }

  // ------------------------------------------------------------ HOME
  function renderHome() {
    const ids = S.CARDS.map(c => c.id).sort(() => Math.random() - 0.5).slice(0, 5);
    return `<div class="home">
      <div class="hero">
        <img src="img/retro.jpg" alt="Retro delle carte Stone Temple Tao">
        <div>
          <div class="eyebrow">Scuola di Tradizionali Arti Orientali</div>
          <h1>Stone Temple Tao</h1>
          <p>Il torneo di carte della palestra: ${S.CARDS.length} combattenti, 3 contro 3, una riserva a testa.</p>
        </div>
      </div>
      <div class="fan" aria-hidden="true">${ids.map((id, i) => `<img src="img/${id}.jpg" alt="" style="transform:rotate(${(i - 2) * 7}deg) translateY(${Math.abs(i - 2) * 8}px)">`).join('')}</div>
      <div class="menu">
        <button class="btn primary" data-act="mode" data-v="cpu">Sfida il computer</button>
        <button class="btn" data-act="mode" data-v="pvp">2 giocatori · stesso telefono</button>
        <button class="btn ghost" data-act="go" data-v="collection">Collezione carte</button>
        <button class="btn ghost" data-act="go" data-v="rules">Come si gioca</button>
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
      <div class="eyebrow">Animazioni</div>
      <div class="seg" role="group" aria-label="Animazioni">
        ${['full', 'fast', 'off'].map(l => `<button data-act="anim" data-v="${l}" aria-pressed="${A.anim === l}">${ANIM_LABEL[l]}</button>`).join('')}
      </div>
      <p class="hint" style="text-align:left">Ognuno sceglie 4 carte spendendo al massimo ${S.BUDGET} Punti Dojo: le prime 3 vanno in campo, la quarta resta in riserva ed entra quando una tua carta va K.O.</p>
      <button class="btn primary" data-act="to-build">Scegli la squadra →</button>
    </div>`;
  }

  // ------------------------------------------------------------ COSTRUZIONE SQUADRA
  function renderBuild() {
    const team = A.teams[A.builder];
    const cost = S.teamCost(team);
    const pips = Array.from({ length: S.BUDGET }, (_, i) => `<i class="${i < cost ? (cost > S.BUDGET ? 'over' : 'on') : ''}"></i>`).join('');
    const slots = [0, 1, 2, 3].map(i => {
      const id = team[i];
      const who = i < 3 ? `Campo ${i + 1}` : 'Riserva';
      if (!id) return `<button class="slot ${i === 3 ? 'res' : ''}" aria-label="${who} vuoto" disabled><span class="who">${who}</span></button>`;
      return `<button class="slot ${i === 3 ? 'res' : ''}" data-act="unpick" data-v="${i}" aria-label="Togli ${esc(S.CARD[id].name)}"><span class="who">${who}</span><span class="face" style="${face(id)}"></span><span class="nm">${esc(S.CARD[id].name)}</span></button>`;
    }).join('');
    const filters = [['all', 'Tutti'], ['M', 'Maestri'], ['I', 'Istruttori'], ['A', 'Allievi']];
    const pool = S.CARDS.filter(c => A.filter === 'all' || c.rank === A.filter).map(c => {
      const chosen = team.includes(c.id);
      const nope = !chosen && (team.length >= S.TEAM_SIZE || cost + c.cost > S.BUDGET);
      return `<div class="pick ${chosen ? 'chosen' : ''} ${nope ? 'nope' : ''}" role="button" tabindex="0" data-act="pick" data-v="${c.id}" aria-label="${esc(c.name)}, costo ${c.cost}">
        <span class="face" style="${face(c.id)}"></span>
        <span class="rank ${c.rank}">${RANK_SHORT[c.rank]}</span>
        <span class="cost num">${c.cost}</span>
        <span class="meta"><span class="nm">${esc(c.name)}</span><span class="st num">PV ${c.hp} · ATK ${c.atk} · DEF ${c.def}</span></span>
        <span class="info-dot" data-act="card" data-v="${c.id}" aria-label="Dettagli ${esc(c.name)}">i</span>
      </div>`;
    }).join('');
    return `<div class="topbar"><button class="back" data-act="build-back">← Indietro</button><div class="eyebrow">Squadra di ${esc(A.names[A.builder])}</div></div>
    <div class="builder">
      <div class="slots">${slots}</div>
      <div class="budget num"><span>Punti Dojo</span><div class="pips">${pips}</div><span>${cost}/${S.BUDGET}</span></div>
      <div class="filters" role="group" aria-label="Filtra per grado">${filters.map(([v, l]) => `<button data-act="filter" data-v="${v}" aria-pressed="${A.filter === v}">${l}</button>`).join('')}</div>
      <div class="pool">${pool}</div>
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
    openLayer(`<div class="sheet-wrap" data-act="close"><div class="sheet" role="dialog" aria-label="${esc(c.name)}" data-stop>
      <div class="sheet-head"><div><h3>${esc(c.name)}</h3><p>${RANK_SHORT[c.rank]} · costo ${c.cost} Punti Dojo</p></div></div>
      <div class="statline num"><span>PV <b>${c.hp}</b></span><span>ATK ${diff('atk')}<b>${c.atk}</b></span><span>DEF ${diff('def')}<b>${c.def}</b></span></div>
      ${c.moves.map(m => `<div class="move special"><div class="mh"><span class="mn">${esc(m.name)}</span><span class="why">${esc(moveMeta(m))}</span></div><div class="md">${esc(m.desc)}</div></div>`).join('')}
      <div class="card-full"><img src="img/${id}.jpg" alt="Carta originale di ${esc(c.name)}"></div>
      <p class="hint">Carta originale. In gioco valgono i valori scritti sopra (i numeri barrati sono quelli stampati).</p>
      <button class="btn" data-act="close">Chiudi</button>
    </div></div>`);
  }

  // ------------------------------------------------------------ COLLEZIONE
  function renderCollection() {
    return `<div class="topbar"><button class="back" data-act="go" data-v="home">← Menu</button><div class="eyebrow">${S.CARDS.length} carte</div></div>
    <h2 style="margin-bottom:12px">Collezione</h2>
    <div class="collection">${S.CARDS.map(c => `<div class="pick" role="button" tabindex="0" data-act="card" data-v="${c.id}">
      <span class="face" style="${face(c.id)}"></span><span class="rank ${c.rank}">${RANK_SHORT[c.rank]}</span><span class="cost num">${c.cost}</span>
      <span class="meta"><span class="nm">${esc(c.name)}</span><span class="st num">PV ${c.hp} · ATK ${c.atk} · DEF ${c.def}</span></span></div>`).join('')}</div>`;
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
      </ul>
      <h3>Il turno</h3>
      <ul>
        <li>Nel tuo turno <b>ogni tua carta in campo agisce una volta</b>, nell'ordine che vuoi. Tocca una carta e scegli: <code>Attacco</code> o una delle sue <b>mosse speciali</b>.</li>
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
        <li><b>Istruttori e Maestri</b> contano per alcune mosse (per esempio lo Sputo dell'Ultralama è doppio sugli Istruttori).</li>
      </ul>
      <h3>Vittoria</h3>
      <p>Vince chi manda K.O. tutte le carte avversarie, riserva compresa.</p>
      <h3>Segreti</h3>
      <ul>
        <li>Con Flavio, prima del Delirio Onnipotente hai 10 secondi per scrivere la formula segreta. Se la sbagli la mossa parte lo stesso, ma senza raddoppio.</li>
        <li>Quando Chen usa la Spallata del Prodigio, a volte parte la musica dei Prodigy…</li>
      </ul>
    </div>`;
  }

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
    return `<button class="${classes.join(' ')}" data-act="tile" data-v="${f.uid}" aria-label="${esc(f.name)}, ${f.hp} PV su ${f.maxHp}">
      <span class="face" style="${face(f.card)}"><span class="rank ${f.rank}">${RANK_SHORT[f.rank]}</span></span>
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
    const humanTurn = isHumanTurn() && g.turn === p;
    const sel = A.sel;
    const tiles = pl.field.map(f => tileHtml(g, f, {
      acted: humanTurn && f.acted,
      selected: sel && sel.actor === f.uid,
      target: sel && sel.targets.includes(f.uid),
      dim: sel && !sel.targets.includes(f.uid) && sel.actor !== f.uid,
    })).join('');
    return `<div class="row-fighters ${pl.field.length > 3 ? 'four' : ''}" style="grid-template-columns:repeat(${Math.max(pl.field.length, 3)},1fr)">${tiles}</div>`;
  }

  function sideBar(g, p) {
    const pl = g.players[p];
    const res = pl.reserve.length ? `Riserva: ${pl.reserve.map(f => esc(f.name.split(' ')[0])).join(', ')}` : 'Nessuna riserva';
    return `<div class="bar"><div class="side-name ${g.turn === p && g.winner === null ? 'active' : ''}"><i class="turn-dot"></i><span>${esc(pl.name)}</span></div><div class="res-info">${res} · K.O. ${pl.ko.length}</div></div>`;
  }

  function isHumanTurn() { const g = A.game; return g && g.winner === null && !g.players[g.turn].cpu; }

  function renderBattle() {
    const g = A.game;
    const me = A.view, opp = 1 - me;
    const lines = g.log.slice(A.logOpen ? -80 : -3).map(t => `<p>${esc(t)}</p>`).join('');
    let banner = A.banner;
    if (!banner) {
      if (g.winner !== null) banner = `${g.players[g.winner].name} ha vinto!`;
      else if (A.sel) banner = 'Tocca il bersaglio';
      else if (isHumanTurn()) banner = g.turnNo <= 2 ? 'Tocca una tua carta per farla agire' : `Turno ${Math.ceil(g.turnNo / 2)} · tocca a ${g.players[g.turn].name}`;
      else banner = `${g.players[g.turn].name} sta pensando…`;
    }
    const canEnd = isHumanTurn() && !A.busy;
    return `<div class="battle">
      <div class="bar"><button class="back" data-act="quit">← Esci</button><div class="eyebrow num">Turno ${Math.ceil(g.turnNo / 2)}</div><button class="back" data-act="anim-cycle" aria-label="Animazioni: ${ANIM_LABEL[A.anim]}">${ANIM_LABEL[A.anim]}</button></div>
      ${sideBar(g, opp)}
      ${rowHtml(g, opp)}
      <div class="mid">
        <div class="banner" aria-live="polite">${esc(banner)}</div>
        <div class="log ${A.logOpen ? 'open' : ''}" data-act="log" role="button" tabindex="0" aria-label="Registro della partita">${lines || '<p>La sfida ha inizio.</p>'}</div>
      </div>
      ${rowHtml(g, me)}
      ${sideBar(g, me)}
      <div class="actions-row">
        ${A.sel ? '<button class="btn" data-act="cancel-sel">Annulla</button>' : `<button class="btn ghost" data-act="log">${A.logOpen ? 'Chiudi registro' : 'Registro'}</button>`}
        <button class="btn primary" data-act="end-turn" ${canEnd && !A.sel ? '' : 'disabled'}>Fine turno</button>
      </div>
    </div>`;
  }

  // scheda azioni di una carta
  function actorSheet(f) {
    const g = A.game;
    const mine = isHumanTurn() && f.owner === g.turn && !A.busy;
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
      ${chips.length ? `<div class="chips">${chipsHtml(chips)}</div>` : ''}
      ${list}
      <button class="btn ghost" data-act="close">Chiudi</button>
    </div></div>`);
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
      render();
    } else {
      act({ actor: uid, move: i, pick, target: null }, inner);
    }
  }

  async function act(a, inner) {
    const g = A.game;
    if (inner && inner.formula) a.formula = await formulaPrompt();
    A.sel = null; A.banner = '';
    A.busy = true;
    await perform(a);
    A.busy = false;
    afterAction();
  }

  // ------------------------------------------------------------ animazioni 3D
  function use3D() { return A.anim !== 'off' && window.Arena3D && window.Arena3D.available(); }

  // fotografa chi agisce e chi viene colpito prima che l'azione cambi il campo
  function describe(g, a) {
    const u = S.byUid(g, a.actor);
    const opt = S.actorOptions(g, u).find(o => o.i === a.move);
    const m = opt ? opt.move : S.BASIC;
    const exec = (m.target === 'copy' || m.target === 'bottle') ? S.refMove(a.pick || g.lastSpecial) : m;
    const info = uid => { const f = S.byUid(g, uid); return { uid, card: f.card, name: f.name, rank: f.rank, owner: f.owner }; };
    let tg = [];
    if (a.target) tg = [a.target];
    else if (exec.target === 'enemies') tg = S.enemies(g, u.owner).map(f => f.uid);
    else if (exec.target === 'allies') tg = S.team(g, u.owner).map(f => f.uid).filter(x => x !== u.uid);
    else if (exec.target === 'none' && exec.offensive) tg = S.field(g).map(f => f.uid).filter(x => x !== u.uid);
    return { actor: info(u.uid), move: exec.name, label: exec !== m ? `${m.name} → ${exec.name}` : m.name, targets: tg.map(info), info };
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
        if (e.text === 'IMMUNE') x.immune = true;
      } else if (e.type === 'log') {
        if (e.text.includes('Prodigy')) flags.prodigy = true;
        if (e.text.includes('perde il controllo')) flags.confused = true;
        if (e.text.includes('Fuckgammon!')) flags.counter = true;
        if (e.text.toLowerCase().includes('fate tiri')) flags.formula = true;
      }
    }
    const ids = d.targets.map(t => t.uid);
    const extra = Object.keys(out).filter(uid => uid !== d.actor.uid && !ids.includes(uid));
    const targets = d.targets.concat(extra.map(uid => d.info(uid)))
      .map(t => Object.assign({}, t, { ally: t.owner === d.actor.owner, out: out[t.uid] }));
    const self = out[d.actor.uid];
    if (self && flags.confused) self.confuse = false;
    return { attacker: d.actor, move: d.move, label: d.label, targets, self, flags, speed: A.anim === 'fast' ? 1.8 : 1 };
  }

  async function perform(a) {
    const g = A.game;
    const d = use3D() ? describe(g, a) : null;
    S.doAction(g, a);
    const evs = g.events.splice(0);
    if (!d) { await playEvents(evs); return; }
    let cut = evs.findIndex(e => e.type === 'turn');
    if (cut < 0) cut = evs.length;
    try { await window.Arena3D.play(buildSpec(d, evs.slice(0, cut))); } catch (e) { /* in caso di errore si prosegue senza 3D */ }
    render();
    await playEvents(evs.slice(cut));
  }

  function afterAction() {
    const g = A.game;
    render();
    if (g.winner !== null) { setTimeout(showWinner, 700); return; }
    if (g.players[g.turn].cpu) { runCPU(); return; }
    if (A.mode === 'pvp' && g.turn !== A.view) handoff();
  }

  async function runCPU() {
    const g = A.game;
    A.busy = true; render();
    await sleep(700);
    let guard = 0;
    while (g.winner === null && g.players[g.turn].cpu && guard++ < 30) {
      const a = S.chooseAction(g, A.level);
      if (!a) { S.passTurn(g); break; }
      const u = S.byUid(g, a.actor);
      const opt = S.actorOptions(g, u).find(o => o.i === a.move);
      let label = opt ? opt.move.name : '';
      if (opt && a.pick) label = `${opt.move.name} → ${S.refMove(a.pick).name}`;
      A.banner = `${u.name}: ${label}`;
      render();
      mark(a.actor, 'acting'); if (a.target) mark(a.target, 'target');
      await sleep(use3D() ? 450 : 900);
      await perform(a);
      A.banner = '';
      render();
      await sleep(250);
    }
    A.busy = false;
    A.banner = g.winner === null ? `Tocca a te, ${g.players[g.turn].name}!` : '';
    render();
    setTimeout(() => { if (A.banner.startsWith('Tocca a te')) { A.banner = ''; if (A.screen === 'battle' && !A.sel) render(); } }, 2200);
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
        if (e.type === 'dmg') floatOn(e.uid, `−${e.amount}`, 'dmg', n - 1);
        if (e.type === 'heal') floatOn(e.uid, `+${e.amount}`, 'heal', n - 1);
        if (e.type === 'status') floatOn(e.uid, e.text, 'st', n - 1);
        fx = true;
        await sleep(160);
      } else if (e.type === 'ko') { mark(e.uid, 'ko'); fx = true; }
    }
    if (fx) await sleep(650);
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

  function showWinner() {
    const g = A.game;
    if (!g || g.winner === null || A.screen !== 'battle') return;
    const w = g.players[g.winner];
    const human = A.mode === 'cpu' ? (g.winner === 0 ? 'Vittoria!' : 'Sconfitta') : 'Vittoria!';
    const alive = w.field.concat(w.reserve);
    openLayer(`<div class="overlay" role="dialog">
      <div class="eyebrow">Fine della sfida · turno ${Math.ceil(g.turnNo / 2)}</div>
      <h2>${human}</h2>
      <p>${esc(w.name)} vince con ${alive.length} cart${alive.length === 1 ? 'a' : 'e'} ancora in piedi.</p>
      <div class="faces">${alive.map(f => `<i style="${face(f.card)}"></i>`).join('')}</div>
      <button class="btn primary" data-act="rematch">Rivincita</button>
      <button class="btn" data-act="new-game">Cambia squadre</button>
      <button class="btn ghost" data-act="quit-now">Menu</button>
    </div>`);
  }

  // formula segreta di Flavio
  function formulaPrompt() {
    return new Promise(resolve => {
      let left = 10, done = false;
      openLayer(`<div class="overlay formula" role="dialog" aria-label="Formula segreta">
        <div class="eyebrow">Delirio Onnipotente</div>
        <h2>Pronuncia la formula!</h2>
        <p>Scrivila entro il tempo per raddoppiare l'effetto.</p>
        <div class="timer num" id="ftimer">10</div>
        <input id="fformula" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="fate tiri…">
        <button class="btn primary" id="fgo">Lancia la mossa</button>
      </div>`);
      const inp = document.getElementById('fformula');
      const finish = () => {
        if (done) return; done = true; clearInterval(iv);
        const ok = checkFormula(inp.value);
        closeLayer(); resolve(ok);
      };
      document.getElementById('fgo').onclick = finish;
      inp.onkeydown = e => { if (e.key === 'Enter') finish(); };
      setTimeout(() => inp.focus(), 50);
      const iv = setInterval(() => { left--; const t = document.getElementById('ftimer'); if (t) t.textContent = left; if (left <= 0) finish(); }, 1000);
    });
  }
  function checkFormula(s) {
    const a = s.toLowerCase().replace(/[^a-z]/g, '');
    const b = 'fatetirifatetitiluiszoratto';
    // distanza di Levenshtein: tolleriamo un paio di errori di battitura
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return dp[a.length][b.length] <= 3;
  }

  function startGame(first, sameTeams) {
    const cpu = A.mode === 'cpu';
    if (cpu && !sameTeams) A.teams[1] = S.randomTeam(null, S.BUDGET - 1);
    A.first = first === undefined ? (Math.random() < 0.5 ? 0 : 1) : first;
    A.game = S.createGame({
      first: A.first,
      players: [
        { name: A.names[0] || 'Giocatore 1', cards: A.teams[0] },
        { name: cpu ? 'Computer' : (A.names[1] || 'Giocatore 2'), cards: A.teams[1], cpu: cpu ? A.level : null },
      ],
    });
    A.game.events = [];
    A.view = cpu ? 0 : A.first;
    A.sel = null; A.logOpen = false; A.busy = false;
    A.banner = '';
    go('battle');
    const g = A.game;
    openLayer(`<div class="overlay" role="dialog">
      <div class="eyebrow">Lancio della moneta</div>
      <h2>Inizia ${esc(g.players[g.turn].name)}</h2>
      <p>Al primo turno chi inizia agisce con 2 carte e solo con attacchi base.</p>
      <div class="faces">${g.players[1].field.concat(g.players[1].reserve).map(f => `<i style="${face(f.card)}" title="${esc(f.name)}"></i>`).join('')}</div>
      <p>${cpu ? 'La squadra del computer' : `La squadra di ${esc(g.players[1].name)}`}</p>
      <button class="btn primary" data-act="begin">Combatti!</button>
    </div>`);
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

  function handle(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    // clic dentro un foglio: non chiudere
    if (el.dataset.act === 'close' && el.classList.contains('sheet-wrap') && e.target.closest('[data-stop]')) return;
    const kind = el.dataset.act, v = el.dataset.v;
    const g = A.game;
    switch (kind) {
      case 'go': go(v); break;
      case 'mode': A.mode = v; go('setup'); break;
      case 'level': A.level = v; store('level', v); saveNames(); render(); break;
      case 'anim': A.anim = v; store('anim', v); saveNames(); render(); break;
      case 'anim-cycle': A.anim = { full: 'fast', fast: 'off', off: 'full' }[A.anim]; store('anim', A.anim); render(); break;
      case 'to-build':
        saveNames();
        A.builder = 0; A.teams = [load('team0', []), A.mode === 'pvp' ? load('team1', []) : []];
        A.teams = A.teams.map(t => (t.every(id => S.CARD[id]) && S.teamCost(t) <= S.BUDGET) ? t : []);
        go('build'); break;
      case 'build-back':
        if (A.builder === 1) { A.builder = 0; render(); } else go('setup');
        break;
      case 'filter': A.filter = v; render(); break;
      case 'pick': {
        const t = A.teams[A.builder];
        const i = t.indexOf(v);
        if (i >= 0) t.splice(i, 1);
        else if (t.length < S.TEAM_SIZE && S.teamCost(t) + S.CARD[v].cost <= S.BUDGET) t.push(v);
        render(); break;
      }
      case 'unpick': A.teams[A.builder].splice(+v, 1); render(); break;
      case 'random-team': A.teams[A.builder] = S.randomTeam(null, S.BUDGET - 1); render(); break;
      case 'confirm-team':
        store('team' + A.builder, A.teams[A.builder]);
        if (A.mode === 'pvp' && A.builder === 0) {
          A.builder = 1; A.filter = 'all'; render(); window.scrollTo(0, 0);
          openLayer(`<div class="overlay" role="dialog"><div class="eyebrow">Squadra pronta</div><h2>Passa il telefono a ${esc(A.names[1])}</h2><p>Ora tocca a ${esc(A.names[1])} scegliere la sua squadra.</p><button class="btn primary" data-act="close">Sono pronto</button></div>`);
        } else startGame();
        break;
      case 'card': e.stopPropagation(); cardSheet(v); break;
      case 'close': closeLayer(); break;
      case 'begin': closeLayer(); if (g.players[g.turn].cpu) runCPU(); break;
      case 'handoff-ok': A.view = g.turn; closeLayer(); render(); break;
      case 'log': A.logOpen = !A.logOpen; render(); if (A.logOpen) { const l = $app.querySelector('.log'); if (l) l.scrollTop = l.scrollHeight; } break;
      case 'tile': {
        const f = S.byUid(g, v);
        if (!f) break;
        if (A.sel) {
          if (A.sel.targets.includes(v)) act({ actor: A.sel.actor, move: A.sel.move, pick: A.sel.pick, target: v }, A.sel.inner);
          else if (v === A.sel.actor) { A.sel = null; A.banner = ''; render(); }
          break;
        }
        actorSheet(f);
        break;
      }
      case 'move': if (!A.busy) chooseMove(el.dataset.uid, +el.dataset.i); break;
      case 'copy-pick': chooseMove(el.dataset.uid, +el.dataset.i, { card: el.dataset.card, i: +el.dataset.mi }); break;
      case 'cancel-sel': A.sel = null; A.banner = ''; render(); break;
      case 'end-turn': if (isHumanTurn() && !A.busy) { S.passTurn(g); A.busy = true; playEvents(g.events.splice(0)).then(() => { A.busy = false; afterAction(); }); } break;
      case 'quit':
        openLayer(`<div class="overlay" role="dialog"><h2>Abbandoni?</h2><p>La partita in corso andrà persa.</p><button class="btn primary" data-act="quit-now">Esci dalla partita</button><button class="btn" data-act="close">Continua a giocare</button></div>`);
        break;
      case 'quit-now': A.game = null; go('home'); break;
      case 'rematch': closeLayer(); startGame(1 - A.first, true); break;
      case 'new-game': A.game = null; closeLayer(); A.builder = 0; go('build'); break;
    }
  }
  document.addEventListener('click', handle);
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); handle(e); }
    if (e.key === 'Escape' && $layer.innerHTML && !$layer.querySelector('input')) closeLayer();
  });

  render();
})();
