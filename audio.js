/* STONE TEMPLE TAO — suoni, musica e vibrazione
 * Tutto è sintetizzato al volo con Web Audio: nessun file audio, nessuna musica protetta da diritti.
 * API: Sound.unlock() · Sound.play(nome, forza) · Sound.setSfx(bool) · Sound.setMusic(bool)
 *      Sound.setVibration(bool) · Sound.buzz(pattern) · Sound.prodigy()
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
      });
      return true;
    } catch (e) { ctx = null; return false; }
  }

  // da chiamare su un tocco dell'utente: i browser avviano l'audio solo dopo un'interazione
  function unlock() {
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (opt.music && !musicOn) startMusic();
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
  }
  function stopMusic() {
    musicOn = false;
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
    if (ctx) musicBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
  }
  const BEAT = 60 / 84 / 2; // crome a 84 bpm
  let phrase = [];
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    while (nextNote < ctx.currentTime + 0.25) {
      const t = nextNote, s = step % 32;
      // taiko: colpo forte sul battere, piccoli colpi di contorno
      if (s % 8 === 0) taiko(t, 0.5, musicBus);
      if (s % 8 === 6 && Math.random() < 0.6) taiko(t, 0.22, musicBus);
      if (s % 16 === 12) noise(t, 0.05, 0.12, 'bandpass', 2500, 2000, 4, musicBus); // legnetto
      // bordone
      if (s === 0) { tone('sine', 73.42, 73.42, t, BEAT * 30, 0.18, musicBus); }
      // melodia pentatonica che varia lentamente
      if (s === 0) {
        if (!phrase.length || Math.random() < 0.5) {
          let n = 5 + Math.floor(Math.random() * 3);
          phrase = Array.from({ length: 16 }, () => { n += Math.floor(Math.random() * 5) - 2; n = Math.max(2, Math.min(11, n)); return Math.random() < 0.45 ? null : n; });
        }
      }
      if (s % 2 === 0) { const n = phrase[s / 2]; if (n !== null && n !== undefined) pluck(noteF(146.83, n), t, 0.28, musicBus); }
      nextNote += BEAT; step++;
    }
  }

  // ------------------------------------------------------------ vibrazione
  function buzz(pattern) {
    if (!opt.vibration) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* non supportata */ }
  }

  window.Sound = {
    unlock, play, prodigy, buzz,
    setSfx(v) { opt.sfx = !!v; },
    setMusic(v) { opt.music = !!v; if (!v) stopMusic(); else if (ctx && ctx.state === 'running') startMusic(); },
    setVibration(v) { opt.vibration = !!v; },
    get options() { return Object.assign({}, opt); },
  };
})();
