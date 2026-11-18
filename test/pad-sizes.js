// Verifica che Grande/Medio/Piccolo diano fogli distinti e che il riconoscimento funzioni con tutti.
// Uso: node test/pad-sizes.js [URL]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL0 = process.argv[2] || 'http://localhost:8765/';
const STROKES = Object.assign({}, ...['hira', 'kata', 'kanji'].map(k => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app', 'data', `strokes-${k}.json`), 'utf8'))));
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
async function drawChar(page, ch, cell) {
  const box = await page.evaluate(() => { const c = document.querySelector('canvas.pad'); const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, cell: +c.dataset.cell }; });
  const strokes = await page.evaluate(ds => ds.map(d => { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.appendChild(p); document.body.appendChild(s); const L = p.getTotalLength(), n = Math.max(6, Math.ceil(L / 4)), pts = []; for (let i = 0; i <= n; i++) { const q = p.getPointAtLength(L * i / n); pts.push([q.x, q.y]); } s.remove(); return pts; }), STROKES[ch]);
  const cols = Math.round(box.w / box.cell), k = box.cell / 109, ox = box.x + (cell % cols) * box.cell, oy = box.y + Math.floor(cell / cols) * box.cell;
  const cdp = await page.context().newCDPSession(page);
  for (const s of strokes) {
    const pts = s.map(([x, y]) => [ox + (54.5 + (x - 54.5) * 0.92) * k, oy + (54.5 + (y - 54.5) * 0.92) * k]);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1], id: 1 }] });
    for (const p of pts.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p[0], y: p[1], id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await cdp.detach();
}
(async () => {
  const browser = await chromium.launch();
  const VP = { iPhone: [390, 844], iPad: [820, 1180], PC: [1440, 900] };
  for (const [name, [w, h]] of Object.entries(VP)) for (const mode of ['s-train', 's-vocab']) {
    const sizes = {};
    for (const sz of ['l', 'm', 's']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, deviceScaleFactor: 1 });
      await ctx.route(/gstatic|googleapis/, r => r.abort());
      await ctx.addInitScript(s => { window.HIRA_FIREBASE = null; let q = 12345; Math.random = () => (q = (q * 16807) % 2147483647) / 2147483647; if (!sessionStorage.x) { localStorage.clear(); localStorage.setItem('jca-device-v1', JSON.stringify({ padSize: s })); sessionStorage.x = 1; } }, sz);
      const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
      await page.goto(URL0); await sleep(300);
      await page.tap('#h-hira'); await page.tap('#s-alpha'); await page.tap('#a-all'); await page.tap('#b-back'); await page.tap('#' + mode); await sleep(250);
      const it = await page.evaluate(() => window.JCA.item());
      const cell = await page.evaluate(() => +document.querySelector('canvas.pad').dataset.cell);
      const cw = await page.evaluate(() => document.querySelector('canvas.pad').getBoundingClientRect().width);
      const cs = [...it.target]; for (let i = 0; i < cs.length; i++) await drawChar(page, cs[i], i);
      if (it.needRo) await page.fill('#x-ro', it.ro); if (it.needIt) await page.fill('#x-it', it.it.split(/[;,]/)[0]);
      await page.tap('#x-check'); await sleep(120);
      const fb = await page.evaluate(() => { const f = document.querySelector('#x-fb .fb'); return f ? f.className : ''; });
      const good = /fb (ok|tip)/.test(fb) && !errs.length; if (!good) fails++;
      sizes[sz] = cell;
      await page.screenshot({ path: path.join(__dirname, 'shots', `size-${name}-${mode}-${sz}.png`) });
      console.log(`${good ? '✓' : '✗'} ${name} ${mode} ${sz}: casella ${cell}px (${Math.round(cell / w * 100)}% largh.), foglio ${Math.round(cw)}px, ${it.target} → ${fb}`);
      await ctx.close();
    }
    if (!(sizes.l > sizes.m && sizes.m > sizes.s)) { fails++; console.log(`✗ ${name} ${mode}: dimensioni non distinte`, sizes); }
  }
  await browser.close(); console.log(fails ? `${fails} errori` : 'tutto ok'); process.exit(fails ? 1 : 0);
})();
