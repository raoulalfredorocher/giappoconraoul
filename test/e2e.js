// Test automatico nel browser (Chromium headless), con tocco e Apple Pencil simulati.
// Uso: python3 -m http.server 8765 (nella cartella del repo), poi: node test/e2e.js [http://localhost:8765/]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL0 = process.argv[2] || 'http://localhost:8765/';
const SHOTS = process.env.SHOTS || path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const STROKES = Object.assign({}, ...['hira', 'kata', 'kanji'].map(k => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app', 'data', `strokes-${k}.json`), 'utf8'))));

let fails = 0, passes = 0;
const ok = (c, m) => { if (c) { passes++; console.log('  ✓', m); } else { fails++; console.log('  ✗', m); } };

// Server finto per l'account: lo stato remoto vive qui, condiviso tra "dispositivi"
const remote = { doc: null, sets: 0 };
async function newDevice(browser, { viewport = { width: 820, height: 1180 }, signed = false, storage } = {}) {
  const ctx = await browser.newContext({ viewport, hasTouch: true, deviceScaleFactor: 1, storageState: storage });
  await ctx.route(/gstatic|googleapis/, r => r.abort());
  await ctx.route(/\.pdf$/, r => r.fulfill({ status: 404, body: '' }));
  if (signed) {
    await ctx.exposeBinding('__remoteGet', () => remote.doc);
    await ctx.exposeBinding('__remoteSet', (_, d) => { remote.doc = d; remote.sets++; });
    await ctx.addInitScript(() => {
      window.HIRA_FIREBASE = null; // niente Firebase vero: lo sostituisce il finto
      window.JCA_AUTH = { email: 'test@example.com', show() {}, signOut() {} };
      window.JCA_SYNC = { get: () => window.__remoteGet(), set: d => window.__remoteSet(d) };
    });
  } else await ctx.addInitScript(() => { window.HIRA_FIREBASE = null; });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  return { ctx, page };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// punti di un modello KanjiVG (coordinate 0..109), campionati nel browser
async function tplPoints(page, ch) {
  return page.evaluate(ds => ds.map(d => {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d);
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.appendChild(p); document.body.appendChild(s);
    const L = p.getTotalLength(), n = Math.max(6, Math.ceil(L / 4)), pts = [];
    for (let i = 0; i <= n; i++) { const q = p.getPointAtLength(L * i / n); pts.push([q.x, q.y]); }
    s.remove(); return pts;
  }), STROKES[ch]);
}
// disegna un carattere nella casella `cell` del foglio con tocco (o penna)
async function drawChar(page, ch, cell = 0, { pen = false, jitter = 2.5, scale = 0.92, dx = 0, dy = 0 } = {}) {
  const box = await page.evaluate(() => { const c = document.querySelector('canvas.pad'); const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, cw: c.width }; });
  const strokes = await tplPoints(page, ch);
  const cellPx = await page.evaluate(() => { const c = document.querySelector('canvas.pad'); return parseFloat(c.dataset.cell || '0'); });
  const cols = Math.round(box.w / cellPx), k = cellPx / 109;
  const ox = box.x + (cell % cols) * cellPx, oy = box.y + Math.floor(cell / cols) * cellPx;
  const cdp = await page.context().newCDPSession(page);
  let seed = ch.charCodeAt(0) * 7 + cell; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - 0.5; };
  for (const s of strokes) {
    const pts = s.map(([x, y]) => [ox + (54.5 + (x - 54.5) * scale + dx + rnd() * jitter) * k, oy + (54.5 + (y - 54.5) * scale + dy + rnd() * jitter) * k]);
    if (pen) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pts[0][0], y: pts[0][1], button: 'left', buttons: 1, clickCount: 1, pointerType: 'pen' });
      for (const p of pts.slice(1)) await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0], y: p[1], button: 'left', buttons: 1, pointerType: 'pen' });
      const l = pts[pts.length - 1];
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: l[0], y: l[1], button: 'left', buttons: 0, clickCount: 1, pointerType: 'pen' });
    } else {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1], id: 1 }] });
      for (const p of pts.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p[0], y: p[1], id: 1 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
  }
  await cdp.detach();
}
async function drawWord(page, word, opts) { const cs = [...word]; for (let i = 0; i < cs.length; i++) await drawChar(page, cs[i], i, opts); }
const tap = (page, sel) => page.tap(sel);
const item = page => page.evaluate(() => window.JCA.item());
const fbText = page => page.evaluate(() => { const f = document.querySelector('#x-fb .fb'); return f ? f.className + ' | ' + f.innerText : ''; });

