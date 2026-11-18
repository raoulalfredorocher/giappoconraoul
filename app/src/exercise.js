// Esercizi: Allenamento (lettere / audio), Vocabolario (scrittura / audio), Kanji (scrivi / simbolo / audio).
import { ROWS, WORDS, KANJI, RO, romaji, roNorm, rowOf, homophones } from './data.js';
import { S, device, record, pick, stat, setUi } from './store.js';
import { check, hasTpl } from './recog.js';
import { Pad, fitPad } from './pad.js';
import { speak, stopSpeech } from './speech.js';
import { t, lang } from './i18n.js';
import { $, $$, esc, IC, toast } from './ui.js';

export const MODES = {
  train: ['letters', 'audio'],
  vocab: ['write', 'audio'],
  kanji: ['kwrite', 'ksym', 'kaudio'],
};
const MODE_LABEL = { letters: 'letters', audio: 'audio', write: 'writing', kwrite: 'kWrite', ksym: 'kSymbol', kaudio: 'kAudio' };

let Q = null, pad = null;
export function currentPad() { return pad; }

const CANDS = {};
function candidates(script) {
  if (CANDS[script]) return CANDS[script];
  if (script === 'kanji') return (CANDS[script] = KANJI.map(k => k.k));
  const out = []; for (const r of ROWS[script]) for (const it of r.chars) if ([...it].length === 1) out.push(it);
  return (CANDS[script] = out);
}
const roOf = c => RO[c] || romaji(c);

// ---- scelta degli elementi ----
function selectedRows(script) { const sel = new Set(S.sel[script].rows); return ROWS[script].filter(r => sel.has(r.id)); }
function poolFor(Qs) {
  const { script, kind } = Qs;
  if (script === 'kanji') return KANJI.map(k => ({ key: 'kanji:' + k.k, k }));
  if (kind === 'train') {
    const items = selectedRows(script).flatMap(r => r.chars);
    return items.map(c => ({ key: `${script}:c:${c}`, c }));
  }
  const sel = new Set(S.sel[script].rows);
  const ok = w => w.chars.every(c => { const r = rowOf(c); return r === null || sel.has(r); });
  let ws = WORDS[script].filter(ok);
  Qs.fallback = false;
  if (ws.length < 5) { ws = WORDS[script]; Qs.fallback = true; }
  return ws.map(w => ({ key: `${script}:w:${w.k}`, w }));
}
function makeItem(Qs, p) {
  const m = Qs.mode, sc = Qs.script;
  if (p.c) { // kana o combinazione
    const ro = romaji(p.c);
    return { key: p.key, target: p.c, ro, say: p.c, show: m === 'letters' ? ro : null, audio: m === 'audio', pad: true, needRo: m === 'audio', listen: m === 'letters' };
  }
  if (p.w) {
    const w = p.w;
    return { key: p.key, target: w.k, ro: w.ro, it: w.it, say: w.k, show: m === 'write' ? w.ro : null, sub: m === 'write' ? w.it : null, audio: m === 'audio', pad: true, needRo: m === 'audio', listen: m === 'write', labels: m === 'write' };
  }
  const k = p.k; // kanji
  if (m === 'kwrite') return { key: p.key, target: k.k, ro: k.ro, it: k.it, say: k.yomi, show: k.it, pad: true, listen: true };
  if (m === 'ksym') return { key: p.key, target: null, k: k.k, ro: k.ro, it: k.it, say: k.yomi, showKanji: k.k, needIt: true, listen: true };
  return { key: p.key, target: k.k, ro: k.ro, it: k.it, say: k.yomi, audio: true, pad: true, needIt: true, yomi: k.yomi };
}
function nextItem() {
  const pool = poolFor(Q);
  if (!pool.length) { Q.item = null; return; }
  const keyStat = p => p.key + '|' + Q.mode;
  const p = pick(pool, keyStat, Q.recent.slice(-Math.min(4, pool.length - 1)));
  Q.recent.push(keyStat(p)); if (Q.recent.length > 8) Q.recent.shift();
  Q.item = makeItem(Q, p); Q.statKey = keyStat(p);
  Q.phase = 'draw'; Q.order = 1; Q.miss = false; Q.recorded = false; Q.msg = null; Q.cellFb = []; Q.ghost = false; Q.vals = { ro: '', it: '' }; Q.res = null;
}

