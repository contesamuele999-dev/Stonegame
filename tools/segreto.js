// Cifra le carte segrete (cartella segrete/, che non va mai pubblicata) in segreto.dat.
// Uso: node tools/segreto.js "frase segreta"
// Senza la frase il file non si può leggere: chi apre il codice del sito vede solo byte cifrati.
// Formato: "STT1" + sale (16 byte) + iv (12 byte) + dati AES-256-GCM (con il tag in coda, come WebCrypto).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ITER = 250000;
// stessa normalizzazione del gioco: niente accenti, spazi o punteggiatura, tutto minuscolo
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

const phrase = norm(process.argv[2] || '');
if (phrase.length < 8) { console.error('Serve una frase segreta di almeno 8 lettere: node tools/segreto.js "..."'); process.exit(1); }

const dir = path.join(__dirname, '..', 'segrete');
const src = fs.readFileSync(path.join(dir, 'carte.js'), 'utf8');
// le carte del pacchetto, per sapere quali immagini prendere
const ids = require(path.join(dir, 'carte.js'))(new Proxy({}, { get: () => () => {} })).cards.map(c => c.id);
const img = {};
for (const id of ids) for (const sub of ['', 'volti/']) {
  const f = path.join(dir, 'img', sub, id + '.jpg');
  img[sub + id + '.jpg'] = fs.readFileSync(f).toString('base64');
}

// stesso sale del pacchetto già pubblicato: con la stessa frase la chiave non cambia e chi aveva
// già sbloccato le carte non deve riscriverla. --nuovo-sale per cambiarlo (es. quando si cambia frase).
const out = path.join(__dirname, '..', 'segreto.dat');
const old = !process.argv.includes('--nuovo-sale') && fs.existsSync(out) ? fs.readFileSync(out) : null;
const salt = old && old.slice(0, 4).toString() === 'STT1' ? old.slice(4, 20) : crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(phrase, salt, ITER, 32, 'sha256');
const c = crypto.createCipheriv('aes-256-gcm', key, iv);
const data = Buffer.concat([c.update(JSON.stringify({ v: 1, src, img }), 'utf8'), c.final(), c.getAuthTag()]);
fs.writeFileSync(out, Buffer.concat([Buffer.from('STT1'), salt, iv, data]));
console.log(`segreto.dat: ${ids.length} carte, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
