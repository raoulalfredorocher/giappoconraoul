// Dati: righe dell'alfabeto (hiragana e katakana), romaji, parole, kanji.
import WH from './words-hira.js';
import WK from './words-kata.js';
import KL from '../data/kanji-list.txt';

// Righe in hiragana: le righe katakana si ricavano spostando il codice Unicode (+0x60).
const HROWS = [
  { id: 'a', it: 'Vocali', cells: 'あいうえお' },
  { id: 'ka', cells: 'かきくけこ' },
  { id: 'sa', cells: 'さしすせそ' },
  { id: 'ta', cells: 'たちつてと' },
  { id: 'na', cells: 'なにぬねの' },
  { id: 'ha', cells: 'はひふへほ' },
  { id: 'ma', cells: 'まみむめも' },
  { id: 'ya', cells: 'や・ゆ・よ' },
  { id: 'ra', cells: 'らりるれろ' },
  { id: 'wa', cells: 'わを・・ん' },
  { id: 'ga', cells: 'がぎぐげご', d: 1 },
  { id: 'za', cells: 'ざじずぜぞ', d: 1 },
  { id: 'da', cells: 'だぢづでど', d: 1 },
  { id: 'ba', cells: 'ばびぶべぼ', d: 1 },
  { id: 'pa', cells: 'ぱぴぷぺぽ', d: 1 },
  { id: 'yoon', cells: 'きゃ きゅ きょ しゃ しゅ しょ ちゃ ちゅ ちょ にゃ にゅ にょ ひゃ ひゅ ひょ みゃ みゅ みょ りゃ りゅ りょ ぎゃ ぎゅ ぎょ じゃ じゅ じょ びゃ びゅ びょ ぴゃ ぴゅ ぴょ', y: 1 },
];
export const toKata = s => s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
export const toHira = s => s.normalize('NFKC').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));

function rowsFor(script) {
  const conv = script === 'kata' ? toKata : x => x;
  return HROWS.map(r => {
    const items = r.y ? r.cells.split(' ').map(conv) : [...r.cells].map(c => (c === '・' ? '' : conv(c)));
    if (r.extra) items.push(...[...r.extra].map(conv));
    return { id: r.id, d: !!r.d, y: !!r.y, items, chars: items.filter(Boolean) };
  });
}
export const ROWS = { hira: rowsFor('hira'), kata: rowsFor('kata') };

