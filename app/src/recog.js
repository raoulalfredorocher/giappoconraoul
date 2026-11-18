// Riconoscimento della scrittura: confronta i tratti con i modelli KanjiVG.
// Tollerante: conta la FORMA (proporzioni, posizione, lunghezza, curva), non l'ordine o il verso dei tratti.
import SH from '../data/strokes-hira.json';
import SK from '../data/strokes-kata.json';
import SJ from '../data/strokes-kanji.json';

const SD = { ...SH, ...SK, ...SJ };
const RN = 32;
const ADV_T = 0.06;

function pathLen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
export { pathLen };
// ricampiona un tratto in n punti equidistanti
function resampleStroke(p, n) {
  if (p.length === 1) return Array.from({ length: n }, () => [p[0][0], p[0][1]]);
  const L = pathLen(p); if (L === 0) return Array.from({ length: n }, () => [p[0][0], p[0][1]]);
  const step = L / (n - 1), out = [[p[0][0], p[0][1]]]; let acc = 0, prev = [p[0][0], p[0][1]];
  for (let i = 1; i < p.length; i++) {
    const cur = p[i]; let d = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
    while (acc + d >= step && out.length < n) {
      const t = (step - acc) / d, q = [prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])];
      out.push(q); prev = q; d = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]); acc = 0;
    }
    acc += d; prev = cur;
  }
  while (out.length < n) out.push([p[p.length - 1][0], p[p.length - 1][1]]);
  return out;
}
function sdist(a, b) { let d = 0; for (let i = 0; i < RN; i++) d += Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]); return d / RN; }
function sdistRev(a, b) { let d = 0; for (let i = 0; i < RN; i++) d += Math.hypot(a[RN - 1 - i][0] - b[i][0], a[RN - 1 - i][1] - b[i][1]); return d / RN; }

// Modelli: costruiti solo quando servono (campionando i path SVG)
const TPLC = {};
let svgEl = null, pathEl = null;
export function hasTpl(ch) { return !!SD[ch]; }
export function tpl(ch) {
  if (TPLC[ch]) return TPLC[ch];
  const ds = SD[ch]; if (!ds) return null;
  if (!svgEl) {
    svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('width', '0'); svgEl.setAttribute('height', '0'); svgEl.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none'; svgEl.setAttribute('aria-hidden', 'true');
    pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path'); svgEl.appendChild(pathEl); document.body.appendChild(svgEl);
  }
  const raw = ds.map(d => {
    pathEl.setAttribute('d', d); const L = pathEl.getTotalLength(), n = Math.max(8, Math.ceil(L / 1.5)), pts = [];
    for (let i = 0; i <= n; i++) { const q = pathEl.getPointAtLength(L * i / n); pts.push([q.x, q.y]); }
    return pts;
  });
  return (TPLC[ch] = { raw, d: ds });
}

const SMALL_PAIRS = { っ:'つ',ゃ:'や',ゅ:'ゆ',ょ:'よ',ぁ:'あ',ぃ:'い',ぅ:'う',ぇ:'え',ぉ:'お',ゎ:'わ',ッ:'ツ',ャ:'ヤ',ュ:'ユ',ョ:'ヨ',ァ:'ア',ィ:'イ',ゥ:'ウ',ェ:'エ',ォ:'オ',ヮ:'ワ' };
const DAKU = {};
{ const base = 'かきくけこさしすせそたちつてとはひふへほ', dk = 'がぎぐげござじずぜぞだぢづでどばびぶべぼ', hb = 'はひふへほ', hd = 'ぱぴぷぺぽ';
  [...dk].forEach((c, i) => { DAKU[c] = base[i]; DAKU[String.fromCharCode(c.charCodeAt(0) + 0x60)] = String.fromCharCode(base.charCodeAt(i) + 0x60); });
  [...hd].forEach((c, i) => { DAKU[c] = hb[i]; DAKU[String.fromCharCode(c.charCodeAt(0) + 0x60)] = String.fromCharCode(hb.charCodeAt(i) + 0x60); });
  DAKU['ヴ'] = 'ウ'; }
