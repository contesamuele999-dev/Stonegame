// Nuova versione del gioco: alza il numero in index.html (meta "versione" e ?v= degli script),
// in versione.json e nella cache del service worker (sw.js). Ogni telefono, appena se ne accorge,
// si ricarica da solo con la versione nuova. Uso: node tools/nuova-versione.js (push.bat lo fa da solo).
const fs = require('fs');
const path = require('path');
const at = f => path.join(__dirname, '..', f);
const html = fs.readFileSync(at('index.html'), 'utf8');
const m = /<meta name="versione" content="(\d+)">/.exec(html);
if (!m) { console.error('index.html: manca <meta name="versione">'); process.exit(1); }
const v = String(+m[1] + 1);
fs.writeFileSync(at('index.html'), html.replace(m[0], `<meta name="versione" content="${v}">`).replace(/(<script src="[^"]+\.js)\?v=\d+"/g, `$1?v=${v}"`));
fs.writeFileSync(at('versione.json'), `{ "v": "${v}" }\n`);
const sw = fs.readFileSync(at('sw.js'), 'utf8');
fs.writeFileSync(at('sw.js'), sw.replace(/const CACHE = 'stonetao-v\d+';/, `const CACHE = 'stonetao-v${v}';`));
console.log('Versione ' + v);
