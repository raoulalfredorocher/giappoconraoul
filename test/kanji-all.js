// Tutti i kanji: ognuno scritto col suo modello dei tratti (un po' più piccolo e tremolante) deve risultare giusto
// a Controlla, confrontato con tutti gli altri kanji (stesso riconoscimento dell'app). Ogni kanji ha anche
// la lettura con l'audio pre-generato. Uso: node test/kanji-all.js   (non serve il server)
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const root = path.join(__dirname, '..');
const entry = path.join(os.tmpdir(), 'jca-kall-entry.js'), out = path.join(os.tmpdir(), 'jca-kall.js');
fs.writeFileSync(entry, `import { check } from '${root}/app/src/recog.js'; import { KANJI } from '${root}/app/src/data.js'; import { audioFor } from '${root}/app/src/speech.js'; import { S } from '${root}/app/src/store.js';
import SJ from '${root}/app/data/strokes-kanji.json'; window.T = { check, KANJI, SJ, audioFor, S };`);
execSync(`${process.env.ESBUILD || 'npx --yes esbuild@0.24.2'} ${entry} --bundle --format=iife --loader:.txt=text --outfile=${out} --log-level=error`, { cwd: root, stdio: 'inherit' });
const LIST = fs.readFileSync(path.join(root, 'app', 'data', 'kanji-list.txt'), 'utf8').split('\n').filter(l => l && l[0] !== '#').map(l => l.split('|')[0]);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({ path: out });
  const res = await page.evaluate(LIST => {
    const { check, KANJI, SJ, audioFor } = window.T;
    const cands = KANJI.map(k => k.k), bad = [], noAudio = [];
    const sample = d => { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d);
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.appendChild(p); document.body.appendChild(s);
      const L = p.getTotalLength(), n = Math.max(6, Math.ceil(L / 4)), pts = []; for (let i = 0; i <= n; i++) { const q = p.getPointAtLength(L * i / n); pts.push([q.x, q.y]); } s.remove(); return pts; };
    for (const ch of LIST) {
      let seed = ch.charCodeAt(0) * 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - 0.5; };
      const k = 3; // cella di ~330 px
      const U = SJ[ch].map(d => sample(d).map(([x, y]) => [(54.5 + (x - 54.5) * 0.92 + rnd() * 2.5) * k, (54.5 + (y - 54.5) * 0.92 + rnd() * 2.5) * k]));
      const r = check(U, ch, { level: 'easy', candidates: cands, lang: 'it' });
      if (!r.ok) bad.push(ch + ': ' + r.msg);
      const kj = KANJI.find(x => x.k === ch); if (!audioFor(kj.yomi)) noAudio.push(ch + ' ' + kj.yomi);
    }
    return { n: KANJI.length, bad, noAudio };
  }, LIST);
  console.log(`kanji nell'app: ${res.n} (file: ${LIST.length})`);
  console.log(res.bad.length ? `${res.bad.length} NON riconosciuti:\n  ` + res.bad.join('\n  ') : `tutti i ${LIST.length} kanji riconosciuti`);
  console.log(res.noAudio.length ? `senza audio: ${res.noAudio.join(', ')}` : 'audio presente per tutti');
  console.log(errors.length ? 'errori JS: ' + errors.join(' | ') : 'nessun errore JavaScript');
  await browser.close();
  process.exit(res.bad.length || res.noAudio.length || errors.length || res.n !== LIST.length ? 1 : 0);
})();