const HANDAKU = 'ぱぴぷぺぽパピプペポ';
const LEVELS = { easy: { abs: 0.22, ratio: 1.45 }, normal: { abs: 0.16, ratio: 1.15 } };
const famOf = c => DAKU[c] || c;
function eqv(a, b) { const sa = SMALL_PAIRS[a] || a, sb = SMALL_PAIRS[b] || b; return sa === sb || famOf(sa) === famOf(sb); }
function isLoop(s) { const L = pathLen(s); if (L < 1) return false; const d = Math.hypot(s[0][0] - s[s.length - 1][0], s[0][1] - s[s.length - 1][1]); return d < 0.35 * L; }

// ---- Nuvola di punti ($P): indipendente da ordine e verso dei tratti ----
const CN = 48;
function cloudOf(strokes) {
  strokes = strokes.filter(s => s.length);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of strokes) for (const [x, y] of s) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, sc = Math.max(x1 - x0, y1 - y0) || 1;
  const lens = strokes.map(s => Math.max(pathLen(s), sc * 0.03)), tot = lens.reduce((a, b) => a + b, 0);
  const cnt = lens.map(l => Math.max(1, Math.round(CN * l / tot)));
  let diff = CN - cnt.reduce((a, b) => a + b, 0);
  while (diff !== 0) { const k = cnt.indexOf(Math.max(...cnt)); if (diff < 0 && cnt[k] <= 1) break; cnt[k] += Math.sign(diff); diff -= Math.sign(diff); }
  const pts = []; strokes.forEach((s, i) => { const r = cnt[i] === 1 ? [s[Math.floor(s.length / 2)]] : resampleStroke(s, cnt[i]); for (const [x, y] of r) pts.push([(x - cx) / sc, (y - cy) / sc]); });
  return pts;
}
// lim: si smette appena la somma lo supera (il risultato serve solo se è più basso)
function cloudRun(a, b, start, lim = Infinity) {
  const n = a.length, m = b.length, used = new Uint8Array(m); let sum = 0, i = start;
  for (let k = 0; k < n; k++) { if (sum >= lim) return sum; let best = Infinity, bj = -1;
    for (let j = 0; j < m; j++) { if (used[j]) continue; const dx = a[i][0] - b[j][0], dy = a[i][1] - b[j][1], d = Math.sqrt(dx * dx + dy * dy); if (d < best) { best = d; bj = j; } }
    if (bj < 0) break; used[bj] = 1; sum += (1 - k / n) * best; i = (i + 1) % n; }
  return sum;
}
// cap: distanza oltre la quale il valore esatto non serve (con molti kanji il confronto resta veloce)
function cloudDist(a, b, cap = Infinity) {
  const n = Math.min(a.length, b.length), step = Math.max(1, Math.floor(Math.sqrt(n))), L = cap * (n * 0.5); let best = Infinity;
  for (let i = 0; i < a.length; i += step) {
    let d = cloudRun(a, b, i, Math.min(best, L)); if (d < best) best = d;
    d = cloudRun(b, a, i % b.length, Math.min(best, L)); if (d < best) best = d;
  }
  return best / (n * 0.5);
}
const CLOUD = {};
const tplCloud = c => CLOUD[c] || (CLOUD[c] = cloudOf(tpl(c).raw));

