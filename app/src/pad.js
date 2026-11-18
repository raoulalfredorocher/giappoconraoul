// Foglio di scrittura: una o più caselle (una per kana), con dita o Apple Pencil.
// Coordinate: ogni casella è 109×109 (come i modelli KanjiVG).
import { tpl, pathLen } from './recog.js';
import { device, saveDevice } from './store.js';

const U = 109;
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

export class Pad {
  constructor(canvas, n = 1, { onPen } = {}) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.n = n; this.cols = n; this.rows = 1;
    this.strokes = []; this.cur = null; this.active = null; this.activeType = null;
    this.locked = false; this.anim = null;
    this.cellFb = []; // per casella: {ch, state:'ok'|'bad', showTpl, hl:[]}
    this.ghost = []; // per casella: carattere da mostrare in grigio
    this.labels = null;
    this.free = n > 1; // parola: un solo rettangolo, i caratteri si separano da soli
    this.order = 1; // 1 = sinistra→destra, -1 = destra→sinistra (scelto al controllo)
    const pt = e => { const r = this.c.getBoundingClientRect(); const k = U * this.cols / r.width; return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; };
    canvas.addEventListener('pointerdown', e => {
      if (this.locked) return;
      if (e.pointerType === 'touch' && (device.pencilOnly || this.activeType === 'pen')) return;
      if (e.pointerType === 'pen' && !device.pencilOnly && !device.penSeen) { device.penSeen = true; device.pencilOnly = true; saveDevice(); onPen && onPen(); }
      if (this.active !== null) { if (e.pointerType === 'pen' && this.activeType === 'touch') { this.strokes.pop(); this.active = null; } else return; }
      e.preventDefault(); this.stopAnim();
      // toccare di nuovo il foglio toglie gli errori segnati (restano le caselle giuste)
      this.cellFb = this.cellFb.map(f => (f && f.state === 'ok' ? f : null));
      this.active = e.pointerId; this.activeType = e.pointerType;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      this.cur = [pt(e)]; this.strokes.push(this.cur); this.draw();
    });
    canvas.addEventListener('pointermove', e => {
      if (e.pointerId !== this.active) return; e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of (evs.length ? evs : [e])) this.cur.push(pt(ev));
      this.draw();
    });
    const end = e => { if (e.pointerId !== this.active) return; this.active = null; this.activeType = null; this.cur = null; this.draw(); };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    ['touchstart', 'touchmove'].forEach(t => canvas.addEventListener(t, e => e.preventDefault(), { passive: false }));
  }
  // dimensiona: cell = lato della casella in px; cols = caselle per riga
  layout(cell, cols) {
    this.cols = Math.max(1, Math.min(this.n, cols)); this.rows = Math.ceil(this.n / this.cols);
    const dpr = window.devicePixelRatio || 1;
    this.cell = cell; this.c.dataset.cell = cell;
    this.c.style.width = cell * this.cols + 'px'; this.c.style.height = cell * this.rows + 'px';
    this.c.width = Math.round(cell * this.cols * dpr); this.c.height = Math.round(cell * this.rows * dpr);
    this.draw();
  }
  // rettangolo libero: larghezza W in unità, altezza U
  layoutFree(h, w) {
    const dpr = window.devicePixelRatio || 1;
    this.cols = w / h; this.rows = 1; this.cell = h; this.c.dataset.cell = h; this.c.dataset.free = '1';
    this.c.style.width = w + 'px'; this.c.style.height = h + 'px';
    this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
    this.draw();
  }
  // separa i tratti in n caratteri secondo la posizione orizzontale (tollera dimensioni e spazi diversi)
  segment() {
    const ss = this.strokes.filter(s => s.length);
    const key = ss.length + ':' + ss.reduce((a, s) => a + s.length, 0) + ':' + this.order;
    const sg0 = this._seg;
    if (sg0 && sg0.key === key && sg0.ss.length === ss.length && ss.every((s, i) => s === sg0.ss[i])) return sg0;
    const it = ss.map(s => { let a = Infinity, b = -Infinity; for (const p of s) { if (p[0] < a) a = p[0]; if (p[0] > b) b = p[0]; } return { s, a, b, c: (a + b) / 2 }; }).sort((p, q) => p.a - q.a);
    let cl = [];
    for (const x of it) {
      const last = cl[cl.length - 1], w = x.b - x.a;
      // un tratto si unisce al carattere se si sovrappone (anche poco) in orizzontale
      if (last && x.a < last.b - Math.min(3, w * 0.25) + 2) { last.m.push(x); last.b = Math.max(last.b, x.b); }
      else cl.push({ a: x.a, b: x.b, m: [x] });
    }
    const n = this.n;
    while (cl.length > n) { // troppi pezzi: unisce la coppia vicina più stretta
      let bi = 0, bw = Infinity;
      for (let i = 0; i < cl.length - 1; i++) { const w = Math.max(cl[i].b, cl[i + 1].b) - cl[i].a; if (w < bw) { bw = w; bi = i; } }
      const A = cl[bi], B = cl[bi + 1]; cl.splice(bi, 2, { a: A.a, b: Math.max(A.b, B.b), m: A.m.concat(B.m) });
    }
    while (cl.length < n) { // pochi pezzi: divide il più largo dove i tratti si separano meglio
      let bi = -1, bw = 0; cl.forEach((c, i) => { if (c.m.length > 1 && c.b - c.a > bw) { bw = c.b - c.a; bi = i; } });
      if (bi < 0) break;
      const m = cl[bi].m.slice().sort((p, q) => p.c - q.c); let bk = 1, bg = -Infinity;
      for (let k = 1; k < m.length; k++) { const L = m.slice(0, k), R = m.slice(k); const g = Math.min(...R.map(r => r.a)) - Math.max(...L.map(l => l.b)) + 0.3 * Math.min(k, m.length - k); if (g > bg) { bg = g; bk = k; } }
      const L = m.slice(0, bk), R = m.slice(bk), mk = q => ({ a: Math.min(...q.map(r => r.a)), b: Math.max(...q.map(r => r.b)), m: q });
      cl.splice(bi, 1, mk(L), mk(R));
    }
    if (this.order < 0) cl.reverse();
    const idx = new Map(); cl.forEach((c, i) => c.m.forEach(x => idx.set(x.s, i)));
    return (this._seg = { key, ss, idx, cx: cl.map(c => (c.a + c.b) / 2) });
  }
  origin(i) {
    if (!this.free) return [(i % this.cols) * U, Math.floor(i / this.cols) * U];
    const sg = this.strokes.length ? this.segment() : null;
    if (sg && sg.cx[i] !== undefined) return [sg.cx[i] - U / 2, 0];
    const W = this.cols * U, sw = W / this.n, j = this.order < 0 ? this.n - 1 - i : i;
    return [(j + 0.5) * sw - U / 2, 0];
  }
  // scala dei modelli in grigio quando lo spazio per carattere è più stretto della casella
  ghostScale() { return this.free ? Math.min(1, this.cols / this.n) : 1; }
  cellOf(s) {
    if (this.free) { const i = this.segment().idx.get(s); return i === undefined ? 0 : i; }
    let cx = 0, cy = 0; for (const p of s) { cx += p[0]; cy += p[1]; } cx /= s.length; cy /= s.length;
    const c = Math.max(0, Math.min(this.cols - 1, Math.floor(cx / U))), r = Math.max(0, Math.min(this.rows - 1, Math.floor(cy / U)));
    return Math.min(this.n - 1, r * this.cols + c);
  }
  // tratti di ogni casella, in coordinate locali 0..109
  groups() {
    const g = Array.from({ length: this.n }, () => []);
    for (const s of this.strokes) { if (!s.length) continue; const i = this.cellOf(s), [ox, oy] = this.origin(i); g[i].push(s.map(([x, y]) => [x - ox, y - oy])); }
    return g;
  }
  // in parola libera: gruppi in entrambi i versi di scrittura
  groupsBoth() {
    const o = this.order; this.order = 1; const f = this.groups(); this.order = -1; const r = this.groups(); this.order = o; this._seg = null;
    return [f, r];
  }
  clear() { this.strokes = []; this.cellFb = []; this.stopAnim(); this.draw(); }
  clearBad() { if (this.free) { this.clear(); return; } this.strokes = this.strokes.filter(s => { const f = this.cellFb[this.cellOf(s)]; return f && f.state === 'ok'; }); this.cellFb = this.cellFb.map(f => (f && f.state === 'ok' ? f : null)); this.draw(); }
  undo() { this.strokes.pop(); this.draw(); }
  stopAnim() { if (this.anim) { cancelAnimationFrame(this.anim.raf); this.anim = null; } }

  draw() {
    const x = this.ctx; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, this.c.width, this.c.height);
    const k = this.c.width / (this.cols * U); x.setTransform(k, 0, 0, k, 0, 0);
    this.guides();
    for (let i = 0; i < this.n; i++) {
      const [ox, oy] = this.origin(i); x.save(); x.translate(ox, oy);
      const f = this.cellFb[i], g = this.ghost[i];
      if (g && !(this.anim && this.anim.cell === i)) { const sc = this.ghostScale(); x.save(); x.translate(54.5 * (1 - sc), 54.5 * (1 - sc)); x.scale(sc, sc); this.tplAll(g, css('--ghost'), true); x.restore(); }
      if (f && (f.showTpl || (f.hl && f.hl.length))) {
        const t = tpl(f.ch), hl = f.hl || [];
        if (t) { for (let s = 0; s < t.d.length; s++) this.tplStroke(f.ch, s, hl.includes(s) ? css('--tip') : css('--ghost'), hl.includes(s) ? 6 : 5);
          for (let s = 0; s < t.d.length; s++) if (f.showTpl || hl.includes(s)) this.num(f.ch, s, hl.includes(s) ? css('--tip') : css('--accent')); }
      }
      x.restore();
    }
    for (const s of this.strokes) { const f = this.cellFb[this.cellOf(s)]; this.ink(s, f && f.state === 'ok' ? css('--ok') : f && f.state === 'bad' ? css('--bad') : css('--ink')); }
    if (this.anim) {
      const a = this.anim, t = tpl(a.ch), [ox, oy] = this.origin(a.cell); x.save(); x.translate(ox, oy);
      for (let i = 0; i < t.d.length; i++) {
        if (i < a.i) { this.tplStroke(a.ch, i, css('--accent'), 5); this.num(a.ch, i, css('--accent')); }
        else if (i === a.i) { const L = a.lens[i]; this.tplStroke(a.ch, i, css('--accent'), 5, { arr: [L, L + 2], off: L * (1 - a.t) }); this.num(a.ch, i, css('--accent')); }
      }
      x.restore();
    }
    if (this.labels && !this.free) { // pronuncia piccola in alto a sinistra di ogni casella
      x.save(); x.fillStyle = css('--muted'); x.font = '500 8px Inter, sans-serif'; x.textBaseline = 'top';
      this.labels.forEach((l, i) => { if (!l) return; const [ox, oy] = this.origin(i); x.fillText(l, ox + 5, oy + 4); });
      x.restore();
    }
  }
  guides() {
    const x = this.ctx; x.save(); x.strokeStyle = css('--grid'); x.lineWidth = 0.5; x.setLineDash([2, 2.2]); x.beginPath();
    if (this.free) { x.moveTo(4, 54.5); x.lineTo(this.cols * U - 4, 54.5); x.stroke(); x.restore(); return; }
    for (let i = 0; i < this.n; i++) { const [ox, oy] = this.origin(i); x.moveTo(ox + 54.5, oy + 4); x.lineTo(ox + 54.5, oy + 105); x.moveTo(ox + 4, oy + 54.5); x.lineTo(ox + 105, oy + 54.5); }
    x.stroke(); x.setLineDash([]); x.lineWidth = 0.9; x.beginPath();
    for (let i = 0; i < this.n; i++) { const [ox, oy] = this.origin(i); if (ox > 0) { x.moveTo(ox, oy + 3); x.lineTo(ox, oy + U - 3); } if (oy > 0) { x.moveTo(ox + 3, oy); x.lineTo(ox + U - 3, oy); } }
    x.stroke(); x.restore();
  }
  tplAll(ch, color, nums) { const t = tpl(ch); if (!t) return; for (let i = 0; i < t.d.length; i++) this.tplStroke(ch, i, color, 5); if (nums) for (let i = 0; i < t.d.length; i++) this.num(ch, i, color); }
  tplStroke(ch, i, color, w, dash) {
    const t = tpl(ch); if (!t) return; const x = this.ctx; x.save(); x.strokeStyle = color; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round';
    if (dash) { x.setLineDash(dash.arr); x.lineDashOffset = dash.off; }
    x.stroke(new Path2D(t.d[i])); x.restore();
  }
  num(ch, i, color) {
    const t = tpl(ch); const r = t.raw[i], p = r[0], q = r[Math.min(4, r.length - 1)]; const x = this.ctx;
    const dx = p[0] - q[0], dy = p[1] - q[1], L = Math.hypot(dx, dy) || 1, X = p[0] + dx / L * 6, Y = p[1] + dy / L * 6;
    x.save(); x.fillStyle = color; x.beginPath(); x.arc(X, Y, 4.2, 0, 7); x.fill();
    x.fillStyle = css('--surface'); x.font = '600 5.6px Inter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(i + 1), X, Y + 0.3); x.restore();
  }
  ink(s, color) {
    const x = this.ctx; if (!s.length) return; x.save(); x.strokeStyle = color; x.fillStyle = color; x.lineWidth = 4.6; x.lineCap = 'round'; x.lineJoin = 'round';
    if (s.length === 1) { x.beginPath(); x.arc(s[0][0], s[0][1], 2.3, 0, 7); x.fill(); }
    else { x.beginPath(); x.moveTo(s[0][0], s[0][1]);
      for (let i = 1; i < s.length - 1; i++) { const mx = (s[i][0] + s[i + 1][0]) / 2, my = (s[i][1] + s[i + 1][1]) / 2; x.quadraticCurveTo(s[i][0], s[i][1], mx, my); }
      const l = s[s.length - 1]; x.lineTo(l[0], l[1]); x.stroke(); }
    x.restore();
  }
  // animazione dell'ordine dei tratti nella casella cell
  animate(ch, cell = 0, done) {
    this.stopAnim(); const t = tpl(ch); if (!t) return;
    this.strokes = this.strokes.filter(s => this.cellOf(s) !== cell);
    const lens = t.raw.map(pathLen), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.anim = { ch, cell, i: 0, t: 0, lens, raf: 0 }; let start = null; const per = i => Math.max(380, lens[i] * 9);
    const step = ts => {
      if (!this.anim) return; if (start === null) start = ts; const a = this.anim; let el = ts - start;
      if (reduce) a.i = t.d.length;
      else { a.i = 0; while (a.i < t.d.length && el > per(a.i) + 180) { el -= per(a.i) + 180; a.i++; } a.t = Math.min(1, el / per(Math.min(a.i, t.d.length - 1))); }
      this.draw();
      if (a.i >= t.d.length) { a.raf = 0; setTimeout(() => { if (this.anim === a) { this.anim = null; this.draw(); done && done(); } }, reduce ? 1500 : 900); return; }
      a.raf = requestAnimationFrame(step);
    };
    this.anim.raf = requestAnimationFrame(step);
  }
}