export function startExercise(script, kind, go) {
  const modes = MODES[kind];
  const saved = S.ui[`${script}.${kind}`];
  Q = { script, kind, modes, mode: modes.includes(saved) ? saved : modes[0], recent: [], ok: 0, n: 0, go };
  nextItem();
  go('ex');
}
export function exAlive() { return !!Q; }
export function exItem() { return Q && Q.item; }

// ---- schermata ----
export function renderExercise(app) {
  const it = Q.item, sc = Q.script;
  const head = `<div class="exbar"><button class="icon-btn" id="x-back" aria-label="${esc(t('back'))}">${IC.back}</button>
    <div class="tabs" role="tablist">${Q.modes.map(m => `<button role="tab" data-mode="${m}" aria-selected="${Q.mode === m}">${esc(t(MODE_LABEL[m]))}</button>`).join('')}</div>
    <span class="count" aria-label="${esc(t('ok'))}"><span class="c-ok">✓ ${Q.ok}</span><span class="c-bad">✗ ${Q.n - Q.ok}</span></span></div>`;
  if (!it) {
    app.innerHTML = (sc === 'kanji' ? kanjiHead() : head) + `<p class="muted center" style="margin-top:12vh">${esc(t('noRows'))}</p>`;
    wireHead(app); return;
  }
  const n = it.target ? [...it.target].length : 0;
  const done = Q.phase === 'done';
  const train = Q.kind === 'train';
  const showAnswer = done || Q.phase === 'bad';
  const big = it.showKanji ? `<div class="bigk">${esc(it.showKanji)}</div>`
    : it.audio ? `<button class="playbig" id="x-play" aria-label="${esc(t('play'))}">${IC.play}<span>${esc(t(Q.played ? 'replay' : 'play'))}</span></button>`
    : `<div class="big ${it.target && sc === 'kanji' ? 'it' : ''}">${esc(it.show)}</div>${it.sub ? `<div class="sub">${esc(it.sub)}</div>` : ''}`;
  const ask = it.audio ? '' : it.pad ? `<div class="ask">${esc(sc === 'kanji' ? t('writeKanji') : n > 1 ? t('writeWord') : t('writeKana', sc))}</div>` : '';
  const inputs = `${it.needRo ? `<input class="ans" id="x-ro" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="latin" placeholder="${esc(t('romajiPh'))}" value="${esc(Q.vals.ro)}" ${done ? 'readonly' : ''}>` : ''}
    ${it.needIt ? `<input class="ans" id="x-it" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(t('italianPh'))}" value="${esc(Q.vals.it)}" ${done ? 'readonly' : ''}>` : ''}`;
  const reveal = showAnswer && done ? `<div class="reveal">${it.target || it.k ? `<span class="k">${esc(it.target || it.k)}</span>` : ''}<span>${esc(it.ro)}${it.it ? ' · ' + esc(it.it) : ''}</span></div>` : '';
  const listenBtn = it.listen || (done && it.say) ? `<button class="btn" id="x-say">${IC.sound}${esc(t('play'))}</button>` : '';
  // Allenamento kana: riga compatta (lettura + Ascolta rotondo, oppure Ascolta + risposta), foglio grande sotto
  const sndBtn = id => `<button class="sndbtn${id === 'x-play' ? ' lg' : ''}" id="${id}" aria-label="${esc(t(id === 'x-play' && Q.played ? 'replay' : 'play'))}">${IC.sound}</button>`;
  const prompt = !train ? null : it.audio ? `<section class="prompt tp">${sndBtn('x-play')}${inputs}${reveal}</section>`
    : `<section class="prompt tp"><div class="tp-main"><div class="big">${esc(it.show)}</div>${ask}</div>${sndBtn('x-say')}${reveal}</section>`;
  const actions = done ? `${train ? '' : listenBtn}<button class="btn primary grow" id="x-next">${esc(t('next'))} ${IC.next}</button>`
    : Q.phase === 'bad' ? `<button class="btn" id="x-skip">${esc(t('next'))}</button><button class="btn primary grow" id="x-retry">${esc(t('retry'))}</button>`
    : `<button class="btn primary grow" id="x-check">${IC.check} ${esc(t('check'))}</button>`;
  if (sc === 'kanji') app.innerHTML = kanjiView(it, done, actions);
  else app.innerHTML = head + `<div class="quiz ${it.pad ? '' : 'nopad'}${train ? ' train' : ''}">
    <div class="side">${prompt || `<section class="prompt">${big}${ask}${inputs}${reveal}
      ${!done && it.listen && !it.audio ? `<div class="row">${listenBtn}</div>` : ''}${Q.fallback && Q.kind === 'vocab' ? `<div class="muted small">${esc(t('fewWords'))}</div>` : ''}</section>`}</div>
    <div class="fbslot" id="x-fb">${Q.msg ? `<div class="fb ${Q.msg.type}">${Q.msg.lines.map(esc).join('<br>')}</div>` : ''}</div>
    ${it.pad ? `<div class="padwrap" id="x-padwrap"><canvas class="pad" id="x-pad" aria-label="Foglio"></canvas>
      <div class="tools">${!done ? `<button class="icon-btn" id="x-clear" aria-label="${esc(t('clearAll'))}">${IC.clear}</button><button class="icon-btn" id="x-undo" aria-label="${esc(t('undo'))}">${IC.undo}</button><button class="btn" id="x-model">${IC.eye}<span class="hide-phone">${esc(t('model'))}</span></button>` : ''}${actions}</div></div>`
      : `<div class="tools solo">${actions}</div>`}
  </div>`;
  wireHead(app);
  if (it.pad) {
    const prev = pad && pad.n === n && Q.keepStrokes ? pad.strokes : null;
    pad = new Pad($('#x-pad'), n, { onPen: () => toast(t('penFound')) });
    if (prev) { pad.strokes = prev; if (Q.order) pad.order = Q.order; }
    pad.cellFb = Q.cellFb.slice();
    pad.ghost = Q.ghost ? [...it.target].map((c, i) => (Q.cellFb[i] && Q.cellFb[i].state === 'ok' ? null : c)) : [];
    if (it.labels) pad.labels = [...it.target].map(c => labelFor(c));
    if (sc === 'kanji') fitKanji(); else if (train) fitTrain(app); else fitPad(pad, $('#x-padwrap'), 76);
    pad.locked = done || Q.phase === 'bad';
    
  } else { pad = null; if (sc === 'kanji') fitKanji(); }
  Q.keepStrokes = false;
  const ro = $('#x-ro'), itn = $('#x-it');
  if (ro) ro.oninput = () => (Q.vals.ro = ro.value);
  if (itn) itn.oninput = () => (Q.vals.it = itn.value);
  [ro, itn].forEach(el => el && (el.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const b = $('#x-check') || $('#x-next') || $('#x-retry'); b && b.click(); } }));
  const play = $('#x-play'); if (play) play.onclick = () => { Q.played = true; speak(it.say, 3); const sp = play.querySelector('span'); if (sp) sp.textContent = t('replay'); else play.setAttribute('aria-label', t('replay')); };
  const say = $('#x-say'); if (say) say.onclick = () => speak(it.say, 1);
  const bc = $('#x-check'); if (bc) bc.onclick = doCheck;
  const bn = $('#x-next'); if (bn) bn.onclick = () => { stopSpeech(); Q.played = false; nextItem(); renderExercise(app); };
  const bs = $('#x-skip'); if (bs) bs.onclick = () => { finish(false); renderExercise(app); };
  const br = $('#x-retry'); if (br) br.onclick = () => { Q.phase = 'draw'; Q.msg = null; if (pad) { pad.clearBad(); Q.cellFb = pad.cellFb.slice(); Q.keepStrokes = true; } renderExercise(app); };
  const cl = $('#x-clear'); if (cl) cl.onclick = () => { if (pad.free) { pad.clear(); Q.cellFb = []; return; } pad.strokes = pad.strokes.filter(s => { const f = Q.cellFb[pad.cellOf(s)]; return f && f.state === 'ok'; }); pad.draw();  };
  const ud = $('#x-undo'); if (ud) ud.onclick = () => { pad.undo();  };
  const md = $('#x-model'); if (md) md.onclick = () => {
    Q.miss = true;
    if (n === 1) pad.animate(it.target, 0);
    else { Q.ghost = !Q.ghost; pad.ghost = Q.ghost ? [...it.target].map((c, i) => (Q.cellFb[i] && Q.cellFb[i].state === 'ok' ? null : c)) : []; pad.draw();  }
  };
  const app2 = app;
  Q.rerender = () => renderExercise(app2);
}
// ---- Kanji: schermata a tutto schermo (linguette intere, prompt compatto, foglio grande, barra in basso) ----
const K_ICON = {
  kwrite: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
  ksym: '<span class="kti" aria-hidden="true">字</span>',
  kaudio: IC.sound,
};
function kanjiHead() {
  return `<div class="exbar kj"><button class="icon-btn" id="x-back" aria-label="${esc(t('back'))}">${IC.back}</button>
    <div class="tabs" role="tablist">${Q.modes.map(m => `<button role="tab" data-mode="${m}" aria-selected="${Q.mode === m}">${K_ICON[m]}<span>${esc(t(MODE_LABEL[m]))}</span></button>`).join('')}</div>
    <span class="count" aria-label="${esc(t('ok'))}"><span class="c-ok">✓ ${Q.ok}</span><span class="c-bad">✗ ${Q.n - Q.ok}</span></span></div>`;
}
function kanjiView(it, done, actions) {
  const say = `<button class="btn klisten" id="x-say" aria-label="${esc(t('play'))}">${IC.sound}<span>${esc(t('play'))}</span></button>`;
  const inp = it.needIt ? `<input class="ans" id="x-it" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="${esc(t('italianPh'))}" value="${esc(Q.vals.it)}" ${done ? 'readonly' : ''}>` : '';
  const reveal = done ? `<div class="reveal"><span class="k">${esc(it.target || it.k)}</span><span>${esc(it.ro)}${it.it ? ' · ' + esc(it.it) : ''}</span></div>` : '';
  let prompt;
  if (Q.mode === 'kwrite') prompt = `<section class="kp"><div class="khead"><div class="kmw"><div class="kmean">${esc(it.show)}</div><div class="kask">${esc(t('writeKanji'))}</div></div>${say}</div>${reveal}</section>`;
  else if (Q.mode === 'ksym') prompt = `<section class="kp kbig"><div class="bigk">${esc(it.showKanji)}</div><div class="krow">${inp}${say}</div>${reveal}</section>`;
  else prompt = `<section class="kp"><div class="krow"><button class="btn primary klisten" id="x-play" aria-label="${esc(t('play'))}">${IC.play}<span>${esc(t(Q.played ? 'replay' : 'play'))}</span></button>${inp}</div>${reveal}</section>`;
  const fb = `<div class="fbslot" id="x-fb">${Q.msg ? `<div class="fb ${Q.msg.type}">${Q.msg.lines.map(esc).join('<br>')}</div>` : ''}</div>`;
  const tools = it.pad && !done && Q.phase !== 'bad' ? `<button class="icon-btn" id="x-clear" aria-label="${esc(t('clearAll'))}">${IC.clear}</button><button class="icon-btn" id="x-undo" aria-label="${esc(t('undo'))}">${IC.undo}</button><button class="icon-btn" id="x-model" aria-label="${esc(t('model'))}">${IC.eye}</button>` : '';
  const bar = `<div class="kbar">${tools}${actions.replace(/<button class="btn" id="x-say">[\s\S]*?<\/button>/, '')}</div>`;
  return kanjiHead() + `<div class="kq ${it.pad ? 'haspad' : 'nopad'}" id="x-kq">
    <div class="kside">${prompt}${fb}</div>
    ${it.pad ? `<div class="kmain"><div class="kslot" id="x-padwrap"><canvas class="pad" id="x-pad" aria-label="Foglio"></canvas></div>${bar}</div>` : `<div class="kmain">${bar}</div>`}
  </div>`;
}
// il blocco riempie lo schermo fino in fondo; il foglio prende tutto lo spazio rimasto (quadrato)
function fitKanji() {
  const kq = $('#x-kq'); if (!kq) return;
  const appEl = $('#app'), padB = appEl ? parseFloat(getComputedStyle(appEl).paddingBottom) || 0 : 0;
  kq.style.height = Math.max(380, window.innerHeight - (kq.getBoundingClientRect().top + window.scrollY) - padB) + 'px';
  if (!pad) return;
  const slot = $('#x-padwrap');
  pad.c.style.width = pad.c.style.height = '0px';
  const side = Math.floor(Math.min(slot.clientWidth, slot.clientHeight, 760));
  const f = { l: 1, m: 0.7, s: 0.4 }[device.padSize || 'l'] || 1;
  pad.layout(Math.max(110, Math.floor(side * f)), 1);
}
let kResizeT = null;
window.addEventListener('resize', () => { clearTimeout(kResizeT); kResizeT = setTimeout(() => { if (Q && Q.script === 'kanji' && $('#x-kq')) fitKanji(); }, 120); });
// Allenamento: la schermata riempie l'altezza visibile; il foglio prende lo spazio che resta
// (con un margine fisso per il messaggio dopo Controlla, così il foglio non cambia misura).
function fitTrain(app) {
  const q = $('.quiz.train', app), wrap = $('#x-padwrap'); if (!q || !wrap) return;
  const root = document.getElementById('app') || app, pb = parseFloat(getComputedStyle(root).paddingBottom) || 0;
  const top = q.getBoundingClientRect().top + (window.scrollY || 0);
  q.style.height = Math.max(0, Math.floor(window.innerHeight - top - pb)) + 'px';
  q.classList.add('measuring');
  const tools = $('.tools', wrap), th = tools ? tools.getBoundingClientRect().height : 48;
  const wide = getComputedStyle(q).display === 'grid';
  fitPad(pad, wrap, th + 10 + pb + (wide ? 0 : 66), 900);
  q.classList.remove('measuring');
}
let lastW = window.innerWidth, rzT = 0;
addEventListener('resize', () => {
  if (!Q || !Q.rerender || Q.script === 'kanji' || window.innerWidth === lastW) return; // la tastiera cambia solo l'altezza: si ignora
  lastW = window.innerWidth; clearTimeout(rzT);
  rzT = setTimeout(() => { if (Q && Q.rerender) { Q.keepStrokes = true; Q.rerender(); } }, 150);
});
function wireHead(app) {
  $('#x-back').onclick = () => { stopSpeech(); const g = Q.go, sc = Q.script; if (Q.n) toast(`${Q.ok}/${Q.n} ${t('ok')}`); Q = null; pad = null; g(sc === 'kanji' ? 'kanjiHome' : 'section', { script: sc }); };
  $$('[data-mode]').forEach(b => (b.onclick = () => { if (b.dataset.mode === Q.mode) return; stopSpeech(); Q.mode = b.dataset.mode; setUi(`${Q.script}.${Q.kind}`, Q.mode); Q.played = false; nextItem(); renderExercise(app); }));
}
// pronuncia piccola in alto a sinistra di ogni casella (Vocabolario › Scrittura), secondo "Aiuti nei test"
function labelFor(c) {
  if (c === 'ー') return '';
  if (S.settings.hints === 'always') return roOf(c);
  const s = stat(`${Q.script}:c:${c}|letters`);
  return s && (s.box || 0) >= 3 ? '' : roOf(c);
}
// ---- controllo ----
function itNorm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s']/g, ' ').replace(/\b(il|lo|la|i|gli|le|un|uno|una|di|del|della|dei|delle|l|un')\b/g, ' ').replace(/\b[lu]n?'/g, '').replace(/\s+/g, ' ').trim(); }
function lev(a, b) { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let p = [...Array(n + 1).keys()]; for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[n]; }
export function meaningOk(ans, it) {
  const x = itNorm(ans); if (!x) return false;
  const alts = it.replace(/\([^)]*\)/g, '').split(/[,;/]| o /).map(itNorm).filter(Boolean);
  for (const a of alts) {
    if (x === a) return true;
    if (lev(x, a) / Math.max(x.length, a.length) <= 0.25) return true;
    if (a.length >= 4 && ` ${x} `.includes(` ${a} `)) return true;
    if (x.length >= 4 && ` ${a} `.includes(` ${x} `)) return true;
  }
  return false;
}
export function romajiOk(ans, ro) { const a = roNorm(ans); return !!a && a === roNorm(ro); }

