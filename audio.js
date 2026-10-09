/* STONE TEMPLE TAO — suoni, musica e vibrazione
 * Tutto è sintetizzato al volo con Web Audio, tranne la canzone della lobby (Stone Game Song.mp3).
 * API: Sound.unlock() · Sound.play(nome, forza) · Sound.setSfx(bool) · Sound.setMusic(bool)
 *      Sound.setVibration(bool) · Sound.buzz(pattern) · Sound.prodigy() · Sound.setTrack(nome)
 */
(function () {
  'use strict';
  let ctx = null, master, sfxBus, musicBus, noiseBuf;
  const opt = { sfx: true, music: true, vibration: true };
  let musicOn = false, musicTimer = null, nextNote = 0, step = 0, duck = 0;

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      const comp = ctx.createDynamicsCompressor(); comp.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(comp);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.22; musicBus.connect(comp);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.hidden) ctx.suspend(); else ctx.resume();
        syncSong();
      });
      return true;
    } catch (e) { ctx = null; return false; }
  }

  // da chiamare su un tocco dell'utente: i browser avviano l'audio solo dopo un'interazione
  function unlock() {
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (opt.music && !musicOn) startMusic();
    syncSong(); // i telefoni fanno partire l'mp3 solo dentro un tocco: ogni tocco riprova
  }

  // ------------------------------------------------------------ mattoncini
  function env(g, t, a, peak, dec, end) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(end || 0.0001, t + a + dec);
  }
  function tone(type, f0, f1, t, dur, vol, bus) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.005, vol, dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, vol, type, f0, f1, q, bus) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0 || 2000, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); env(g, t, 0.004, vol, dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  // corda pizzicata (tipo guzheng): due oscillatori leggermente stonati con decadimento rapido
  function pluck(freq, t, vol, bus) {
    [0, 3].forEach(det => {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = det ? 'sawtooth' : 'triangle'; o.frequency.value = freq; o.detune.value = det;
      f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 6, t); f.frequency.exponentialRampToValueAtTime(freq * 1.2, t + 0.6);
      env(g, t, 0.003, vol * (det ? 0.35 : 1), 1.1);
      o.connect(f); f.connect(g); g.connect(bus || sfxBus);
      o.start(t); o.stop(t + 1.3);
    });
  }
  function taiko(t, vol, bus) {
    tone('sine', 110, 45, t, 0.45, vol, bus);
    noise(t, 0.08, vol * 0.35, 'lowpass', 800, 200, 1, bus);
  }
  const PENTA = [0, 3, 5, 7, 10]; // pentatonica minore
  const noteF = (base, n) => base * Math.pow(2, (PENTA[((n % 5) + 5) % 5] + 12 * Math.floor(n / 5)) / 12);

  // ------------------------------------------------------------ effetti
  const FX = {
    tap(t) { tone('sine', 900, 700, t, 0.05, 0.12); },
    turn(t) { tone('triangle', 660, 660, t, 0.08, 0.15); tone('triangle', 990, 990, t + 0.07, 0.1, 0.12); },
    whoosh(t) { noise(t, 0.28, 0.35, 'bandpass', 400, 3000, 2); },
    hit(t, k) {
      const v = Math.min(1, 0.45 + (k || 30) / 120);
      tone('triangle', 180, 55, t, 0.22, v);
      noise(t, 0.12, v * 0.7, 'lowpass', 3500, 400, 0.8);
    },
    bighit(t) {
      tone('sawtooth', 140, 40, t, 0.4, 0.8);
      noise(t, 0.25, 0.8, 'lowpass', 5000, 300, 0.7);
      tone('sine', 60, 35, t, 0.6, 0.9);
    },
    ko(t) {
      // gong: parziali inarmoniche con lunga coda
      [110, 164, 231, 297, 412].forEach((f, i) => tone('sine', f * 1.01, f, t, 2.6 - i * 0.3, 0.32 / (i + 1)));
      tone('sine', 55, 40, t, 0.8, 0.9);
      noise(t, 0.3, 0.3, 'bandpass', 1200, 500, 3);
    },
    dodge(t) { noise(t, 0.18, 0.35, 'highpass', 2500, 6000, 1); tone('sine', 1200, 1800, t, 0.12, 0.08); },
    shield(t) { tone('sine', 1500, 1500, t, 0.5, 0.15); tone('sine', 2250, 2250, t, 0.4, 0.08); },
    buff(t) { [0, 2, 4, 5].forEach((n, i) => pluck(noteF(293.66, n + 5), t + i * 0.07, 0.35)); },
    debuff(t) { [5, 3, 1, 0].forEach((n, i) => tone('square', noteF(146.83, n + 5), null, t + i * 0.08, 0.12, 0.08)); },
    stun(t) { tone('sine', 300, 900, t, 0.25, 0.3); [0, 1, 2].forEach(i => tone('sine', 2200 + i * 330, null, t + 0.2 + i * 0.09, 0.2, 0.08)); },
    confuse(t) { tone('sine', 500, 350, t, 0.2, 0.2); tone('sine', 350, 600, t + 0.18, 0.25, 0.2); },
    magic(t) { for (let i = 0; i < 6; i++) tone('sine', noteF(587.33, Math.floor(Math.random() * 8)), null, t + i * 0.05, 0.3, 0.07); },
    heal(t) { [0, 2, 4].forEach((n, i) => tone('sine', noteF(440, n + 5), null, t + i * 0.09, 0.4, 0.12)); },
    event(t) { FX.ko(t); for (let i = 0; i < 8; i++) taiko(t + 0.3 + i * 0.08, 0.25 + i * 0.05); },
    win(t) { [0, 2, 4, 5, 7, 9].forEach((n, i) => pluck(noteF(293.66, n + 5), t + i * 0.12, 0.45)); taiko(t, 0.8); taiko(t + 0.72, 0.9); },
    lose(t) { [7, 5, 3, 0].forEach((n, i) => pluck(noteF(146.83, n + 5), t + i * 0.22, 0.4)); },
    // modalità storia
    bump(t) { tone('square', 110, 80, t, 0.07, 0.06); },
    door(t) { noise(t, 0.18, 0.2, 'bandpass', 600, 1500, 2); tone('sine', 520, 390, t + 0.05, 0.15, 0.1); },
    jump(t) { tone('sine', 280, 640, t, 0.16, 0.14); },
    item(t) { [0, 2, 4, 5].forEach((n, i) => pluck(noteM(392, n + 5), t + i * 0.09, 0.32)); },
    alert(t) { tone('square', 1320, 1320, t, 0.07, 0.1); tone('square', 1760, 1760, t + 0.08, 0.12, 0.1); },
    encounter(t) { tone('sawtooth', 120, 900, t, 0.5, 0.18); for (let i = 0; i < 4; i++) taiko(t + 0.1 + i * 0.1, 0.3 + i * 0.1); },
  };

  function play(name, k) {
    if (!opt.sfx || !init() || ctx.state !== 'running') return;
    const f = FX[name]; if (f) f(ctx.currentTime + 0.01, k);
  }

  // ------------------------------------------------------------ "Musica dei Prodigy": breakbeat sintetizzato
  function prodigy() {
    if (!opt.sfx || !init() || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + 0.02, b = 60 / 140 / 2; // crome a 140 bpm
    duck = t0 + b * 16;
    musicBus.gain.setTargetAtTime(0.02, t0, 0.05);
    musicBus.gain.setTargetAtTime(0.22, duck, 0.4);
    const kick = [0, 3, 6, 10, 11], snare = [4, 12], bass = [0, 0, 3, 5, 0, 7, 5, 3];
    for (let i = 0; i < 16; i++) {
      const t = t0 + i * b;
      if (kick.includes(i % 16)) tone('sine', 150, 45, t, 0.25, 0.9);
      if (snare.includes(i % 16)) noise(t, 0.16, 0.7, 'highpass', 1500, 900, 0.7);
      noise(t, 0.04, 0.2, 'highpass', 7000, 9000, 1);
      if (i % 2 === 0) {
        const o = ctx.createOscillator(), g = ctx.createGain(), sh = ctx.createWaveShaper();
        const curve = new Float32Array(256); for (let j = 0; j < 256; j++) { const x = j / 128 - 1; curve[j] = Math.tanh(x * 4); }
        sh.curve = curve;
        o.type = 'sawtooth'; o.frequency.value = 55 * Math.pow(2, bass[(i / 2) % 8] / 12);
        env(g, t, 0.005, 0.25, b * 1.8);
        o.connect(sh); sh.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + b * 2);
      }
    }
    // la sirena
    tone('square', 880, 1760, t0 + b * 8, b * 7, 0.06);
  }

  // ------------------------------------------------------------ musica di sottofondo generativa
  function startMusic() {
    if (musicOn || !ctx) return;
    musicOn = true;
    nextNote = ctx.currentTime + 0.1; step = 0;
    musicBus.gain.setTargetAtTime(0.22, ctx.currentTime, 0.5);
    musicTimer = setInterval(schedule, 40);
    syncSong();
  }
  function stopMusic() {
    musicOn = false;
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
    if (ctx) musicBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
    syncSong();
  }
  const BEAT = 60 / 84 / 2; // crome a 84 bpm
  let phrase = [], track = 'lobby'; // il gioco si apre nel menu principale
  const newPhrase = (len, lo, hi, rest) => { let n = lo + 3 + Math.floor(Math.random() * 3); return Array.from({ length: len }, () => { n += Math.floor(Math.random() * 5) - 2; n = Math.max(lo, Math.min(hi, n)); return Math.random() < rest ? null : n; }); };
  const MAJ = [0, 2, 4, 7, 9]; // pentatonica maggiore, per la musica del viaggio
  const noteM = (base, n) => base * Math.pow(2, (MAJ[((n % 5) + 5) % 5] + 12 * Math.floor(n / 5)) / 12);
  const TRACKS = {
    // in palestra: taiko, bordone e melodia pentatonica che varia lentamente
    tempio: { beat: BEAT, step(t, s) { s %= 32;
      if (s % 8 === 0) taiko(t, 0.5, musicBus);
      if (s % 8 === 6 && Math.random() < 0.6) taiko(t, 0.22, musicBus);
      if (s % 16 === 12) noise(t, 0.05, 0.12, 'bandpass', 2500, 2000, 4, musicBus); // legnetto
      if (s === 0) tone('sine', 73.42, 73.42, t, BEAT * 30, 0.18, musicBus);
      if (s === 0 && (!phrase.length || Math.random() < 0.5)) phrase = newPhrase(16, 2, 11, 0.45);
      if (s % 2 === 0) { const n = phrase[s / 2]; if (n !== null && n !== undefined) pluck(noteF(146.83, n), t, 0.28, musicBus); }
    } },
    // in viaggio: allegra, giro di basso Sol–Mi–Do–Re e un tema che torna (A A')
    mondo: { beat: 60 / 116 / 2, step(t, s) { s %= 32;
      const root = [98, 82.41, 65.41, 73.42][Math.floor(s / 8)];
      if (s % 8 === 0) tone('triangle', root, root, t, 0.5, 0.22, musicBus);
      if (s % 8 === 4) tone('triangle', root * 1.5, root * 1.5, t, 0.35, 0.16, musicBus);
      if (s % 4 === 2) noise(t, 0.03, 0.06, 'highpass', 7000, 7000, 1, musicBus);
      if (s === 0 && (!phrase.length || Math.random() < 0.3)) phrase = newPhrase(16, 4, 12, 0.3);
      const n = s < 28 ? phrase[s % 16] : phrase[s % 16] === null ? null : phrase[s % 16] - 1;
      if (n !== null && n !== undefined) pluck(noteM(196, n), t, 0.2, musicBus);
    } },
    // in grotta: bordone basso, note rade con eco, gocce
    grotta: { beat: 60 / 70 / 2, step(t, s) { s %= 32;
      if (s === 0) tone('sine', 55, 55, t, 6, 0.2, musicBus);
      if (s === 0 && (!phrase.length || Math.random() < 0.5)) phrase = newPhrase(32, 3, 12, 0.75);
      const n = phrase[s];
      if (n !== null && n !== undefined) { pluck(noteF(220, n), t, 0.16, musicBus); pluck(noteF(220, n), t + 0.32, 0.05, musicBus); }
      if (Math.random() < 0.06) tone('sine', 1900, 1100, t, 0.09, 0.05, musicBus);
    } },
  };
  // ------------------------------------------------------------ musiche di battaglia: chiptune da console portatile
  // Melodie originali. Un gettone per sedicesimo: nota (es. "f#5", "bb4"), "-" la tiene, "." è pausa; "|" separa le battute.
  // Accordi: uno per battuta ("em", "c", "f#"…): da lì nascono il basso che salta d'ottava e gli arpeggi.
  const SEMI = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const midi = n => { const m = /^([a-g])(#|b)?(\d)$/.exec(n); return SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] ? -1 : 0) + 12 * (+m[3] + 1); };
  const mhz = m => 440 * Math.pow(2, (m - 69) / 12);
  function parseLead(str) {
    const tk = str.trim().split(/\s+/).filter(x => x !== '|');
    return tk.map((x, i) => { if (x === '-' || x === '.') return null; let len = 1; while (tk[i + len] === '-') len++; return [mhz(midi(x)), len]; });
  }
  const parseChord = c => { const m = /^([a-g])(#|b)?(m)?$/.exec(c); const r = midi(m[1] + (m[2] || '') + '2'); return [r, r + (m[3] ? 3 : 4), r + 7]; };
  // voce solista: onda quadra filtrata, con vibrato sulle note lunghe
  function lead(f, t, dur, vol, type) {
    const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    fl.type = 'lowpass'; fl.frequency.value = 3200;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.setTargetAtTime(vol * 0.62, t + 0.03, 0.08); g.gain.setTargetAtTime(0.0001, t + dur * 0.9, 0.025);
    if (dur > 0.3) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 6; lg.gain.value = f * 0.014; l.connect(lg); lg.connect(o.frequency); l.start(t + 0.14); l.stop(t + dur + 0.1); }
    o.connect(fl); fl.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.2);
  }
  function chip(d) {
    const beat = 60 / d.bpm / 4, mel = parseLead(d.lead), chords = d.chords.split(' ').map(parseChord), bars = mel.length / 16;
    const dr = d.drums || {};
    return { beat, step(t, s) {
      const intro = d.intro === false ? 0 : 16;
      if (s < intro) { // intro: scala che precipita e rullata, come quando parte la sfida
        const top = chords[0][0] + 36;
        if (s < 12) lead(mhz(top - s * (s % 2 ? 1 : 2)), t, beat * 0.9, 0.16);
        if (s % 4 === 0) tone('sine', 150, 45, t, 0.18, 0.4, musicBus);
        if (s >= 12) noise(t, 0.08, 0.14 + (s - 12) * 0.04, 'bandpass', 1800, 1200, 0.8, musicBus);
        if (s === 0 || s === 8) tone('triangle', mhz(chords[0][0]), null, t, beat * 6, 0.22, musicBus);
        return;
      }
      const k = (s - intro) % mel.length, b = Math.floor(k / 16) % chords.length, i = k % 16, ch = chords[b];
      const n = mel[k];
      if (n) { lead(n[0], t, n[1] * beat, d.vol || 0.2); lead(n[0] / 2, t, n[1] * beat, 0.05, 'triangle'); }
      if (i % 2 === 0) tone('triangle', mhz(ch[0] + (i % 4 ? 12 : 0)), null, t, beat * 1.6, 0.2, musicBus); // basso che salta d'ottava
      if (d.arp !== false) lead(mhz([ch[0], ch[1], ch[2], ch[0] + 12][i % 4] + 24), t, beat * 0.8, 0.035, 'sawtooth');
      if ((dr.k || 'x.......x.......')[i] === 'x') tone('sine', 150, 45, t, 0.18, 0.38, musicBus);
      if ((dr.s || '....x.......x...')[i] === 'x') { noise(t, 0.12, 0.2, 'bandpass', 1900, 1300, 0.8, musicBus); tone('triangle', 230, 170, t, 0.06, 0.12, musicBus); }
      if ((dr.h || 'x.x.x.x.x.x.x.x.')[i] === 'x') noise(t, 0.03, 0.05, 'highpass', 8000, 8000, 1, musicBus);
      if (d.taiko && i % 8 === 0) taiko(t, i ? 0.35 : 0.6, musicBus);
      if (bars && i === 0 && b === 0 && d.drone) tone('sine', mhz(ch[0] - 12), null, t, beat * 64, 0.14, musicBus);
    } };
  }
  Object.assign(TRACKS, {
    // spirito selvatico: mi minore, saltellante
    selvatico: chip({ bpm: 156, chords: 'em c d b em c am b', lead: `
      e5 - - - b4 - e5 - g5 - - - f#5 - e5 - | c5 - - - e5 - g5 - c6 - - - b5 - g5 - | a5 - - - f#5 - d5 - a5 - b5 - c6 - b5 - | b5 - - - - - a5 g5 f#5 - d#5 - f#5 - b4 - |
      g5 - f#5 - e5 - - - g5 - a5 - b5 - - - | c6 - b5 - a5 - g5 - e5 - - - g5 - c6 - | a5 - - - c6 - e6 - d6 - c6 - b5 - a5 - | b5 - - - - - - - d#6 - - - f#6 - - -` }),
    // allenatore: la minore, incalzante
    allenatore: chip({ bpm: 162, chords: 'am f g e am f dm e', drums: { k: 'x.....x.x.......' }, lead: `
      a4 - c5 - e5 - a5 - - - g5 - a5 - e5 - | f5 - - - a5 - c6 - - - a5 - f5 - c5 - | g5 - - - d5 - g5 - b5 - - - a5 - g5 - | g#5 - - - - - e5 - f5 - g#5 - b5 - - - |
      c6 - b5 - a5 - e5 - a5 - - - c6 - - - | d6 - c6 - a5 - f5 - c6 - - - a5 - - - | f5 - e5 - d5 - f5 - a5 - d6 - f6 - e6 - | e6 - - - - - - - d6 - c6 - b5 - g#5 -` }),
    // rivale: re minore, sfrontato e sincopato
    rivale: chip({ bpm: 168, chords: 'dm bb c a dm bb gm a', drums: { k: 'x..x..x.x..x....', s: '....x..x....x...' }, lead: `
      d5 - . d5 . f5 - a5 . a5 - g5 f5 - e5 - | f5 - . f5 . bb5 - d6 . d6 - c6 bb5 - a5 - | g5 - . g5 . c6 - e6 . e6 - d6 c6 - bb5 - | a5 - - - c#6 - - - e6 - - - a5 - - - |
      d6 - c6 - a5 - f5 - d5 - f5 - a5 - d6 - | bb5 - - - a5 - - - f5 - - - d5 - - - | g5 - a5 - bb5 - d6 - g6 - - - f6 - d6 - | e6 - - - c#6 - - - a5 - b5 - c#6 - e6 -` }),
    // capopalestra: sol minore, eroico
    capopalestra: chip({ bpm: 150, chords: 'gm eb f d gm eb cm d', drums: { k: 'x...x...x...x...', h: 'xxxxxxxxxxxxxxxx' }, lead: `
      g5 - - - - - d5 - g5 - a5 - bb5 - - - | bb5 - a5 - g5 - eb5 - g5 - - - bb5 - - - | c6 - - - bb5 - a5 - f5 - - - a5 - c6 - | d6 - - - - - - - f#5 - - - a5 - - - |
      g6 - - - f6 - d6 - bb5 - - - g5 - - - | eb6 - - - d6 - c6 - bb5 - g5 - eb5 - - - | c6 - d6 - eb6 - g6 - f6 - eb6 - d6 - c6 - | d6 - - - - - - - - - - - f#6 - - -` }),
    // Leggende: do minore, solenne, con taiko e bordone
    leggenda: chip({ bpm: 132, chords: 'cm ab bb g cm ab fm g', taiko: true, drone: true, drums: { k: '................', h: 'x...x...x...x...' }, lead: `
      c5 - - - - - eb5 - f5 - - - g5 - - - | ab5 - - - g5 - - - eb5 - - - c5 - - - | bb4 - - - d5 - f5 - bb5 - - - ab5 - g5 - | g5 - - - - - - - b4 - d5 - f5 - g5 - |
      c6 - - - bb5 - g5 - f5 - - - eb5 - f5 - | g5 - - - eb5 - c5 - ab5 - - - g5 - - - | f5 - - - ab5 - c6 - f6 - - - eb6 - c6 - | d6 - - - - - - - b5 - - - g5 - - -` }),
    // la sfida finale con il Maestro: si minore, velocissima
    finale: chip({ bpm: 172, chords: 'bm g a f# bm g em f#', drums: { k: 'x.x...x.x.x...x.', h: 'xxxxxxxxxxxxxxxx' }, lead: `
      b5 - f#5 - b5 - d6 - c#6 - b5 - a5 - f#5 - | g5 - d5 - g5 - b5 - a5 - g5 - f#5 - d5 - | e5 - a5 - c#6 - e6 - d6 - c#6 - a5 - e5 - | f#5 - - - a#5 - - - c#6 - - - f#6 - - - |
      b6 - - - a6 - f#6 - d6 - - - b5 - - - | g6 - f#6 - e6 - d6 - b5 - - - g5 - - - | e6 - f#6 - g6 - a6 - g6 - f#6 - e6 - c#6 - | f#6 - - - - - - - - - - - a#5 - c#6 -` }),
    // vittoria: fanfara in do maggiore
    vittoria: chip({ bpm: 140, intro: false, chords: 'c f g c', drums: { k: 'x.......x.......', s: '....x.......x...', h: 'x...x...x...x...' }, lead: `
      c5 - e5 - g5 - c6 - - - g5 - e5 - g5 - | a5 - - - f5 - a5 - c6 - - - a5 - - - | b5 - - - g5 - d5 - g5 - a5 - b5 - d6 - | c6 - - - - - - - g5 - e5 - c5 - - -` }),
  });
  // la lobby suona la canzone vera, da file: parte e si ferma insieme alla musica, riprende da dove era rimasta
  TRACKS.lobby = { beat: 0.5, step() {} };
  let song = null;
  function syncSong() {
    const want = musicOn && track === 'lobby' && !document.hidden;
    if (want && !song) { song = new Audio('Stone%20Game%20Song.mp3'); song.loop = true; song.volume = 0.6; }
    if (!song) return;
    if (want) song.play().catch(() => { /* il browser aspetta un tocco */ }); else song.pause();
  }
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    const tr = TRACKS[track];
    while (nextNote < ctx.currentTime + 0.25) { tr.step(nextNote, step); nextNote += tr.beat; step++; }
  }
  // cambia la musica di sottofondo: 'lobby' (menu principale), 'tempio' (in partita), 'mondo' o 'grotta' (modalità storia)
  function setTrack(name) {
    if (!TRACKS[name] || name === track) return;
    track = name; step = 0; phrase = [];
    if (ctx) nextNote = ctx.currentTime + 0.15;
    syncSong();
  }

  // ------------------------------------------------------------ vibrazione
  function buzz(pattern) {
    if (!opt.vibration) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* non supportata */ }
  }

  window.Sound = {
    unlock, play, prodigy, buzz, setTrack,
    setSfx(v) { opt.sfx = !!v; },
    setMusic(v) { opt.music = !!v; if (!v) stopMusic(); else if (ctx && ctx.state === 'running') startMusic(); },
    setVibration(v) { opt.vibration = !!v; },
    get options() { return Object.assign({}, opt); },
  };
})();
