// Parla: l'app mostra un kana, una parola o un kanji; si legge a voce premendo il microfono.
// Riconoscimento vocale del browser (Web Speech API, giapponese): Safari su iPhone/iPad, Chrome/Edge sul computer.
import { ROWS, WORDS, KANJI, romaji, rowOf } from './data.js';
import { S, record, pick, setUi } from './store.js';
import { speak, stopSpeech, setMicMode } from './speech.js';
import { lang } from './i18n.js';
import { $, $$, esc, IC, toast } from './ui.js';
import { matches, addReadings } from './talkmatch.js';

addReadings(KANJI);
const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
const IOS = typeof navigator !== 'undefined' && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const STANDALONE = () => { try { return navigator.standalone === true || matchMedia('(display-mode: standalone)').matches; } catch (e) { return false; } };

const TX = {
  it: { talk: 'Parla', talkSub: 'Leggi ad alta voce', letters: 'Lettere', words: 'Parole', tap: 'Tocca e leggi', listening: 'Ti ascolto…', ok: 'Giusto!',
    again: 'Riprova', heard: 'Ho capito', none: 'Non ho sentito. Riprova.', listen: 'Ascolta', skip: 'Salta',
    noSR: 'Questo browser non riconosce la voce. Usa Safari su iPhone/iPad o Chrome sul computer.',
    denied: 'Il microfono non è permesso. Consentilo per questo sito e riprova.',
    pwa: 'Dall’icona Home il microfono può non funzionare: apri il sito in Safari.',
    dict: 'Su iPhone/iPad attiva Dettatura: Impostazioni › Generali › Tastiera.',
    net: 'Il riconoscimento vocale ha bisogno di internet.', noRows: 'Scegli almeno una riga nell’Alfabeto.' },
  ja: { talk: '話す', talkSub: 'こえに 出して 読む', letters: '文字', words: 'ことば', tap: 'タップして 読む', listening: 'きいています…', ok: 'せいかい！',
    again: 'もう一度', heard: 'きこえた', none: 'きこえませんでした。', listen: 'きく', skip: 'つぎへ',
    noSR: 'この ブラウザは 音声認識が ありません。', denied: 'マイクを 許可してください。', pwa: 'Safari で ひらいてください。',
    dict: '音声入力を オンにしてください。', net: 'インターネットが ひつようです。', noRows: '五十音で ぎょうを えらんでください。' },
};
export const tt = k => (TX[lang()] || TX.it)[k] || TX.it[k];
const MIC = '<svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0"/><path d="M12 17v4"/><path d="M8 21h8"/></svg>';

let T = null, rec = null, timer = null, advT = null;

// ---- elementi ----
function pool() {
  const sc = T.script;
  if (sc === 'kanji') return KANJI.map(k => ({ key: 'kanji:' + k.k, show: k.k, reads: [k.yomi], ro: k.ro, it: k.it, say: k.yomi }));
  const sel = new Set(S.sel[sc].rows);
  if (T.mode === 'letters') return ROWS[sc].filter(r => sel.has(r.id)).flatMap(r => r.chars).map(c => ({ key: `${sc}:c:${c}`, show: c, reads: [c], ro: romaji(c), say: c }));
  let ws = WORDS[sc].filter(w => w.chars.every(c => { const r = rowOf(c); return r === null || sel.has(r); }));
  if (ws.length < 5) ws = WORDS[sc];
  return ws.map(w => ({ key: `${sc}:w:${w.k}`, show: w.k, reads: [w.k], ro: w.ro, it: w.it, say: w.k }));
}
function next() {
  const p = pool();
  T.item = p.length ? pick(p, x => x.key + '|talk', T.recent.slice(-Math.min(4, p.length - 1))) : null;
  if (T.item) { T.recent.push(T.item.key + '|talk'); if (T.recent.length > 8) T.recent.shift(); }
  T.state = 'idle'; T.heard = ''; T.tries = 0; T.recorded = false; T.reveal = false; T.msg = '';
}
function score(ok) { if (T.recorded || !T.item) return; T.recorded = true; T.n++; if (ok) T.ok++; record(T.item.key + '|talk', ok); }

export function startTalk(script, go) {
  const saved = S.ui[`${script}.talk`];
  enterTalk();
  T = { script, go, mode: script === 'kanji' ? 'kanji' : saved === 'words' ? 'words' : 'letters', recent: [], ok: 0, n: 0 };
  next();
  go('talk');
}

