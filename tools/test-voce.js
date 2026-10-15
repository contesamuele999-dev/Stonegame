// Prova il riconoscimento delle grida di Liming Yue (voce.js) sui suoni originali in audio/liming/.
// Serve ffmpeg per leggere gli mp3. Uso: node tools/test-voce.js
const path = require('path');
const { execFileSync } = require('child_process');
const V = require(path.join(__dirname, '..', 'voce.js'));

const SR = 48000;
function pcm(file) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 26 });
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
}
// FFT radix-2 (reale → ampiezze), come un AnalyserNode con finestra di Blackman
function spectrum(x) {
  const n = x.length, re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) { const w = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / n) + 0.08 * Math.cos(4 * Math.PI * i / n); re[i] = x[i] * w; }
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len;
    for (let i = 0; i < n; i += len) for (let k = 0; k < len / 2; k++) {
      const c = Math.cos(a * k), s = Math.sin(a * k), xr = re[i + k + len / 2] * c - im[i + k + len / 2] * s, xi = re[i + k + len / 2] * s + im[i + k + len / 2] * c;
      re[i + k + len / 2] = re[i + k] - xr; im[i + k + len / 2] = im[i + k] - xi; re[i + k] += xr; im[i + k] += xi;
    }
  }
  const out = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) out[i] = Math.hypot(re[i], im[i]) / n;
  return out;
}
function frames(x, gain) {
  const out = [], hop = SR / 50, N = 1024;
  const pad = new Float32Array(SR * 0.3); // un po' di silenzio prima e dopo, come al microfono
  const y = new Float32Array(pad.length * 2 + x.length); y.set(x.map(v => v * gain), pad.length);
  for (let i = 0; i + N <= y.length; i += hop) { const td = y.subarray(i, i + N); out.push(V.frameOf(td, spectrum(td), SR)); }
  return out;
}

const expect = { shuaa1: 'shuaa', shuaa2: 'shuaa', tinn: 'tinn', tin: 'tinn', paaa: 'paaa', pah: 'paaa' };
let ok = 0, tot = 0;
for (const [name, want] of Object.entries(expect)) {
  for (const gain of [1, 0.3]) {
    const r = V.analyze(frames(pcm(path.join(__dirname, '..', 'audio', 'liming', name + '.mp3')), gain));
    const c = V.check(frames(pcm(path.join(__dirname, '..', 'audio', 'liming', name + '.mp3')), gain), want);
    tot++; if (c.ok) ok++;
    console.log(`${name.padEnd(7)} ×${gain}  sembra «${r.word}»  ${Object.entries(r.scores).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' · ')}  → ${c.ok ? 'OK' : 'NO'} (voleva ${want})`);
  }
}
// altre registrazioni (facoltative): node tools/test-voce.js cartella/ con file chiamati shuaa_*.wav, tinn_*.wav, paaa_*.wav
const fs = require('fs');
const dir = process.argv[2];
if (dir) {
  const conf = {};
  for (const f of fs.readdirSync(dir).filter(f => /^(shuaa|tinn|paaa)_/.test(f)).sort()) {
    const want = f.split('_')[0], fr = frames(pcm(path.join(dir, f)), 1);
    const r = V.analyze(fr), c = V.check(fr, want);
    tot++; if (c.ok) ok++;
    conf[want + '→' + r.word] = (conf[want + '→' + r.word] || 0) + 1;
    if (!c.ok || process.argv.includes('-v')) console.log(`${f.padEnd(14)} sembra «${r.word}»  ${Object.entries(r.scores).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' · ')}  → ${c.ok ? 'OK' : 'NO'}`);
  }
  console.log('confusione:', JSON.stringify(conf));
}
// il silenzio non deve mai valere
const quiet = V.check(frames(new Float32Array(SR), 1), 'shuaa');
console.log(`silenzio → ${quiet.ok ? 'OK (sbagliato!)' : 'niente, giusto'}`);
console.log(`${ok}/${tot} grida riconosciute`);
process.exit(quiet.ok || ok < tot * 0.75 ? 1 : 0);
