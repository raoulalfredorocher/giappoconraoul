// Schermate: Home, sezioni, Alfabeto, scheda del kana/kanji, Kanji, Impostazioni, sezioni in arrivo.
import { ROWS, WORDS, KANJI, KCATS, RO, romaji } from './data.js';
import { S, device, saveDevice, setRows, setSetting, connected, resetAll, saveNow } from './store.js';
import { tpl, check } from './recog.js';
import { Pad, fitPad } from './pad.js';
import { speak, stopSpeech } from './speech.js';
import { t, lang } from './i18n.js';
import { $, $$, esc, IC, toast, logo } from './ui.js';
import { startExercise, renderExercise } from './exercise.js';

export let view = { name: 'home' };
let pad = null;
export function go(name, args = {}) {
  // Impostazioni: ricorda da dove arrivo, Indietro ci riporta lì
  if (name === 'settings' && view.name !== 'settings') args = { ...args, ret: { ...view } };
  stopSpeech(); if (pad) pad.stopAnim(); view = { name, ...args }; render(); window.scrollTo(0, 0); }
// Header uguale in tutte le schermate: logo (torna alla Home) e rotellina delle impostazioni
function header() {
  const root = $('#app');
  if (!$('#hdr')) root.innerHTML = '<header id="hdr"></header><main id="view"></main>';
  const wide = view.name === 'ex' || view.name === 'sheet';
  const h = $('#hdr');
  h.className = 'home-head' + (wide ? '' : ' narrow');
  h.innerHTML = `<button class="logo-btn" id="b-home" aria-label="Home">${logo(lang())}</button><button class="icon-btn plain" id="b-set" aria-label="${esc(t('settings'))}">${IC.gear}</button>`;
  $('#b-home').onclick = () => { if (view.name !== 'home') go('home'); };
  $('#b-set').onclick = () => { if (view.name !== 'settings') go('settings'); };
  return $('#view');
}
export function render() {
  document.documentElement.lang = lang();
  const app = header();
  const R = { home, section, alpha, sheet, kanjiHome, kanjiList, soon, settings, ex: renderExercise }[view.name] || home;
  R(app);
}
const PDF = { hira: 'pdf/hiragana.pdf', kata: 'pdf/katakana.pdf', kanji: 'pdf/kanji.pdf' };
export const pdfAvail = {};
const top = (title, backTo, extra = '') => `<div class="topbar"><button class="icon-btn" id="b-back" aria-label="${esc(t('back'))}">${IC.back}</button><span class="title">${title}</span><span class="spacer"></span>${extra}</div>`;
const wireBack = to => { $('#b-back').onclick = () => go(...to); };

// ---- Home ----
function home(app) {
  const L = lang();
  const tile = (id, jp, lbl) => `<button class="tile" id="${id}"><span class="jp">${jp}</span>${L === 'ja' ? '' : `<span class="lbl">${lbl}</span>`}</button>`;
  app.innerHTML = `<div class="narrow">
    <div class="tiles">
      ${tile('h-hira', 'ひらがな', 'Hiragana')}${tile('h-kata', 'カタカナ', 'Katakana')}
      ${tile('h-kanji', '漢字', 'Kanji')}${tile('h-gram', '文法', 'Grammatica')}
    </div>
    <button class="tile wide" id="h-full"><span class="jp">総合日本語</span>${L === 'ja' ? '' : '<span class="lbl">Giapponese completo</span>'}</button>
  </div>`;
  $('#h-hira').onclick = () => go('section', { script: 'hira' });
  $('#h-kata').onclick = () => go('section', { script: 'kata' });
  $('#h-kanji').onclick = () => go('kanjiHome');
  $('#h-gram').onclick = () => go('soon', { what: 'gram' });
  $('#h-full').onclick = () => go('soon', { what: 'full' });
}

