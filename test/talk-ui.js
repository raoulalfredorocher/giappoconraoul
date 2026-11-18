// Test della schermata Parla con un riconoscitore vocale finto (il microfono vero non si può usare qui).
// Uso: python3 -m http.server 8765, poi node test/talk-ui.js
const { chromium } = require('playwright');
const URL0 = process.argv[2] || 'http://localhost:8765/';
const SHOTS = process.env.SHOTS || require('path').join(__dirname, 'shots');
require('fs').mkdirSync(SHOTS, { recursive: true });
let f = 0, p = 0; const ok = (c, m) => { if (c) { p++; console.log('  ✓', m); } else { f++; console.log('  ✗', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  for (const [name, vp] of [['iphone', { width: 390, height: 844 }], ['ipad', { width: 820, height: 1180 }]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true });
    await ctx.route(/gstatic|googleapis/, r => r.abort());
    await ctx.addInitScript(() => {
      window.HIRA_FIREBASE = null; window.__say = null; window.__err = null;
      // riconoscitore finto: risponde con window.__say(item) o con l'errore window.__err
      window.SpeechRecognition = window.webkitSpeechRecognition = class { start() { const me = this; window.__started = (window.__started || 0) + 1; setTimeout(() => {
        if (window.__err) { me.onerror && me.onerror({ error: window.__err }); me.onend && me.onend(); return; }
        const tx = window.__say ? window.__say(window.JCA.view()) : '';
        if (tx) { const alt = [{ transcript: tx }]; alt.isFinal = true; me.onresult && me.onresult({ resultIndex: 0, results: [alt] }); }
        setTimeout(() => me.onend && me.onend(), 50); }, 150); }
        stop() { this.onend && this.onend(); } abort() {} };
    });
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(URL0); await pg.waitForSelector('#h-hira');
    console.log(name);
    for (const [sc, tile, entry] of [['hira', '#h-hira', '#s-talk'], ['kata', '#h-kata', '#s-talk'], ['kanji', '#h-kanji', '#j-talk']]) {
      await pg.click('#b-home').catch(() => {}); await pg.click(tile); await pg.click(entry); await pg.waitForSelector('#t-mic');
      const sym = await pg.textContent('.t-sym');
      ok(sym.trim().length > 0, `${sc}: mostra ${sym.trim()}`);
      // risposta giusta: il testo mostrato stesso (per i kanji la lettura)
      await pg.evaluate(() => { window.__say = () => document.querySelector('.t-sym').textContent; });
      await pg.click('#t-mic'); await pg.waitForSelector('.t-mic.ok', { timeout: 3000 }).catch(() => {});
      ok(await pg.$('.t-mic.ok'), `${sc}: giusto riconosciuto`);
      await pg.screenshot({ path: `${SHOTS}/talk-${name}-${sc}-ok.png` });
      await sleep(1400);
      const sym2 = await pg.textContent('.t-sym');
      ok(await pg.$('.t-mic:not(.ok)'), `${sc}: avanza da solo (${sym2.trim()})`);
      ok((await pg.textContent('.c-ok')).includes('1'), `${sc}: contatore ✓ 1`);
      // risposta sbagliata
      await pg.evaluate(() => { window.__say = () => 'ぱぴぷぺぽ'; });
      await pg.click('#t-mic'); await pg.waitForSelector('.t-mic.retry', { timeout: 3000 }).catch(() => {});
      ok(await pg.$('.t-mic.retry'), `${sc}: sbagliato → Riprova`);
      ok((await pg.textContent('#t-heard')).includes('ぱぴぷぺぽ'), `${sc}: mostra cosa ha capito`);
      await pg.click('#t-mic'); await pg.waitForSelector('.t-mic.retry', { timeout: 3000 });
      ok((await pg.textContent('.t-ro')).trim().length > 0, `${sc}: dopo 2 tentativi mostra la lettura`);
      await pg.screenshot({ path: `${SHOTS}/talk-${name}-${sc}-retry.png` });
      // nessuna altezza oltre lo schermo
      const over = await pg.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      ok(over <= 2, `${sc}: sta nello schermo (scroll ${over}px)`);
      const ow = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      ok(ow <= 0, `${sc}: niente scroll orizzontale`);
      await pg.click('#t-skip'); await pg.click('#t-back');
    }
    // errore permesso
    await pg.click('#b-home'); await pg.click('#h-hira'); await pg.click('#s-talk');
    await pg.evaluate(() => { window.__err = 'not-allowed'; });
    await pg.click('#t-mic'); await sleep(400);
    ok((await pg.textContent('.talk')).includes('microfono'), 'permesso negato: messaggio chiaro');
    // tab Parole
    await pg.evaluate(() => { window.__err = null; });
    await pg.click('[data-tm="words"]'); const w = await pg.textContent('.t-sym');
    ok([...w.trim()].length >= 2, `tab Parole: ${w.trim()}`);
    await pg.screenshot({ path: `${SHOTS}/talk-${name}-words.png` });
    ok(!errs.length, 'nessun errore JS ' + errs.join(' | '));
    await ctx.close();
  }
  await b.close();
  console.log(`${p} ok, ${f} errori`); process.exit(f ? 1 : 0);
})();
