/* STONE TEMPLE TAO — la voce di Liming Yue
 * L'Onomotopia Disastrosa si grida al microfono: «Shuaaa!», «Tinn!» o «Paaa!».
 * Niente riconoscimento vocale su internet: si ascolta il suono e se ne guarda la forma.
 *   - «Shuaaa» comincia con un fruscio (sh): tanta energia sopra i 2500 Hz, prima della vocale.
 *   - «Tinn» ha la i: la seconda formante è alta (sopra i 2000 Hz) e la prima bassa.
 *   - «Paaa» ha la a: energia tra i 500 e i 1800 Hz, attacco secco.
 * API: Voce.supported() · Voce.listen({ ms, onLevel }) → Promise<frames> · Voce.analyze(frames) → { word, scores, loud, ok }
 *      Voce.check(frames, target) → { ok, word, loud }. analyze/check funzionano anche in Node (tools/test-voce.js).
 * Ogni frame: { rms, zcr, b: [basse 150-900, medie 900-1800, alte 1800-3500, altissime 3500-8000] } (energie lineari).
 */
(function (root) {
  'use strict';
  const WORDS = ['shuaa', 'tinn', 'paaa'];
  const BANDS = [[150, 900], [900, 1800], [1800, 3500], [3500, 8000]];

  // energia per banda da uno spettro di ampiezze (bin lineari da 0 a sr/2)
  function bandsOf(mag, sr) {
    const n = mag.length, hz = sr / 2 / n, out = [0, 0, 0, 0];
    BANDS.forEach(([a, b], k) => { for (let i = Math.floor(a / hz); i < Math.min(n, Math.ceil(b / hz)); i++) out[k] += mag[i] * mag[i]; });
    return out;
  }
  function frameOf(td, mag, sr) {
    let s = 0, z = 0;
    for (let i = 0; i < td.length; i++) { s += td[i] * td[i]; if (i && (td[i] >= 0) !== (td[i - 1] >= 0)) z++; }
    return { rms: Math.sqrt(s / td.length), zcr: z / td.length, b: bandsOf(mag, sr) };
  }

  function analyze(frames) {
    if (!frames || !frames.length) return { word: null, loud: 0, ok: false, scores: {} };
    const peak = Math.max(...frames.map(f => f.rms));
    // rumore di fondo: la media del quinto più silenzioso
    const sorted = frames.map(f => f.rms).sort((a, b) => a - b);
    const floor = sorted.slice(0, Math.max(1, Math.floor(sorted.length / 5))).reduce((t, x) => t + x, 0) / Math.max(1, Math.floor(sorted.length / 5));
    const thr = Math.max(floor * 2.5, peak * 0.18, 0.006);
    let i0 = frames.findIndex(f => f.rms > thr), i1 = frames.length - 1;
    while (i1 > i0 && frames[i1].rms <= thr) i1--;
    if (i0 < 0) return { word: null, loud: peak, ok: false, scores: {} };
    const act = frames.slice(i0, i1 + 1);
    const dur = act.length; // in frame
    const frac = f => { const t = f.b[0] + f.b[1] + f.b[2] + f.b[3] + 1e-12; return f.b.map(x => x / t); };
    // inizio (circa i primi 100 ms): fruscio?
    const head = act.slice(0, Math.max(2, Math.min(6, Math.floor(dur / 3))));
    const hf = head.reduce((t, f) => { const q = frac(f); return t + q[2] + q[3] * 1.3; }, 0) / head.length;
    const hz = head.reduce((t, f) => t + f.zcr, 0) / head.length;
    // corpo: la vocale, pesata sull'energia
    const body = act.slice(Math.min(act.length - 1, head.length)).filter(f => f.rms > thr * 1.2);
    const bb = body.length ? body : act;
    let w = 0, lo = 0, mid = 0, hi = 0;
    for (const f of bb) { const q = frac(f); w += f.rms; lo += q[0] * f.rms; mid += q[1] * f.rms; hi += (q[2] + q[3] * 0.5) * f.rms; }
    lo /= w; mid /= w; hi /= w;
    // attacco: quanto in fretta si arriva al massimo
    const top = act.reduce((m, f, i) => (f.rms > act[m].rms ? i : m), 0);
    const sharp = top <= 3 ? 1 : top <= 6 ? 0.5 : 0;
    // tarato con le grida originali di Liming e con voci sintetiche diverse (tools/test-voce.js)
    const cl = v => Math.max(0, Math.min(1, v));
    const scores = {
      shuaa: cl((hf - 0.45) / 0.25) * 0.6 + cl((hz - 0.06) / 0.06) * 0.4,
      tinn: cl((0.2 - mid) / 0.18) * 0.7 + cl((hi - 0.04) / 0.12) * 0.3,
      paaa: cl((mid - 0.12) / 0.25) * 0.85 + sharp * 0.15,
    };
    if (scores.shuaa > 0.6) { scores.tinn *= 0.5; scores.paaa *= 0.5; } // il fruscio iniziale è il segno più chiaro
    const word = WORDS.reduce((a, b) => (scores[b] > scores[a] ? b : a));
    return { word, scores, loud: peak, dur, ok: dur >= 3 && peak > 0.02, feat: { hf, hz, lo, mid, hi, sharp } };
  }

  // basta che la parola giusta sia tra le più probabili: chi grida col cuore viene premiato
  function check(frames, target) {
    const r = analyze(frames);
    if (!r.ok) return Object.assign(r, { ok: false });
    const best = r.scores[r.word], mine = r.scores[target] || 0;
    return Object.assign(r, { ok: r.word === target || mine >= best - 0.12 || mine > 0.6 });
  }

  function supported() {
    return typeof navigator !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && !!(root.AudioContext || root.webkitAudioContext);
  }

  // ascolta il microfono per ms millisecondi; onLevel(0..1) per il misuratore
  async function listen(opts) {
    opts = opts || {};
    const ms = opts.ms || 2200;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true } });
    const AC = root.AudioContext || root.webkitAudioContext;
    const ctx = new AC();
    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024; an.smoothingTimeConstant = 0;
      src.connect(an);
      const td = new Float32Array(an.fftSize), fd = new Float32Array(an.frequencyBinCount), mag = new Float32Array(an.frequencyBinCount);
      const frames = [];
      await new Promise(res => {
        const t0 = performance.now();
        const iv = setInterval(() => {
          an.getFloatTimeDomainData(td); an.getFloatFrequencyData(fd);
          for (let i = 0; i < fd.length; i++) mag[i] = Math.pow(10, fd[i] / 20);
          const f = frameOf(td, mag, ctx.sampleRate);
          frames.push(f);
          if (opts.onLevel) opts.onLevel(Math.min(1, f.rms * 6));
          if (performance.now() - t0 >= ms) { clearInterval(iv); res(); }
        }, 20);
      });
      return frames;
    } finally {
      stream.getTracks().forEach(t => t.stop());
      ctx.close().catch(() => {});
    }
  }

  const api = { WORDS, analyze, check, listen, supported, frameOf, bandsOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Voce = api;
})(typeof window !== 'undefined' ? window : globalThis);