// ---- Hiragana / Katakana ----
function section(app) {
  const sc = view.script, title = sc === 'kata' ? 'カタカナ' : 'ひらがな';
  const nRows = S.sel[sc].rows.length;
  const row = (id, k, label, sub) => `<button class="choice" id="${id}"><span class="k">${k}</span><span class="t"><b>${esc(label)}</b>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</span>${IC.chev}</button>`;
  const a = sc === 'kata' ? 'ア' : 'あ', w = sc === 'kata' ? 'カ' : 'か';
  app.innerHTML = `<div class="narrow">${top(`<span class="jpt">${title}</span>`)}
    <div class="choices">
      ${row('s-alpha', a, t('alphabet'), t('rowsChosen', nRows))}
      ${row('s-train', '書', t('training'), `${t('letters')} · ${t('audio')}`)}
      ${row('s-vocab', '語', t('vocab'), `${t('writing')} · ${t('audio')}`)}
    </div></div>`;
  wireBack(['home']);
  $('#s-alpha').onclick = () => go('alpha', { script: sc });
  $('#s-train').onclick = () => startExercise(sc, 'train', go);
  $('#s-vocab').onclick = () => startExercise(sc, 'vocab', go);
}

function alpha(app) {
  const sc = view.script, rows = ROWS[sc], sel = new Set(S.sel[sc].rows);
  const cell = c => (c ? `<button class="kc" data-ch="${c}" aria-label="${c} ${romaji(c)}"><span class="k">${c}</span><span class="r">${romaji(c)}</span></button>` : '<span class="kc empty"></span>');
  const line = r => `<div class="arow ${sel.has(r.id) ? 'on' : ''}">
      <button class="pick" data-row="${r.id}" role="checkbox" aria-checked="${sel.has(r.id)}" aria-label="${esc(r.items.filter(Boolean)[0])}"><span></span></button>
      <div class="kt ${r.y ? 'y' : ''}">${r.items.map(cell).join('')}</div></div>`;
  const group = (h, list) => `<div class="sec"><h2>${esc(h)}</h2></div>${list.map(line).join('')}`;
  app.innerHTML = `<div class="narrow">${top(`<span class="jpt">${sc === 'kata' ? 'カタカナ' : 'ひらがな'}</span>`, null,
    `${pdfAvail[sc] ? `<a class="btn" href="${PDF[sc]}" target="_blank" rel="noopener">${IC.doc}${esc(t('pdf'))}</a>` : ''}`)}
    <div class="row selbar"><span class="muted small" style="flex:1">${esc(t('alphaSub'))}</span>
      <button class="linkbtn" id="a-all">${esc(t('all'))}</button><button class="linkbtn" id="a-none">${esc(t('none'))}</button></div>
    <div class="savebar"><button class="btn primary" id="a-save">${IC.check}${esc(t('saveAlpha'))}</button><div class="saved" id="a-saved" role="status" aria-live="polite"></div></div>
    ${group(t('base'), rows.filter(r => !r.d && !r.y))}
    ${group(t('dakuten'), rows.filter(r => r.d))}
    ${group(t('yoon'), rows.filter(r => r.y))}
    <p class="muted small credit">KanjiVG © Ulrich Apel, CC BY-SA 3.0</p></div>`;
  wireBack(['section', { script: sc }]);
  $$('[data-row]').forEach(b => (b.onclick = () => {
    const id = b.dataset.row, cur = new Set(S.sel[sc].rows);
    cur.has(id) ? cur.delete(id) : cur.add(id);
    setRows(sc, rows.map(r => r.id).filter(x => cur.has(x)));
    const on = cur.has(id); b.setAttribute('aria-checked', on); b.parentElement.classList.toggle('on', on);
  }));
  $('#a-save').onclick = async () => {
    const out = $('#a-saved'), b = $('#a-save'); b.disabled = true; out.className = 'saved'; out.textContent = '…';
    const r = await saveNow(), n = S.sel[sc].rows.length;
    b.disabled = false;
    if (!r.local && !r.remote) { out.className = 'saved bad'; out.textContent = t('saveErr'); return; }
    if (r.remote === true) { out.className = 'saved ok'; out.textContent = '✓ ' + t('savedAcc', n); return; }
    out.className = 'saved ' + (r.remote === false ? 'bad' : 'ok');
    out.textContent = '✓ ' + (r.remote === false ? t('saveAccErr', n) : t('savedLocal', n));
    if (r.remote === null && window.JCA_AUTH) {
      const l = document.createElement('button'); l.className = 'linkbtn'; l.textContent = t('saveLogin');
      l.onclick = () => window.JCA_AUTH.show(); out.append(' ', l);
    }
  };
  $('#a-all').onclick = () => { setRows(sc, rows.map(r => r.id)); render(); };
  $('#a-none').onclick = () => { setRows(sc, []); render(); };
  $$('[data-ch]').forEach(b => (b.onclick = () => {
    const c = b.dataset.ch;
    if ([...c].length > 1) { speak(c); return; }
    go('sheet', { script: sc, ch: c, from: 'alpha' });
  }));
}