async function exerciseRound(page, label, { wrong = false } = {}) {
  const it = await item(page);
  if (!it) { ok(false, `${label}: nessun elemento`); return; }
  if (it.pad) await drawWord(page, it.target);
  if (it.needRo) await page.fill('#x-ro', it.ro);
  if (it.needIt) await page.fill('#x-it', it.it.split(/[;,]/)[0]);
  await tap(page, '#x-check'); await sleep(120);
  const fb = await fbText(page);
  const good = /fb (ok|tip)/.test(fb);
  ok(good && page.errors.length === 0, `${label}: ${it.target || it.k} → ${fb.replace(/\n/g, ' ').slice(0, 90)}`);
  if (await page.$('#x-next')) await tap(page, '#x-next'); else if (await page.$('#x-skip')) { await tap(page, '#x-skip'); await tap(page, '#x-next'); }
  await sleep(60);
}

(async () => {
  const browser = await chromium.launch();

  console.log('1. Home e navigazione');
  let { ctx, page } = await newDevice(browser);
  await page.goto(URL0); await sleep(500);
  ok(await page.$('#h-hira') && await page.$('#h-kata') && await page.$('#h-kanji') && await page.$('#h-gram') && await page.$('#h-full'), 'cinque pulsanti in Home');
  ok((await page.textContent('.logo')).includes('ジャパン・コン・アルフレード'), 'logo in giapponese');
  await page.screenshot({ path: `${SHOTS}/01-home.png` });
  for (const [b, back] of [['#h-gram', 1], ['#h-full', 1], ['#h-kanji', 1]]) { await tap(page, b); await sleep(100); ok(!!(await page.$('#b-back')), `apre ${b}`); await tap(page, '#b-back'); }

  console.log('2. Alfabeto: righe salvate dopo la chiusura');
  await tap(page, '#h-hira'); await tap(page, '#s-alpha'); await sleep(150);
  await tap(page, '[data-row="sa"]'); await tap(page, '[data-row="ga"]'); await tap(page, '[data-row="yoon"]');
  let rows = await page.evaluate(() => window.JCA.S().sel.hira.rows);
  ok(JSON.stringify(rows) === JSON.stringify(['a', 'ka', 'sa', 'ga', 'yoon']), 'righe scelte: ' + rows.join(','));
  await page.screenshot({ path: `${SHOTS}/02-alfabeto.png`, fullPage: true });
  const storage = await ctx.storageState();
  await ctx.close();
  ({ ctx, page } = await newDevice(browser, { storage }));
  await page.goto(URL0); await sleep(300);
  rows = await page.evaluate(() => window.JCA.S().sel.hira.rows);
  ok(JSON.stringify(rows) === JSON.stringify(['a', 'ka', 'sa', 'ga', 'yoon']), 'dopo chiusura e riapertura: ' + rows.join(','));
  await tap(page, '#h-hira'); await tap(page, '#s-alpha');
  ok(await page.getAttribute('[data-row="sa"]', 'aria-checked') === 'true', 'la riga さ risulta selezionata nella schermata');
  await tap(page, '[data-row="sa"]'); // tolgo
  await page.reload(); await sleep(300);
  rows = await page.evaluate(() => window.JCA.S().sel.hira.rows);
  ok(!rows.includes('sa'), 'anche la deselezione resta dopo il ricaricamento');
  await ctx.close();

  console.log('3. Account: righe uguali su due dispositivi, nessuna perdita');
  const A = await newDevice(browser, { signed: true }); await A.page.goto(URL0); await sleep(400);
  await tap(A.page, '#h-kata'); await tap(A.page, '#s-alpha'); await tap(A.page, '[data-row="ta"]'); await sleep(200);
  ok(remote.doc && JSON.parse(remote.doc.json).sel.kata.rows.includes('ta'), 'la scelta arriva subito all’account (senza attese)');
  const B = await newDevice(browser, { signed: true, viewport: { width: 390, height: 844 } }); await B.page.goto(URL0); await sleep(500);
  ok((await B.page.evaluate(() => window.JCA.S().sel.kata.rows)).includes('ta'), 'il secondo dispositivo vede la riga タ');
  await B.page.evaluate(() => { const S = window.JCA.S(); }); // B fa altro (statistiche) senza toccare le righe
  await tap(B.page, '#h-kata'); await tap(B.page, '#s-train'); await sleep(200); await exerciseRound(B.page, 'B allena');
  await A.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await sleep(300);
  ok((await A.page.evaluate(() => window.JCA.S().sel.kata.rows)).includes('ta'), 'il primo dispositivo non perde la riga dopo la sincronizzazione');
  await A.ctx.close(); await B.ctx.close();

  console.log('4. Hiragana › Allenamento (tocco)');
  ({ ctx, page } = await newDevice(browser));
  await page.goto(URL0); await sleep(300);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload(); await sleep(300);
  await tap(page, '#h-hira'); await tap(page, '#s-alpha'); await tap(page, '#a-all'); await tap(page, '#b-back');
  await tap(page, '#s-train'); await sleep(200);
  await page.screenshot({ path: `${SHOTS}/03-lettere.png` });
  for (let i = 0; i < 14; i++) await exerciseRound(page, 'Lettere');
  { const c = (await page.textContent('.exbar .count')).replace(/\s+/g, ' ').trim(); ok(c.replace(/ /g, '') === '✓14✗0', 'contatore dopo 14 giuste: ' + c); }
  ok(!!(await page.$('#hdr .logo')) && !!(await page.$('#hdr #b-set')), 'header con logo e impostazioni anche negli esercizi');
  // sbagliato di proposito: scrivo un altro kana
  { const it = await item(page); const other = it.target === 'の' ? 'あ' : 'の'; await drawChar(page, other); await tap(page, '#x-check'); await sleep(100);
    const fb = await fbText(page); ok(/fb bad/.test(fb) && page.errors.length === 0, `kana sbagliato riconosciuto (${other} invece di ${it.target}): ${fb.slice(0, 80)}`);
    await page.screenshot({ path: `${SHOTS}/04-errore.png` });
    await tap(page, '#x-retry'); await drawWord(page, it.target); await tap(page, '#x-check'); await sleep(100);
    ok(/fb (ok|tip)/.test(await fbText(page)), 'Riprova poi giusto');
    { const c = (await page.textContent('.exbar .count')).replace(/\s+/g, ' ').trim(); ok(c.replace(/ /g, '') === '✓14✗1', 'contatore dopo un errore: ' + c); }
    await tap(page, '#x-next'); }
  await tap(page, '[data-mode="audio"]'); await sleep(100);
  await page.screenshot({ path: `${SHOTS}/05-audio.png` });
  for (let i = 0; i < 8; i++) await exerciseRound(page, 'Audio');
  { // romaji sbagliato
    const it = await item(page); await drawWord(page, it.target); await page.fill('#x-ro', 'xyz'); await tap(page, '#x-check'); await sleep(80);
    ok(/fb bad/.test(await fbText(page)), 'romaji sbagliato segnalato'); await tap(page, '#x-skip'); await tap(page, '#x-next'); }
  await tap(page, '#x-back'); await sleep(100);

  console.log('5. Hiragana › Vocabolario (parola intera)');
  await tap(page, '#s-vocab'); await sleep(200);
  await page.screenshot({ path: `${SHOTS}/06-vocab.png` });
  for (let i = 0; i < 10; i++) await exerciseRound(page, 'Scrittura');
  await tap(page, '[data-mode="audio"]');
  for (let i = 0; i < 6; i++) await exerciseRound(page, 'Vocab audio');
  await tap(page, '#x-back'); await tap(page, '#b-back');

  console.log('6. Katakana');
  await tap(page, '#h-kata'); await tap(page, '#s-alpha'); await tap(page, '#a-all'); await tap(page, '#b-back');
  await tap(page, '#s-train');
  for (let i = 0; i < 12; i++) await exerciseRound(page, 'カ lettere');
  await tap(page, '#x-back'); await tap(page, '#s-vocab');
  for (let i = 0; i < 8; i++) await exerciseRound(page, 'カ parole');
  await page.screenshot({ path: `${SHOTS}/07-katakana-parola.png` });
  await tap(page, '#x-back'); await tap(page, '#b-back');

  console.log('7. Kanji');
  await tap(page, '#h-kanji'); await tap(page, '#j-train'); await sleep(150);
  for (let i = 0; i < 6; i++) await exerciseRound(page, 'Kanji scrivi');
  await tap(page, '[data-mode="ksym"]'); await page.screenshot({ path: `${SHOTS}/08-kanji-simbolo.png` });
  for (let i = 0; i < 5; i++) await exerciseRound(page, 'Kanji simbolo');
  await tap(page, '[data-mode="kaudio"]');
  for (let i = 0; i < 5; i++) await exerciseRound(page, 'Kanji audio');
  await tap(page, '#x-back'); await tap(page, '#j-list'); await tap(page, '[data-ch="山"]'); await sleep(600);
  await drawChar(page, '山'); await tap(page, '#k-check'); await sleep(100);
  ok(/fb (ok|tip)/.test(await page.evaluate(() => document.querySelector('#k-fb .fb').className)), 'scheda kanji 山: giusto');
  await ctx.close();

  console.log('7b. Tolleranza: grafia imprecisa (più piccola, spostata, tremolante)');
  ({ ctx, page } = await newDevice(browser));
  await page.goto(URL0); await sleep(300);
  await tap(page, '#h-hira'); await tap(page, '#s-alpha'); await tap(page, '#a-all'); await tap(page, '#b-back'); await tap(page, '#s-train'); await sleep(150);
  { let good = 0, tot = 0, bad = [];
    for (let i = 0; i < 30; i++) {
      const it = await item(page); const o = { jitter: 7, scale: 0.72 + (i % 4) * 0.08, dx: (i % 3 - 1) * 8, dy: (i % 5 - 2) * 5 };
      for (let c = 0; c < [...it.target].length; c++) await drawChar(page, [...it.target][c], c, o);
      await tap(page, '#x-check'); await sleep(60); tot++;
      const f = await fbText(page); if (/fb (ok|tip)/.test(f)) good++; else bad.push(it.target + ': ' + f.split('|')[1]);
      if (await page.$('#x-next')) await tap(page, '#x-next'); else { await tap(page, '#x-skip'); await tap(page, '#x-next'); }
    }
    console.log('    non accettati:', bad.join(' / ') || 'nessuno');
    ok(good / tot >= 0.85 && page.errors.length === 0, `grafia imprecisa accettata ${good}/${tot}`);
  }
  await ctx.close();

  console.log('8. Apple Pencil (iPad)');
  ({ ctx, page } = await newDevice(browser, { viewport: { width: 1180, height: 820 } }));
  await page.goto(URL0); await sleep(300);
  await tap(page, '#h-hira'); await tap(page, '#s-train'); await sleep(150);
  { const it = await item(page); await drawChar(page, it.target, 0, { pen: true }); await tap(page, '#x-check'); await sleep(100);
    ok(/fb (ok|tip)/.test(await fbText(page)), `penna: ${it.target} giusto`);
    ok(await page.evaluate(() => JSON.parse(localStorage.getItem('jca-device-v1')).pencilOnly === true), 'penna rilevata: le dita vengono ignorate');
    await tap(page, '#x-next'); await drawChar(page, (await item(page)).target, 0, { pen: false });
    await tap(page, '#x-check'); await sleep(80);
    ok(!(await fbText(page)), 'tocco con dito ignorato (foglio vuoto)');
    ok(page.errors.length === 0, 'nessun errore JavaScript');
  }
  await page.screenshot({ path: `${SHOTS}/09-ipad.png` });
  await ctx.close();

  console.log('9. Impostazioni: tema e lingua salvati');
  ({ ctx, page } = await newDevice(browser, { viewport: { width: 390, height: 844 } }));
  await page.goto(URL0); await sleep(300);
  await tap(page, '#b-set'); await tap(page, '[data-k="theme"][data-v="dark"]'); await tap(page, '[data-k="lang"][data-v="ja"]'); await tap(page, '[data-k="rate"][data-v="slow"]');
  await page.screenshot({ path: `${SHOTS}/10-impostazioni.png`, fullPage: true });
  await page.reload(); await sleep(300);
  ok(await page.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'tema scuro dopo ricaricamento');
  ok((await page.textContent('#app')).includes('ジャパン') && !(await page.textContent('#app')).includes('Giapponese completo'), 'interfaccia in giapponese');
  ok(await page.evaluate(() => window.JCA.S().settings.rate) === 'slow', 'voce lenta salvata');
  await page.screenshot({ path: `${SHOTS}/11-home-ja-scuro.png` });
  await tap(page, '#h-hira'); await tap(page, '#s-vocab'); await sleep(150);
  await page.screenshot({ path: `${SHOTS}/12-iphone-vocab.png` });
  for (let i = 0; i < 4; i++) await exerciseRound(page, 'iPhone parole');
  await ctx.close();

  await browser.close();
  console.log(`\n${passes} ok, ${fails} falliti`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