// romaji di un kana singolo (hiragana)
export const RO = { あ:'a',い:'i',う:'u',え:'e',お:'o',か:'ka',き:'ki',く:'ku',け:'ke',こ:'ko',さ:'sa',し:'shi',す:'su',せ:'se',そ:'so',
た:'ta',ち:'chi',つ:'tsu',て:'te',と:'to',な:'na',に:'ni',ぬ:'nu',ね:'ne',の:'no',は:'ha',ひ:'hi',ふ:'fu',へ:'he',ほ:'ho',
ま:'ma',み:'mi',む:'mu',め:'me',も:'mo',や:'ya',ゆ:'yu',よ:'yo',ら:'ra',り:'ri',る:'ru',れ:'re',ろ:'ro',わ:'wa',を:'wo',ん:'n',
が:'ga',ぎ:'gi',ぐ:'gu',げ:'ge',ご:'go',ざ:'za',じ:'ji',ず:'zu',ぜ:'ze',ぞ:'zo',だ:'da',ぢ:'ji',づ:'zu',で:'de',ど:'do',
ば:'ba',び:'bi',ぶ:'bu',べ:'be',ぼ:'bo',ぱ:'pa',ぴ:'pi',ぷ:'pu',ぺ:'pe',ぽ:'po',ゔ:'vu' };
const SMALL_Y = { ゃ: 'a', ゅ: 'u', ょ: 'o' }, SMALL_V = { ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o' };
const MACRON = { a: 'ā', i: 'ī', u: 'ū', e: 'ē', o: 'ō' };

// romaji (Hepburn) di una parola in hiragana o katakana; ー allunga la vocale (ō, ī...)
export function romaji(word) {
  const a = [...toHira(word.replace(/ー/g, '\u0000'))];
  let out = '';
  for (let i = 0; i < a.length; i++) {
    const c = a[i], n = a[i + 1];
    if (c === '\u0000') { const v = out.slice(-1); if (MACRON[v]) out = out.slice(0, -1) + MACRON[v]; continue; }
    if (c === 'っ') { const nx = romaji(a.slice(i + 1).join('').replace(/\u0000/g, 'ー')); out += nx.startsWith('ch') ? 't' : (nx[0] || ''); continue; }
    if (n && SMALL_Y[n] && RO[c]) { const b = RO[c]; out += /^(shi|chi|ji)$/.test(b) ? b.slice(0, -1) + SMALL_Y[n] : b.slice(0, -1) + 'y' + SMALL_Y[n]; i++; continue; }
    if (n && SMALL_V[n] && RO[c]) { const b = RO[c], v = SMALL_V[n];
      const stem = b === 'fu' ? 'f' : b === 'te' ? 't' : b === 'de' ? 'd' : b === 'u' ? 'w' : b === 'vu' ? 'v' : /^(shi|chi|ji)$/.test(b) ? b.slice(0, -1) : b.slice(0, -1);
      out += stem + v; i++; continue; }
    if (SMALL_V[c]) { out += SMALL_V[c]; continue; }
    if (c === 'ん' && n && /^[aiueoy]/.test(RO[n] || '')) { out += "n'"; continue; }
    out += RO[c] || c;
  }
  return out;
}

// Normalizza il romaji scritto: accetta varianti (si/shi, tu/tsu, ō/oo/o...)
const RO_ALT = [[/shi/g,'si'],[/chi/g,'ti'],[/tsu/g,'tu'],[/fu/g,'hu'],[/ji/g,'zi'],[/sh(?=[aueo])/g,'sy'],[/ch(?=[aueo])/g,'ty'],[/j(?=[aueo])/g,'zy'],[/jy/g,'zy'],[/wo/g,'o'],[/dzu/g,'zu'],[/du/g,'zu'],[/di/g,'zi'],[/n'/g,'n'],[/m(?=[pbm])/g,'n']];
export function roNorm(r) {
  r = String(r || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s\-'’.,·・]/g, '');
  for (const [a, b] of RO_ALT) r = r.replace(a, b);
  return r.replace(/(.)\1+/g, '$1').replace(/ou/g, 'o').replace(/ei/g, 'e').replace(/(.)\1+/g, '$1');
}

// Parole
function parseWords(raw, script) {
  return raw.split('\n').filter(Boolean).map(l => { const [k, it, ro] = l.split('|'); return { k, it, ro: ro || romaji(k), chars: [...k], script }; });
}
export const WORDS = { hira: parseWords(WH, 'hira'), kata: parseWords(WK, 'kata') };

// Kanji: simbolo, lettura (per la voce), significato
export const KANJI = KL.split('\n').filter(Boolean).map(l => { const [k, yomi, it] = l.split('|'); return { k, yomi, it, ro: romaji(yomi) }; });

// A quale riga appartiene un kana (per filtrare le parole in base alle righe scelte)
const ROW_OF = {};
for (const sc of ['hira', 'kata']) for (const r of ROWS[sc]) if (!r.y) for (const c of r.chars) ROW_OF[c] = r.id;
const SMALL_ROW = { っ: 'ta', ッ: 'ta', ゃ: 'yoon', ゅ: 'yoon', ょ: 'yoon', ャ: 'yoon', ュ: 'yoon', ョ: 'yoon', ァ: 'a', ィ: 'a', ゥ: 'a', ェ: 'a', ォ: 'a', ぁ: 'a', ぃ: 'a', ぅ: 'a', ぇ: 'a', ぉ: 'a' };
export function rowOf(c) { return c === 'ー' ? null : (SMALL_ROW[c] || ROW_OF[c] || null); }

// kana che si pronunciano uguali: nell'audio valgono entrambi
const SAME = [['じ', 'ぢ'], ['ず', 'づ'], ['お', 'を']];
export function homophones(s) {
  const alts = new Set([s]);
  for (const [a, b] of SAME) for (const [x, y] of [[a, b], [b, a], [toKata(a), toKata(b)], [toKata(b), toKata(a)]]) for (const v of [...alts]) if (v.includes(x)) alts.add(v.split(x).join(y));
  return [...alts];
}
