// Ricrea la cartella segrete/ (carte.js e immagini) da segreto.dat: il contrario di tools/segreto.js.
// Uso: node tools/apri-segreto.js "frase segreta"
// Serve dopo un pull, quando il pacchetto è stato aggiornato da un altro computer.
// Sovrascrive i file in segrete/ con quelli del pacchetto.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ITER = 250000;
// stessa normalizzazione del gioco: niente accenti, spazi o punteggiatura, tutto minuscolo
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

const buf = fs.readFileSync(path.join(__dirname, '..', 'segreto.dat'));
if (buf.slice(0, 4).toString() !== 'STT1') { console.error('segreto.dat non valido'); process.exit(1); }
const salt = buf.slice(4, 20), iv = buf.slice(20, 32), data = buf.slice(32);
const key = crypto.pbkdf2Sync(norm(process.argv[2] || ''), salt, ITER, 32, 'sha256');
let pack;
try {
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(data.slice(-16));
  pack = JSON.parse(Buffer.concat([d.update(data.slice(0, -16)), d.final()]).toString('utf8'));
} catch (e) { console.error('Frase sbagliata: il pacchetto non si apre.'); process.exit(1); }

const dir = path.join(__dirname, '..', 'segrete');
fs.mkdirSync(path.join(dir, 'img', 'volti'), { recursive: true });
fs.writeFileSync(path.join(dir, 'carte.js'), pack.src);
for (const f in pack.img) fs.writeFileSync(path.join(dir, 'img', f), Buffer.from(pack.img[f], 'base64'));
console.log(`segrete/: carte.js e ${Object.keys(pack.img).length} immagini`);