// scheda: guarda l'ordine dei tratti, ascolta, prova a scriverlo
function sheet(app) {
  const { script: sc, ch } = view;
  const isK = sc === 'kanji';
  const list = isK ? KANJI.map(k => k.k) : ROWS[sc].filter(r => !r.y).flatMap(r => r.chars);
  const i = list.indexOf(ch), prev = list[i - 1], next = list[i + 1];
  const kj = isK ? KANJI.find(k => k.k === ch) : null;
  const say = kj ? kj.yomi : ch;
  const words = isK ? [] : WORDS[sc].filter(w => w.chars.includes(ch)).sort((a, b) => a.chars.length - b.chars.length).slice(0, 3);
  const n = tpl(ch) ? tpl(ch).d.length : 0;
  app.innerHTML = `${top('', null, `<button class="icon-btn" id="k-prev" ${prev ? '' : 'disabled'} aria-label="prev">${IC.prev}</button><button class="icon-btn" id="k-next" ${next ? '' : 'disabled'} aria-label="next">${IC.next}</button>`)}
  <div class="quiz">
    <div class="side"><section class="prompt">
      <div class="sheet-head"><span class="k">${esc(ch)}</span><div class="t"><div class="r">${esc(kj ? kj.yomi + ' · ' + kj.ro : romaji(ch))}</div>
        ${kj ? `<div class="r it">${esc(kj.it)}</div>` : ''}<div class="muted small">${esc(t('strokes', n))}</div></div>
        <button class="icon-btn" id="k-say" aria-label="${esc(t('play'))}">${IC.sound}</button></div>
      ${words.map(w => `<div class="ex"><span class="k">${esc(w.k)}</span><span class="t">${esc(w.it)} <span class="muted small">${esc(w.ro)}</span></span><button class="icon-btn plain" data-say="${esc(w.k)}" aria-label="${esc(t('play'))}">${IC.sound}</button></div>`).join('')}
    </section></div>
    <div class="fbslot" id="k-fb"><div class="fb info">${esc(t('tryIt'))}</div></div>
    <div class="padwrap" id="k-wrap"><canvas class="pad" id="k-pad"></canvas>
      <div class="tools"><button class="icon-btn" id="k-clear" aria-label="${esc(t('clearAll'))}">${IC.clear}</button><button class="btn" id="k-anim">${IC.eye}${esc(t('model'))}</button>
        <button class="btn primary grow" id="k-check">${IC.check} ${esc(t('check'))}</button></div></div>
  </div>`;
  const back = view.from === 'kanjiList' ? ['kanjiList'] : ['alpha', { script: sc }];
  wireBack(back);
  pad = new Pad($('#k-pad'), 1, { onPen: () => toast(t('penFound')) });
  fitPad(pad, $('#k-wrap'), 76);
  const anim = () => pad.animate(ch, 0); // toccando il foglio l'animazione si ferma e si scrive subito
  if (prev) $('#k-prev').onclick = () => go('sheet', { ...view, ch: prev });
  if (next) $('#k-next').onclick = () => go('sheet', { ...view, ch: next });
  $('#k-say').onclick = () => speak(say);
  $$('[data-say]').forEach(b => (b.onclick = () => speak(b.dataset.say)));
  $('#k-clear').onclick = () => pad.clear();
  $('#k-anim').onclick = anim;
  $('#k-check').onclick = () => {
    const g = pad.groups()[0]; if (!g.length) { toast(t('writeFirst')); return; }
    const cands = isK ? KANJI.map(k => k.k) : list;
    const r = check(g, ch, { level: S.settings.level, candidates: cands, lang: lang(), ro: c => RO[c] || romaji(c) });
    const fb = $('#k-fb');
    pad.cellFb = [r.ok ? { ch, state: 'ok', hl: r.tips && r.tips.length ? r.hl : null } : { ch, state: 'bad', showTpl: true, hl: r.hl }]; pad.draw();
    fb.innerHTML = r.ok ? `<div class="fb ${r.tips.length ? 'tip' : 'ok'}">${esc(t('great'))}${r.tips.length ? ' ' + esc(r.tips[0]) : ''}</div>` : `<div class="fb bad">${esc(r.msg)}</div>`;
    if (r.ok) speak(say);
  };
  setTimeout(() => { if (view.name === 'sheet' && view.ch === ch) anim(); }, 250);
}