// Sceglie lato e colonne in base allo spazio disponibile e alla dimensione scelta in Impostazioni
export function fitPad(pad, wrap, reserve = 80) {
  const w = Math.max(200, (wrap.clientWidth || 320) - 2);
  const top = pad.c.getBoundingClientRect().top;
  const availH = Math.max(180, window.innerHeight - Math.max(0, top) - reserve);
  // Grande = tutto lo spazio utile; Medio = 70% del lato; Piccolo = 40%
  const f = { l: 1, m: 0.7, s: 0.4 }[device.padSize || 'l'] || 1;
  const maxCell = 560;
  const n = pad.n;
  if (n === 1) { const base = Math.max(180, Math.min(w, maxCell, availH)); pad.layout(Math.floor(Math.max(110, base * f)), 1); return; }
  if (pad.free) { // un solo rettangolo largo per tutta la parola (Medio/Piccolo riducono l'altezza)
    const h = Math.floor(Math.max(130, Math.min(maxCell * 0.6, availH, Math.max(w / n * 1.05, w * 0.3))));
    pad.layoutFree(Math.floor(Math.max(90, h * Math.max(f, 0.55))), Math.floor(w)); return;
  }
  // il minor numero di righe che lascia caselle comode (si scrive da sinistra a destra)
  const minCell = Math.min(125, Math.floor(w / 2)), cap = Math.floor(maxCell * 0.6);
  let best = null;
  for (let rows = 1; rows <= n; rows++) {
    const cols = Math.ceil(n / rows);
    let cell = Math.min(Math.floor(w / cols), cap);
    if (rows > 1 && rows * cell > availH) cell = Math.max(minCell, Math.floor(availH / rows));
    if (cell >= minCell || cols === 1) { best = { cell, cols }; break; }
  }
  best.cell = Math.floor(Math.max(f < 1 ? 64 : 0, best.cell * f));
  pad.layout(best.cell, best.cols);
}