// ---- microfono ----
// Su Safari (iPhone/iPad) il riconoscimento è fragile: un'istanza nuova per ogni tentativo, si riparte solo
// dopo che la precedente è davvero chiusa (onend), e la sessione audio resta "registra e suona" per tutta la
// schermata (passare a "solo suono" tra un tentativo e l'altro spegne il microfono dal secondo in poi).
const wait = ms => new Promise(r => setTimeout(r, ms));
function setSession(t) { try { if (navigator.audioSession && navigator.audioSession.type !== t) navigator.audioSession.type = t; } catch (e) {} }
let closing = Promise.resolve(), pending = false, attempt = 0;
function closeRec(hard) {
  clearTimeout(timer);
  const r = rec; if (!r) return closing;
  rec = null; r.onresult = r.onerror = r.onaudiostart = r.onspeechstart = null; pending = true;
  closing = new Promise(res => {
    let d = false; const f = () => { if (!d) { d = true; pending = false; res(); } };
    r.onend = f; setTimeout(f, 1500); // se onend non arriva non resta bloccato
    try { hard ? r.abort() : r.stop(); } catch (e) { f(); }
  });
  return closing;
}
export function exitTalk() { T = null; leaveTalk(); }
export function enterTalk() { setMicMode(true); setSession('play-and-record'); }
export function leaveTalk() { attempt++; clearTimeout(advT); closeRec(true).then(() => { if (T === null) { setMicMode(false); setSession('playback'); } }); }

async function startRec(app, auto = 0) {
  if (!SR) { T.msg = tt('noSR'); T.state = 'err'; return draw(app); }
  const my = ++attempt;
  stopSpeech(); clearTimeout(advT);
  T.state = 'listen'; T.msg = ''; if (!auto) T.heard = '';
  draw(app);
  enterTalk();
  // di solito parte subito, dentro il tocco; aspetta solo se il riconoscitore di prima sta ancora chiudendo
  if (rec || pending || auto) { await closeRec(true); await wait(auto ? 400 : 250); if (my !== attempt || !T) return; }
  const r = new SR(); rec = r;
  r.lang = 'ja-JP'; r.interimResults = true; r.maxAlternatives = 5; r.continuous = false;
  const item = T.item, t0 = Date.now(); let got = false, heardAudio = false, finished = false;
  const alts = [];
  const done = ok => {
    if (finished || my !== attempt) return; finished = true; closeRec(false);
    if (ok) { score(T.tries === 0 && !T.reveal); T.state = 'ok'; draw(app); advT = setTimeout(() => { if (T && T.item === item && view() === 'talk') { next(); draw(app); } }, 1100); return; }
    // chiuso subito senza aver sentito nulla: riparte da solo una volta, senza dire niente
    if (!got && !heardAudio && Date.now() - t0 < 1500 && auto < 1) { startRec(app, auto + 1); return; }
    T.tries++; if (T.tries >= 2) T.reveal = true;
    if (got) score(false);
    T.state = 'retry'; T.msg = got ? '' : tt('none'); draw(app);
  };
  r.onaudiostart = () => { heardAudio = true; };
  r.onspeechstart = () => { heardAudio = true; };
  r.onresult = e => {
    if (my !== attempt) return;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      for (let j = 0; j < res.length; j++) { const tx = res[j].transcript; if (tx && tx.trim()) { got = true; alts.push(tx); } }
      if (res[0] && res[0].transcript) T.heard = res[0].transcript.trim();
    }
    const h = $('#t-heard'); if (h) h.textContent = T.heard ? `「${T.heard}」` : '';
    if (matches(item, alts.slice(-12))) done(true);
  };
  r.onerror = e => {
    const c = e && e.error;
    if (c === 'no-speech' || c === 'aborted') return; // decide onend
    if (my !== attempt || finished) return;
    finished = true; closeRec(true);
    T.state = 'err';
    T.msg = c === 'not-allowed' || c === 'service-not-allowed'
      ? [tt('denied'), IOS ? (STANDALONE() ? tt('pwa') : tt('dict')) : ''].filter(Boolean).join(' ')
      : c === 'network' ? tt('net') : tt('none');
    draw(app);
  };
  r.onend = () => { if (rec === r) rec = null; done(matches(item, alts)); };
  try { r.start(); } catch (e) { rec = null; if (auto < 1) return startRec(app, auto + 1); finished = true; T.state = 'err'; T.msg = tt('none'); return draw(app); }
  timer = setTimeout(() => { if (rec === r) { try { r.stop(); } catch (e) {} } }, 7000);
}

