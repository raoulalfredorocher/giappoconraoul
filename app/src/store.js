// Stato, salvataggio locale (subito) e sincronizzazione con Firebase (account).
// Righe scelte e impostazioni hanno ciascuna la propria data di modifica: in caso di conflitto vince la più recente,
// così una modifica fatta su un dispositivo non viene mai cancellata da uno stato vecchio di un altro.
const KEY = 'jca-v1', DEV_KEY = 'jca-device-v1';
const OLD_KEY = 'hiragana-mano-v1';

export const DEFAULT_ROWS = { hira: ['a', 'ka'], kata: ['a', 'ka'] };
function fresh() {
  return {
    v: 1, updatedAt: 0,
    settings: { theme: 'auto', lang: 'it', level: 'easy', hints: 'auto', rate: 'normal', t: 0 },
    sel: { hira: { rows: DEFAULT_ROWS.hira.slice(), t: 0 }, kata: { rows: DEFAULT_ROWS.kata.slice(), t: 0 } },
    ui: { t: 0 },
    stats: {},
  };
}
function migrate(s) {
  const f = fresh();
  if (!s || typeof s !== 'object') return f;
  s = { ...f, ...s };
  s.settings = { ...f.settings, ...(s.settings || {}) };
  s.sel = { ...f.sel, ...(s.sel || {}) };
  for (const k of ['hira', 'kata']) if (!s.sel[k] || !Array.isArray(s.sel[k].rows)) s.sel[k] = f.sel[k];
  s.ui = { ...f.ui, ...(s.ui || {}) };
  s.stats = s.stats || {};
  return s;
}
// Dalla vecchia app "Hiragana a mano": righe sbloccate e impostazioni
function fromOld() {
  try {
    const o = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); if (!o) return null;
    const s = fresh();
    const order = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa'], n = Math.max(1, Math.min(13, o.unlocked || 2));
    const rows = order.slice(0, Math.min(n, 10));
    if (n > 10) rows.push('ga', 'za'); if (n > 11) rows.push('da', 'ba', 'pa'); if (n > 12) rows.push('yoon');
    s.sel.hira = { rows, t: 1 };
    const st = o.settings || {};
    if (st.level === 'normal') s.settings.level = 'normal';
    if (st.hints === 'always') s.settings.hints = 'always';
    if (st.rate && st.rate < 0.75) s.settings.rate = 'slow';
    s.settings.t = 1;
    return s;
  } catch (e) { return null; }
}

export let S = fresh();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) S = migrate(JSON.parse(raw)); else { const o = fromOld(); if (o) { S = o; writeLocal(); } }
} catch (e) { /* storage non disponibile: resta in memoria */ }

export let device = { padSize: 'l', pencilOnly: false, penSeen: false };
try {
  const d = JSON.parse(localStorage.getItem(DEV_KEY) || 'null');
  if (d) device = { ...device, ...d };
  else { const o = JSON.parse(localStorage.getItem(OLD_KEY + '-device') || 'null'); if (o) device = { ...device, padSize: o.padSize || 'l', pencilOnly: !!o.pencilOnly, penSeen: !!o.penSeen }; }
} catch (e) {}
export function saveDevice() { try { localStorage.setItem(DEV_KEY, JSON.stringify(device)); } catch (e) {} }

function writeLocal() { try { localStorage.setItem(KEY, JSON.stringify(S)); return true; } catch (e) { return false; } }

const listeners = new Set();
export function onRemoteChange(fn) { listeners.add(fn); }