function doCheck() {
  const it = Q.item, lines = [], tips = [];
  let allOk = true;
  if (it.pad) {
    const groups = pad.groups();
    if (!groups.some(g => g.length) && !(it.needRo && Q.vals.ro)) { toast(t('writeFirst')); return; }
    const chars = [...it.target];
    // in "audio" valgono anche i kana con lo stesso suono (じ/ぢ, ず/づ, お/を) e, per i kanji, quelli con la stessa lettura
    const variants = it.audio ? (Q.script === 'kanji' ? KANJI.filter(k => k.yomi === it.yomi).map(k => [k.k]) : homophones(it.target).map(v => [...v])) : [chars];
    const run = groups => { const cf = [], lines = [], tips = []; let allOk = true, nOk = 0;
    chars.forEach((c, i) => {
      if (Q.cellFb[i] && Q.cellFb[i].state === 'ok') { cf[i] = Q.cellFb[i]; return; }
      const g = groups[i];
      if (!g.length) { cf[i] = { ch: c, state: 'bad', showTpl: true }; lines.push(cellLine(i, chars.length, c, t('cellMissing'))); allOk = false; return; }
      let r = null, used = c;
      for (const v of variants) { const cc = v[i] || c; if (!hasTpl(cc)) continue; const rr = check(g, cc, { level: S.settings.level, candidates: candidates(Q.script), lang: lang(), ro: roOf }); if (!r || rr.ok) { r = rr; used = cc; } if (rr.ok) break; }
      if (r.ok) { nOk++; cf[i] = { ch: used, state: 'ok', hl: r.tips && r.tips.length ? r.hl : null }; if (r.tips && r.tips.length) tips.push(cellLine(i, chars.length, used, r.tips[0])); }
      else { cf[i] = { ch: c, state: 'bad', showTpl: true, hl: r.hl }; lines.push(cellLine(i, chars.length, c, r.msg)); allOk = false; }
    });
    return { cf, lines, tips, allOk, nOk }; };
    // parola libera: vale sia scritta da sinistra a destra sia da destra a sinistra
    let best;
    if (pad.free) { const [gf, gr] = pad.groupsBoth(); const a = run(gf); const b = a.allOk ? null : run(gr); best = b && b.nOk > a.nOk ? b : a; pad.order = best === a ? 1 : -1; pad._seg = null; }
    else best = run(groups);
    const cf = best.cf; lines.push(...best.lines); tips.push(...best.tips); if (!best.allOk) allOk = false;
    Q.cellFb = cf; Q.order = pad.order; pad.cellFb = cf.slice(); pad.locked = false;
  }
  if (it.needRo) { if (!romajiOk(Q.vals.ro, it.ro)) { allOk = false; lines.push(Q.vals.ro.trim() ? t('wrongRomaji', it.ro) : t('missingRomaji')); } }
  if (it.needIt) { if (!meaningOk(Q.vals.it, it.it)) { allOk = false; lines.push(Q.vals.it.trim() ? t('wrongIt', it.it) : t('missingIt')); } }
  if (allOk) {
    Q.msg = { type: tips.length ? 'tip' : 'ok', lines: [t(Q.miss ? 'correct' : 'great'), ...tips] };
    finish(!Q.miss);
  } else {
    Q.miss = true;
    if (!Q.recorded) { record(Q.statKey, false); Q.recorded = true; Q.n++; }
    Q.msg = { type: 'bad', lines }; Q.phase = 'bad';
  }
  Q.keepStrokes = true;
  Q.rerender();
}
function cellLine(i, n, c, msg) { return n > 1 ? `${t('nth', i)} (${c}): ${msg}` : msg; }
function finish(ok) {
  if (!Q.recorded) { record(Q.statKey, ok); Q.recorded = true; Q.n++; if (ok) Q.ok++; }
  Q.phase = 'done'; Q.keepStrokes = true;
  if (!Q.msg) Q.msg = null;
}