// ---- schermata ----
let view = () => '';
export function renderTalk(app, getView) {
  if (getView) view = getView;
  if (!T) { app.innerHTML = ''; return; }
  draw(app);
}
function draw(app) {
  injectCss();
  const it = T.item, sc = T.script;
  const tabs = sc === 'kanji' ? `<div class="tabs one"><button aria-selected="true">${esc(tt('talk'))}</button></div>`
    : `<div class="tabs" role="tablist">${['letters', 'words'].map(m => `<button role="tab" data-tm="${m}" aria-selected="${T.mode === m}">${esc(tt(m))}</button>`).join('')}</div>`;
  const head = `<div class="exbar"><button class="icon-btn" id="t-back" aria-label="back">${IC.back}</button>${tabs}
    <span class="count"><span class="c-ok">✓ ${T.ok}</span><span class="c-bad">✗ ${T.n - T.ok}</span></span></div>`;
  if (!it) { app.innerHTML = head + `<p class="muted center" style="margin-top:12vh">${esc(tt('noRows'))}</p>`; wire(app); return; }
  const st = T.state, len = [...it.show].length;
  const showRo = st === 'ok' || T.reveal;
  const size = sc === 'kanji' || len === 1 ? 'k1' : len <= 3 ? 'k3' : len <= 5 ? 'k5' : 'k8';
  const lbl = st === 'listen' ? tt('listening') : st === 'ok' ? tt('ok') : st === 'retry' ? tt('again') : st === 'err' ? '' : tt('tap');
  app.innerHTML = head + `<div class="talk">
    <div class="t-card ${st}"><div class="t-sym ${size}" lang="ja">${esc(it.show)}</div>
      <div class="t-ro">${showRo ? esc(sc === 'kanji' ? `${it.say} · ${it.ro}` : it.ro) : '&nbsp;'}</div>
      <div class="t-it">${showRo && it.it ? esc(it.it) : '&nbsp;'}</div></div>
    <div class="t-heard" id="t-heard" lang="ja">${T.heard ? esc(`「${T.heard}」`) : ''}</div>
    <div class="t-micwrap"><button class="t-mic ${st}" id="t-mic" aria-label="${esc(tt('tap'))}">${st === 'ok' ? IC.check : MIC}</button>
      <div class="t-lbl ${st}" role="status" aria-live="polite">${esc(lbl)}</div>
      ${T.msg ? `<div class="fb ${st === 'err' ? 'bad' : 'info'} t-msg">${esc(T.msg)}</div>` : ''}</div>
    <div class="t-tools"><button class="btn" id="t-say">${IC.sound}${esc(tt('listen'))}</button><button class="btn" id="t-skip">${esc(tt('skip'))} ${IC.next}</button></div>
  </div>`;
  wire(app);
  fit();
}
// la schermata riempie lo spazio sotto l'header, senza scorrere
function fit() {
  const el = $('.talk'); if (!el) return;
  el.style.minHeight = '3000px';
  const top = el.getBoundingClientRect().top + scrollY, below = document.documentElement.scrollHeight - (top + el.offsetHeight);
  const vh = (window.visualViewport && visualViewport.height) || innerHeight;
  el.style.minHeight = Math.max(380, Math.floor(vh - top - below)) + 'px';
}
if (typeof window !== 'undefined') addEventListener('resize', () => { if (T) fit(); });
function wire(app) {
  $('#t-back').onclick = () => { const g = T.go, sc = T.script; if (T.n) toast(`${T.ok}/${T.n} ✓`); T = null; leaveTalk(); g(sc === 'kanji' ? 'kanjiHome' : 'section', { script: sc }); };
  $$('[data-tm]').forEach(b => (b.onclick = () => { if (b.dataset.tm === T.mode) return; leaveTalk(); T.mode = b.dataset.tm; setUi(`${T.script}.talk`, T.mode); next(); draw(app); }));
  const mic = $('#t-mic'); if (mic) mic.onclick = () => { if (T.state === 'listen') { if (rec) { try { rec.stop(); } catch (e) {} } return; } if (T.state === 'ok') return; startRec(app); };
  const say = $('#t-say'); if (say) say.onclick = () => { leaveTalk(); if (T.state === 'listen') T.state = 'idle'; T.reveal = true; draw(app); speak(T.item.say); };
  const sk = $('#t-skip'); if (sk) sk.onclick = () => { leaveTalk(); stopSpeech(); if (T.state !== 'ok' && T.tries) score(false); next(); draw(app); };
}