// ---- remoto ----
let DB = null, pushTimer = null, pushing = false, again = false;
export const sync = { state: 'local' };
async function push() {
  if (!DB) return;
  if (pushing) { again = true; return; }
  pushing = true; clearTimeout(pushTimer); pushTimer = null;
  try { await DB.set({ json: JSON.stringify(S), updatedAt: S.updatedAt }); sync.state = 'ok'; }
  catch (e) { sync.state = 'err'; }
  pushing = false;
  if (again) { again = false; push(); }
}
function schedulePush(now) {
  if (!DB) return;
  if (now) { push(); return; }
  clearTimeout(pushTimer); pushTimer = setTimeout(push, 1500);
}
// salva: locale subito; remoto subito per scelte importanti (righe, impostazioni), con calma per le statistiche
export function save(important = false) {
  S.updatedAt = Date.now();
  writeLocal();
  schedulePush(important);
}
export function setRows(script, rows) { S.sel[script] = { rows: [...new Set(rows)], t: Date.now() }; save(true); }
export function setSetting(k, v) { S.settings[k] = v; S.settings.t = Date.now(); save(true); }
export function setUi(k, v) { S.ui[k] = v; S.ui.t = Date.now(); save(false); }

function merge(a, b) { // a = locale, b = remoto
  const m = migrate(JSON.parse(JSON.stringify(a)));
  if ((b.settings && b.settings.t || 0) > (m.settings.t || 0)) m.settings = { ...m.settings, ...b.settings };
  for (const k of ['hira', 'kata']) if (b.sel && b.sel[k] && (b.sel[k].t || 0) > (m.sel[k].t || 0)) m.sel[k] = { ...b.sel[k] };
  if (b.ui && (b.ui.t || 0) > (m.ui.t || 0)) m.ui = { ...b.ui };
  for (const [k, v] of Object.entries(b.stats || {})) { const l = m.stats[k]; if (!l || (v.n || 0) > (l.n || 0) || ((v.n || 0) === (l.n || 0) && (v.last || 0) > (l.last || 0))) m.stats[k] = v; }
  m.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  return m;
}
export async function pull() {
  if (!DB) return;
  try {
    const d = await DB.get();
    const remote = d && d.json ? migrate(JSON.parse(d.json)) : null;
    if (!remote) { if (S.updatedAt) push(); sync.state = 'ok'; return; }
    const before = JSON.stringify(S), merged = merge(S, remote);
    const changedLocal = JSON.stringify(merged) !== before;
    S = merged; writeLocal();
    if (JSON.stringify(merged) !== JSON.stringify(remote)) push();
    sync.state = 'ok';
    if (changedLocal) listeners.forEach(f => f());
  } catch (e) { sync.state = 'err'; }
}
export function connect(db) { DB = db; return pull(); }
export function disconnect() { DB = null; sync.state = 'local'; }
export function connected() { return !!DB; }
export function resetAll() { const keep = { settings: S.settings, sel: S.sel }; S = fresh(); S.settings = keep.settings; S.sel = keep.sel; save(true); }

// Alla chiusura o quando l'app va in background: scrive tutto subito
function flush() { writeLocal(); if (DB && (pushTimer || again)) push(); }
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); else pull(); });

// ---- statistiche per scegliere gli esercizi (più spesso quelli sbagliati o nuovi) ----
export function stat(key) { return S.stats[key]; }
export function record(key, ok) {
  const s = S.stats[key] || (S.stats[key] = { n: 0, ok: 0, last: 0, box: 0 });
  s.n++; if (ok) { s.ok++; s.box = Math.min(5, (s.box || 0) + 1); } else s.box = Math.max(0, (s.box || 0) - 2);
  s.last = Date.now(); save(false);
}
export function weight(key) {
  const s = S.stats[key]; let w = s ? (6 - (s.box || 0)) ** 2 : 40;
  if (s && s.n && s.ok / s.n < 0.7) w += 10;
  if (s && Date.now() - s.last < 60e3) w *= 0.2;
  return w;
}
export function pick(arr, keyOf, avoid = []) {
  const pool = arr.filter(x => !avoid.includes(keyOf(x)));
  const src = pool.length ? pool : arr; if (!src.length) return null;
  const ws = src.map(x => weight(keyOf(x))); let t = ws.reduce((a, b) => a + b, 0) * Math.random();
  for (let i = 0; i < src.length; i++) { t -= ws[i]; if (t <= 0) return src[i]; }
  return src[src.length - 1];
}
