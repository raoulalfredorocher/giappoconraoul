// Parla: tanti tentativi di fila con un riconoscitore finto che si comporta come Safari su iPhone/iPad:
// - se si avvia mentre il precedente non ha ancora chiuso, finisce subito senza sentire nulla;
// - se la sessione audio è "playback", o è passata a "playback" mentre il microfono era aperto, non sente nulla (no-speech);
// - start() deve partire dal tocco (gesto dell'utente), non dopo un'attesa;
// - stop/abort chiudono in modo asincrono (onend arriva dopo).
// Uso: python3 -m http.server 8765, poi node test/talk-safari.js
const { chromium } = require('playwright');
const URL0 = process.argv[2] || 'http://localhost:8765/';
let f = 0, p = 0; const ok = (c, m) => { if (c) { p++; console.log('  ✓', m); } else { f++; console.log('  ✗', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true });
  await ctx.route(/gstatic|googleapis/, r => r.abort());
  await ctx.addInitScript(() => {
    window.HIRA_FIREBASE = null;
    // come WebKit: passare a "playback" mentre il microfono cattura lo lascia muto per i tentativi dopo
    let ty = 'auto'; window.__muted = false; window.__setAt = 0;
    const sess = { get type() { return ty; }, set type(v) { if (v === 'playback' && window.__active > 0) window.__muted = true; ty = v; } };
    Object.defineProperty(navigator, 'audioSession', { get: () => sess });
    window.__log = []; window.__active = 0; window.__maxActive = 0; window.__mode = 'right';
    class SR {
      start() {
        window.__gesture = navigator.userActivation ? navigator.userActivation.isActive : true;
        if (!window.__gesture) window.__log.push('no-gesture');
        if (this.started) throw new Error('InvalidStateError'); this.started = true;
        const me = this, busy = window.__active > 0;
        window.__active++; window.__maxActive = Math.max(window.__maxActive, window.__active);
        const end = () => { if (me.ended) return; me.ended = true; window.__active--; setTimeout(() => me.onend && me.onend(), 10); };
        this._end = end;
        if (busy) { window.__log.push('busy'); setTimeout(end, 30); return; }
        if (navigator.audioSession.type === 'playback' || window.__muted) { window.__log.push('mic-off'); setTimeout(() => { me.onerror && me.onerror({ error: 'no-speech' }); end(); }, 300); return; }
        window.__log.push('ok');
        setTimeout(() => { if (me.ended) return; me.onstart && me.onstart(); me.onaudiostart && me.onaudiostart(); }, 40);
        setTimeout(() => {
          if (me.ended) return;
          const shown = document.querySelector('.t-sym').textContent;
          const tx = window.__mode === 'right' ? shown : window.__mode === 'wrong' ? 'ぱぴぷぺぽ' : '';
          if (tx) { const half = [{ transcript: tx.slice(0, 1) }]; me.onresult && me.onresult({ resultIndex: 0, results: [half] });
            const fin = [{ transcript: tx }]; fin.isFinal = true; me.onresult && me.onresult({ resultIndex: 0, results: [fin] }); }
          else me.onerror && me.onerror({ error: 'no-speech' });
          setTimeout(end, 150);
        }, 250);
      }
      stop() { setTimeout(() => this._end && this._end(), 120); }
      abort() { setTimeout(() => { if (!this.ended) { this.onerror && this.onerror({ error: 'aborted' }); this._end && this._end(); } }, 80); }
    }
    window.SpeechRecognition = window.webkitSpeechRecognition = SR;
  });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(URL0); await pg.click('#h-hira'); await pg.click('#s-talk'); await pg.waitForSelector('#t-mic');
  const state = () => pg.evaluate(() => document.querySelector('.t-mic').className.replace('t-mic', '').trim() || 'idle');
  const until = async (want, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { const s = await state(); if (want.includes(s)) return s; await sleep(40); } return await state(); };
  // 10 giuste di fila, aspettando che avanzi da solo
  for (let i = 1; i <= 10; i++) {
    await pg.click('#t-mic'); const s = await until(['ok', 'retry']);
    ok(s === 'ok', `tentativo ${i}: giusto`);
    await until(['idle'], 3000);
  }
  // giusto e tocco subito il microfono di nuovo (prima che avanzi), poi giusto ancora
  await pg.click('#t-mic'); await until(['ok']); await pg.click('#t-mic'); await sleep(1300);
  await pg.click('#t-mic'); ok(await until(['ok', 'retry']) === 'ok', 'tocco veloce dopo un giusto: il successivo funziona');
  await until(['idle'], 3000);
  // sbagliato, poi Ascolta, poi giusto
  await pg.evaluate(() => (window.__mode = 'wrong')); await pg.click('#t-mic'); ok(await until(['retry']) === 'retry', 'sbagliato → Riprova');
  await pg.click('#t-say'); await sleep(300);
  await pg.evaluate(() => (window.__mode = 'right')); await pg.click('#t-mic'); ok(await until(['ok', 'retry']) === 'ok', 'dopo Ascolta il microfono funziona');
  await until(['idle'], 3000);
  // silenzio, poi giusto
  await pg.evaluate(() => (window.__mode = 'silent')); await pg.click('#t-mic'); ok(await until(['retry'], 6000) === 'retry', 'silenzio → Non ho sentito');
  await pg.evaluate(() => (window.__mode = 'right')); await pg.click('#t-mic'); ok(await until(['ok', 'retry']) === 'ok', 'dopo il silenzio il microfono funziona');
  // tocco doppio rapidissimo
  await until(['idle'], 3000); await pg.click('#t-mic'); await pg.click('#t-mic'); await sleep(100); await pg.click('#t-mic');
  ok(['ok', 'retry', 'listen'].includes(await until(['ok', 'retry'])), 'tocchi multipli: nessun blocco');
  // esco e rientro: funziona ancora
  await pg.click('#t-back'); await pg.click('#s-talk'); await pg.waitForSelector('#t-mic');
  await pg.click('#t-mic'); ok(await until(['ok', 'retry']) === 'ok', 'uscito e rientrato: funziona');
  const info = await pg.evaluate(() => ({ log: window.__log, max: window.__maxActive, sess: navigator.audioSession.type }));
  ok(info.max <= 1, `mai due riconoscitori aperti insieme (max ${info.max})`);
  ok(!info.log.includes('mic-off'), 'microfono mai spento dalla sessione audio');
  ok(info.log.filter(x => x === 'no-gesture').length <= 2, `avvio dal tocco (${info.log.filter(x => x === 'no-gesture').length} avvii fuori dal tocco)`);
  ok(info.sess === 'play-and-record', 'sessione audio registra e suona dentro Parla');
  await pg.click('#t-back'); await sleep(1700); ok(await pg.evaluate(() => navigator.audioSession.type) === 'playback', 'uscito da Parla: sessione audio torna normale');
  ok(!errs.length, 'nessun errore JS ' + errs.join(' | '));
  console.log('avvii:', info.log.join(' '));
  await b.close(); console.log(`${p} ok, ${f} errori`); process.exit(f ? 1 : 0);
})();