let cssDone = false;
function injectCss() {
  if (cssDone || typeof document === 'undefined') return; cssDone = true;
  const s = document.createElement('style');
  s.textContent = `
.talk{display:flex;flex-direction:column;align-items:center;gap:clamp(10px,2.2vh,22px);max-width:640px;margin:0 auto;padding-bottom:max(12px,env(safe-area-inset-bottom))}
.tabs.one{justify-content:center;width:auto;justify-self:center}.tabs.one button{flex:0 1 auto;padding:0 22px}
.t-card{width:100%;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:22px;background:var(--surface);border:1px solid var(--line);padding:clamp(14px,3vh,32px) 12px;min-height:200px;transition:border-color .2s,background .2s}
.t-card.ok{border-color:var(--ok);background:var(--ok-soft)}
.t-sym{font-family:var(--f-kana);font-weight:600;line-height:1.05;text-align:center;word-break:keep-all;overflow-wrap:anywhere}
.t-sym.k1{font-size:clamp(6rem,34vw,11rem)}.t-sym.k3{font-size:clamp(3.6rem,19vw,7rem)}.t-sym.k5{font-size:clamp(2.8rem,14vw,5.4rem)}.t-sym.k8{font-size:clamp(2.1rem,10vw,4.2rem)}
.t-ro{font-size:clamp(1.2rem,4.6vw,1.6rem);font-weight:650;color:var(--accent);min-height:1.4em}
.t-it{color:var(--muted);font-size:1.05rem;min-height:1.3em;text-align:center}
.t-heard{min-height:1.5em;color:var(--muted);font-size:1.1rem;text-align:center}
.t-micwrap{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%}
.t-mic{width:clamp(96px,26vw,124px);height:clamp(96px,26vw,124px);border-radius:50%;display:grid;place-items:center;background:var(--accent);color:var(--accent-ink);box-shadow:0 6px 20px rgba(0,0,0,.14);transition:transform .15s,background .2s}
.t-mic svg{width:46%;height:46%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.t-mic:active{transform:scale(.95)}
.t-mic.listen{background:var(--sun,#d33);color:#fff;animation:tpulse 1.2s ease-in-out infinite}
.t-mic.ok{background:var(--ok);color:#fff}.t-mic.retry{background:var(--tip,#c80);color:#fff}
@keyframes tpulse{0%,100%{box-shadow:0 0 0 0 rgba(211,51,51,.45)}50%{box-shadow:0 0 0 18px rgba(211,51,51,0)}}
.t-lbl{font-weight:650;font-size:1.1rem;min-height:1.4em}.t-lbl.ok{color:var(--ok)}.t-lbl.retry{color:var(--tip)}
.t-msg{max-width:460px;text-align:center}
.t-tools{display:flex;gap:10px;width:100%;justify-content:center}.t-tools .btn{flex:1;max-width:220px}
@media (max-height:760px){.talk{gap:10px}.t-card{min-height:130px;padding:10px 12px}.t-mic{width:clamp(80px,13vh,104px);height:clamp(80px,13vh,104px)}.t-sym.k1{font-size:clamp(4rem,min(34vw,15vh),11rem)}}
@media (orientation:landscape) and (min-width:700px){
  .talk{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(260px,1fr);grid-template-rows:1fr auto auto 1fr;column-gap:28px;max-width:1040px;width:100%;align-items:center}
  .talk>.t-card{grid-column:1;grid-row:1/5;height:100%}
  .talk>.t-heard{grid-column:2;grid-row:2;align-self:end}.talk>.t-micwrap{grid-column:2;grid-row:3}.talk>.t-tools{grid-column:2;grid-row:4;align-self:start}
  .t-sym.k1{font-size:clamp(6rem,30vh,12rem)}
}`;
  document.head.appendChild(s);
}