// Testi (italiano / giapponese)
const MSG = {
  it: { empty: 'Scrivi prima qui.', handaku: 'Manca il cerchietto in alto a destra (゜).', daku: 'Mancano i due trattini in alto a destra (゛).',
    wantCircle: 'Qui ci vuole il cerchietto (゜), non i due trattini.', wantDash: 'Qui ci vogliono i due trattini (゛), non il cerchietto.',
    similar: (c, r) => `Sembra più ${c}${r ? ' (' + r + ')' : ''}. Guarda il modello in grigio.`, almost: t => 'Quasi. ' + t, unknown: 'Non lo riconosco ancora. Guarda il modello in grigio.' },
  ja: { empty: 'ここに かいて ください。', handaku: '「゜」が ありません。', daku: '「゛」が ありません。', wantCircle: '「゛」ではなく「゜」です。', wantDash: '「゜」ではなく「゛」です。',
    similar: c => `「${c}」に にています。おてほんを みてください。`, almost: () => 'おしい！ かたちを すこし なおしましょう。', unknown: 'よめません。おてほんを みてください。' },
};

// Controlla un carattere. strokes: tratti nelle coordinate 0..109 della casella.
export function check(userStrokes, target, { level = 'easy', candidates = [], lang = 'it', ro = null } = {}) {
  const M = MSG[lang] || MSG.it, L = LEVELS[level] || LEVELS.easy;
  const U = userStrokes.filter(s => s.length);
  const T = tpl(target);
  if (!T) return { ok: true, tips: [], hl: [] };
  if (!U.length) return { ok: false, msg: M.empty, hl: [] };
  const nT = T.raw.length, nU = U.length;
  const base = DAKU[target];
  if (base && tpl(base)) {
    const nB = tpl(base).raw.length;
    if (nU <= nB) return { ok: false, msg: HANDAKU.includes(target) ? M.handaku : M.daku, hl: [] };
    const extra = U.slice(nB), loop = extra.some(isLoop);
    if (HANDAKU.includes(target) && !loop && extra.length >= 2) return { ok: false, msg: M.wantCircle, hl: [] };
    if (!HANDAKU.includes(target) && loop && extra.length === 1) return { ok: false, msg: M.wantDash, hl: [] };
  }
  const uc = cloudOf(U);
  const dT = cloudDist(uc, tplCloud(target));
  let best = null;
  for (const c of candidates) { if (eqv(c, target) || !SD[c]) continue; const d = cloudDist(uc, tplCloud(c), best ? best.d : Infinity); if (!best || d < best.d) best = { c, d }; }
  const cloudPass = dT < L.abs && (!best || dT <= best.d * L.ratio);
  let strokePass = false;
  if (nU === nT && nT <= 8) strokePass = strokesMatch(U, T.raw, 0.19);
  const tooSimilar = best && best.d < dT * 0.6;
  if (!(cloudPass || (strokePass && !tooSimilar))) {
    if (best && best.d < dT && best.d < L.abs) return { ok: false, msg: M.similar(best.c, ro ? ro(best.c) : ''), similar: best.c, hl: [] };
    if (nU === nT) { const a = strokeAdvice(U, target); if (a.tips.length) return { ok: false, msg: lang === 'it' ? M.almost(a.tips[0]) : M.almost(), hl: a.hl }; }
    return { ok: false, msg: M.unknown, hl: [] };
  }
  const a = strokeAdvice(U, target);
  return { ok: true, tips: lang === 'it' ? a.tips : [], hl: a.hl, quality: Math.max(0, Math.min(1, 1 - dT / L.abs)) };
}

// tratti uguali uno a uno (in qualsiasi ordine e verso)
function normalizeAll(strokes) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of strokes) for (const [x, y] of s) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, sc = Math.max(x1 - x0, y1 - y0) || 1;
  return strokes.map(s => resampleStroke(s, RN).map(([x, y]) => [(x - cx) / sc, (y - cy) / sc]));
}
function strokesMatch(U0, T0, thr) {
  const U = normalizeAll(U0), T = normalizeAll(T0);
  const C = U.map(u => T.map(t => Math.min(sdist(u, t), sdistRev(u, t))));
  const p = bestPerm(C); if (!p) return false;
  return p.every((j, i) => C[i][j] < thr);
}