// ---- Kanji ----
function kanjiHome(app) {
  const row = (id, k, label, sub) => `<button class="choice" id="${id}"><span class="k">${k}</span><span class="t"><b>${esc(label)}</b>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</span>${IC.chev}</button>`;
  app.innerHTML = `<div class="narrow">${top('<span class="jpt">漢字</span>')}
    <div class="choices">
      ${row('j-list', '字', t('kanjiPdf'), pdfAvail.kanji ? 'PDF' : `${KANJI.length}`)}
      ${row('j-train', '書', t('training'), `${t('kWrite')} · ${t('kSymbol')} · ${t('kAudio')}`)}
      ${row('j-links', '繋', t('kanjiLinks'), t('kanjiLinksSub'))}
    </div></div>`;
  wireBack(['home']);
  $('#j-list').onclick = () => go('kanjiList');
  $('#j-train').onclick = () => startExercise('kanji', 'kanji', go);
  $('#j-links').onclick = () => go('soon', { what: 'links' });
}
// categorie comprimibili; quelle aperte restano aperte su questo dispositivo
const KOPEN = 'jca-kcat-open';
function kanjiList(app) {
  let open = [];
  try { open = JSON.parse(localStorage.getItem(KOPEN) || '[]'); } catch (e) {}
  const ja = lang() === 'ja';
  const cat = c => `<details class="kcat" data-cat="${esc(c.it)}" ${open.includes(c.it) ? 'open' : ''}>
      <summary><span class="nm">${esc(ja ? c.ja : c.it)}</span>${ja ? '' : `<span class="jp">${esc(c.ja)}</span>`}<span class="n">${c.items.length}</span>${IC.chev}</summary>
      <div class="kgrid">${c.items.map(k => `<button class="kc" data-ch="${k.k}"><span class="k">${k.k}</span><span class="r">${esc(k.it.split(/[;,(]/)[0].trim())}</span></button>`).join('')}</div></details>`;
  app.innerHTML = `<div class="narrow">${top(esc(t('kanjiPdf')), null, pdfAvail.kanji ? `<a class="btn" href="${PDF.kanji}" target="_blank" rel="noopener">${IC.doc}PDF</a>` : '')}
    <div class="kcats">${KCATS.filter(c => c.items.length).map(cat).join('')}</div>
    <p class="muted small credit">KanjiVG © Ulrich Apel, CC BY-SA 3.0</p></div>`;
  wireBack(['kanjiHome']);
  const all = () => [...document.querySelectorAll('details.kcat')];
  all().forEach(d => (d.ontoggle = () => {
    try { localStorage.setItem(KOPEN, JSON.stringify(all().filter(x => x.open).map(x => x.dataset.cat))); } catch (e) {}
  }));
  document.querySelectorAll('[data-ch]').forEach(b => (b.onclick = () => go('sheet', { script: 'kanji', ch: b.dataset.ch, from: 'kanjiList' })));
}

// ---- in arrivo ----
function soon(app) {
  const w = view.what;
  const k = w === 'gram' ? '文法' : w === 'full' ? '総合日本語' : '繋';
  const sub = w === 'gram' ? t('soonGram') : w === 'full' ? t('soonFull') : t('kanjiLinksSub');
  app.innerHTML = `<div class="narrow">${top('')}<div class="soon"><div class="k">${k}</div><p class="muted">${esc(sub)}</p></div></div>`;
  wireBack(w === 'links' ? ['kanjiHome'] : ['home']);
}

// ---- Impostazioni ----
function settings(app) {
  const st = S.settings;
  const seg = (key, opts, cur) => `<div class="seg">${opts.map(([v, l]) => `<button data-k="${key}" data-v="${v}" aria-pressed="${cur === v}">${esc(l)}</button>`).join('')}</div>`;
  const li = (title, sub, ctl) => `<div class="li"><div class="t"><b>${esc(title)}</b>${sub ? `<div class="muted small">${esc(sub)}</div>` : ''}</div>${ctl}</div>`;
  const A = window.JCA_AUTH;
  app.innerHTML = `<div class="narrow">${top(esc(t('settings')))}
  <div class="list">
    ${li(t('sTheme'), '', seg('theme', [['light', t('themeLight')], ['dark', t('themeDark')]], st.theme))}
    ${li(t('sLang'), '', seg('lang', [['it', 'Italiano'], ['ja', '日本語']], st.lang))}
    ${li(t('sLevel'), t('sLevelSub'), seg('level', [['easy', t('easy')], ['normal', t('normal')]], st.level))}
    ${li(t('sPad'), t('sPadSub'), seg('pad', [['l', t('big')], ['m', t('mid')], ['s', t('small')]], device.padSize || 'l'))}
    ${li(t('sHints'), t('sHintsSub'), seg('hints', [['auto', t('hAuto')], ['always', t('hAlways')]], st.hints))}
    ${li(t('sPen'), t('sPenSub'), `<button class="switch" role="switch" id="s-pen" aria-checked="${device.pencilOnly}" aria-label="${esc(t('sPen'))}"></button>`)}
    ${li(t('sVoice'), '', seg('rate', [['slow', t('slow')], ['normal', t('normalV')]], st.rate) + `<button class="icon-btn" id="s-test" aria-label="${esc(t('play'))}">${IC.sound}</button>`)}
    ${A ? li(t('sAccount'), A.email ? t('signedAs', A.email) : t('notSigned'), `<button class="btn" id="s-acc">${esc(A.email ? t('signOut') : t('signIn'))}</button>`) : ''}
    ${li(t('sReset'), t('sResetSub'), `<button class="btn" id="s-reset">${esc(view.confirm ? t('resetSure') : t('reset'))}</button>`)}
  </div>
  <p class="muted small center" style="margin-top:14px">v__VER__ · VOICEVOX:No.7</p></div>`;
  { const r = view.ret || { name: 'home' }; $('#b-back').onclick = () => { const { name, ...a } = r; go(name, a); }; }
  $$('[data-k]').forEach(b => (b.onclick = () => {
    const k = b.dataset.k, v = b.dataset.v;
    if (k === 'pad') { device.padSize = v; saveDevice(); }
    else setSetting(k, v);
    if (k === 'theme') applyTheme();
    if (k === 'rate') speak('こんにちは');
    render();
  }));
  $('#s-pen').onclick = () => { device.pencilOnly = !device.pencilOnly; device.penSeen = true; saveDevice(); render(); };
  $('#s-test').onclick = () => speak('こんにちは');
  const ac = $('#s-acc'); if (ac) ac.onclick = () => (A.email ? A.signOut() : A.show());
  $('#s-reset').onclick = () => { if (!view.confirm) { view.confirm = true; render(); return; } resetAll(); toast(t('resetDone')); go('home'); };
}

export function applyTheme() {
  const th = S.settings.theme;
  if (th === 'light' || th === 'dark') document.documentElement.setAttribute('data-theme', th);
  else document.documentElement.removeAttribute('data-theme');
}