// ---- Consigli concreti sulla forma di un tratto ----
function sMeta(s) {
  const n = s.length; let cx = 0, cy = 0; for (const [x, y] of s) { cx += x; cy += y; } cx /= n; cy /= n;
  const a = s[0], b = s[n - 1], ch = Math.hypot(b[0] - a[0], b[1] - a[1]); let L = 0, dev = 0;
  for (let i = 1; i < n; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
  for (const p of s) { const d = ch > 1e-6 ? Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / ch : Math.hypot(p[0] - a[0], p[1] - a[1]); if (d > dev) dev = d; }
  return { cx, cy, L, ch, curv: L > 1e-6 ? dev / Math.max(L, 0.05) : 0, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}
function where(x, y) { const v = y < -0.15 ? 'in alto' : y > 0.15 ? 'in basso' : '', h = x < -0.15 ? 'a sinistra' : x > 0.15 ? 'a destra' : ''; return [v, h].filter(Boolean).join(' ') || 'al centro'; }
function describeStroke(t) {
  const m = sMeta(t);
  if (m.L < 0.16) return 'il trattino ' + where(m.cx, m.cy);
  const deg = Math.abs(m.ang * 180 / Math.PI);
  const kind = m.curv > 0.18 ? 'la curva' : (deg < 25 || deg > 155) ? 'il tratto orizzontale' : (deg > 65 && deg < 115) ? 'il tratto verticale' : 'il tratto obliquo';
  return kind + ' ' + where(m.cx, m.cy);
}
function bestPerm(C) { // assegnazione tratto utente -> tratto modello con costo minimo (n piccolo)
  const n = C.length; if (n > 8) return null; let best = null, bc = 1e9; const p = [...Array(n).keys()];
  const rec = (k, acc) => { if (acc >= bc) return; if (k === n) { bc = acc; best = p.slice(); return; }
    for (let i = k; i < n; i++) { [p[k], p[i]] = [p[i], p[k]]; rec(k + 1, acc + C[k][p[k]]); [p[k], p[i]] = [p[i], p[k]]; } };
  rec(0, 0); return best;
}
function tiltWord(u, t) {
  const a = x => { let d = Math.abs(x * 180 / Math.PI) % 180; return d > 90 ? 180 - d : d; };
  const ua = a(u.ang), ta = a(t.ang); if (Math.abs(ua - ta) < 20) return '';
  if (ta < 25) return 'tienilo più orizzontale'; if (ta > 65) return 'tienilo più verticale';
  return ua > ta ? 'inclinalo di più verso l’orizzontale' : 'inclinalo di più verso la verticale';
}
function shapeWhole(Uraw, target) {
  const bb = P => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; P.forEach(s => s.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); })); return [x1 - x0, y1 - y0]; };
  const [uw, uh] = bb(Uraw), [tw, th] = bb(tpl(target).raw);
  if (tw < 35 || th < 35 || uh < 1 || uw < 1) return '';
  const r = (uw / uh) / (tw / th);
  if (r > 1.55) return 'Nel complesso è troppo largo e basso: stringilo e allungalo in verticale, come il modello.';
  if (r < 0.64) return 'Nel complesso è troppo stretto e alto: allargalo un po’, come il modello.';
  return '';
}
function strokeAdvice(Uraw, target) {
  const whole = shapeWhole(Uraw, target), none = whole ? { tips: [whole], hl: [] } : { tips: [], hl: [] };
  const Tr = tpl(target).raw.map(t => resampleStroke(t, RN)); let Ur = Uraw.map(u => resampleStroke(u, RN));
  if (Ur.length !== Tr.length || Ur.length > 8) return none;
  const norm = S0 => { let cx = 0, cy = 0, n = 0; S0.forEach(s => s.forEach(([x, y]) => { cx += x; cy += y; n++; })); cx /= n; cy /= n; let r = 0; S0.forEach(s => s.forEach(([x, y]) => { r += (x - cx) ** 2 + (y - cy) ** 2; })); r = Math.sqrt(r / n) || 1; return S0.map(s => s.map(([x, y]) => [(x - cx) / r, (y - cy) / r])); };
  const Un = norm(Ur), Tn = norm(Tr);
  const C = Un.map(u => Tn.map(t => Math.min(sdist(u, t), sdistRev(u, t))));
  const perm = bestPerm(C); if (!perm) return none;
  const M = []; Ur.forEach((u, i) => { const j = perm[i]; M[j] = sdistRev(Un[i], Tn[j]) < sdist(Un[i], Tn[j]) ? u.slice().reverse() : u; });
  Ur = M;
  let ux = 0, uy = 0, tx = 0, ty = 0, n = 0; Ur.forEach((u, i) => u.forEach((q, k) => { ux += q[0]; uy += q[1]; tx += Tr[i][k][0]; ty += Tr[i][k][1]; n++; })); ux /= n; uy /= n; tx /= n; ty /= n;
  let su = 0, st = 0; Ur.forEach((u, i) => u.forEach((q, k) => { su += (q[0] - ux) ** 2 + (q[1] - uy) ** 2; st += (Tr[i][k][0] - tx) ** 2 + (Tr[i][k][1] - ty) ** 2; }));
  const k0 = Math.sqrt(st / Math.max(su, 1e-6)), SC = 90;
  const T = Tr.map(t => t.map(([x, y]) => [(x - 54.5) / SC, (y - 54.5) / SC]));
  const U = Ur.map(u => u.map(([x, y]) => [((x - ux) * k0 + tx - 54.5) / SC, ((y - uy) * k0 + ty - 54.5) / SC]));
  const per = U.map((u, i) => sdist(u, T[i]));
  let w = -1, wd = ADV_T; for (let i = 0; i < U.length; i++) if (per[i] > wd) { wd = per[i]; w = i; }
  if (w < 0) return none;
  const u = sMeta(U[w]), t = sMeta(T[w]), fix = [];
  const lr = u.L / Math.max(t.L, 1e-6);
  if (lr < 0.8) fix.push([(1 - lr) * 1.5, 'corto', 'allungalo']); else if (lr > 1.22) fix.push([(lr - 1) * 1.5, 'lungo', 'accorcialo']);
  const dy = u.cy - t.cy, dx = u.cx - t.cx;
  if (dy > 0.055) fix.push([dy * 3, 'in basso', 'alzalo']); else if (dy < -0.055) fix.push([-dy * 3, 'in alto', 'abbassalo']);
  if (dx > 0.055) fix.push([dx * 3, 'a destra', 'spostalo a sinistra']); else if (dx < -0.055) fix.push([-dx * 3, 'a sinistra', 'spostalo a destra']);
  if (t.curv - u.curv > 0.09) fix.push([(t.curv - u.curv) * 3, 'dritto', 'curvalo di più']); else if (u.curv - t.curv > 0.12) fix.push([(u.curv - t.curv) * 3, 'curvo', 'tienilo più dritto']);
  const tw = tiltWord(u, t); if (tw && t.ch > 0.12) fix.push([0.5, '', tw]);
  fix.sort((a, b) => b[0] - a[0]);
  if (!fix.length) return none;
  const name = describeStroke(T[w]), f = fix.slice(0, 2);
  const probs = f.filter(x => x[1]).map(x => 'troppo ' + x[1]), acts = f.map(x => x[2]);
  const prob = probs.length ? 'è ' + probs.join(' e ') : 'è storto';
  let txt = `${name[0].toUpperCase() + name.slice(1)} ${prob}: ${acts.join(' e ')}.`;
  if (/^la /.test(name)) txt = txt.replace(/\b(cort|lung|dritt|curv|stort)o\b/g, '$1a').replace(/\b(allunga|accorcia|alza|abbassa|sposta|curva|tieni|inclina)lo\b/gi, '$1la');
  return { tips: [txt], hl: [w] };
}
