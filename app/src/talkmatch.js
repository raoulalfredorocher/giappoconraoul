// Parla: confronto tollerante tra quello che il riconoscimento vocale ha capito e la lettura attesa.
// Il riconoscitore restituisce kana, kanji, numeri o romaji: tutto viene ridotto a sillabe normalizzate.
import { romaji, roNorm, toHira } from './data.js';

// Kanji che il riconoscitore usa spesso per sillabe e parole brevi (lettura -> kanji)
const EXTRA = `あ:亜阿 い:胃井位意以医 う:鵜卯有 え:絵江柄餌 お:尾緒 か:蚊可科課化火 き:木気機期記器 く:区九句苦 け:毛家 こ:子粉個戸小
さ:差 し:詩死市四氏紙 す:酢巣 せ:背瀬 そ:祖 た:田他 ち:血地 つ:津 て:手 と:戸都十 な:名菜 に:二荷 ぬ:沼 ね:根値音 の:野之
は:歯葉派刃 ひ:火日陽非 ふ:府不 へ:屁 ほ:帆穂 ま:間真 み:実身見三 む:無 め:目芽女 も:藻喪 や:矢屋 ゆ:湯 よ:世夜四 ら:等 り:理 る:留 れ:例
ろ:炉路 わ:輪和 を:緒 ん:ん が:我蛾 ぎ:技義 ぐ:具 げ:下 ご:五語碁後 ざ:座 じ:字時事地 ず:図 ぜ:是 ぞ:象 だ:打 で:出 ど:度土 ば:場 び:美
ぶ:部 べ:辺 ぼ:簿 ぱ:派 ぴ:ピ ぷ:プ ぺ:ペ ぽ:ポ ひと:人 いぬ:犬 ねこ:猫 いえ:家 やま:山 かわ:川 はな:花鼻 そら:空 あめ:雨飴 あき:秋
なつ:夏 ふゆ:冬 はる:春 うみ:海 みず:水 き:木 め:目 くち:口 みみ:耳 あし:足 て:手 え:絵 いけ:池 あい:愛 あお:青 あか:赤 しろ:白
くろ:黒 いち:一 に:二 さん:三 よん:四 し:四 ご:五 ろく:六 なな:七 しち:七 はち:八 きゅう:九 く:九 じゅう:十 ひゃく:百 せん:千 まん:万`;
const READ = {};
const addR = (k, r) => { (READ[k] = READ[k] || new Set()).add(r); };
for (const tok of EXTRA.split(/\s+/)) { const [r, ks] = tok.split(':'); if (ks) for (const k of ks) addR(k, r); }
export function addReadings(list) { for (const { k, yomi } of list) if (k && yomi) addR(k, yomi); }
const DIG = { 0: ['ぜろ', 'れい'], 1: ['いち'], 2: ['に'], 3: ['さん'], 4: ['よん', 'し'], 5: ['ご'], 6: ['ろく'], 7: ['なな', 'しち'], 8: ['はち'], 9: ['きゅう', 'く'], 10: ['じゅう'], 100: ['ひゃく'], 1000: ['せん'] };

const clean = s => String(s || '').normalize('NFKC').toLowerCase().replace(/[\s、。，．,.!?！？・「」『』"'’〜~…ー-]+$/g, '').replace(/[\s、。，．,!?！？・「」『』"“”〜~…]/g, '');
// tutte le letture possibili di un testo (kanji e numeri sostituiti dalle loro letture), al massimo 48
function readings(s) {
  let out = [''];
  const parts = s.match(/\d+|./gu) || [];
  for (const p of parts) {
    let opts;
    if (/^\d+$/.test(p)) opts = DIG[+p] || [p];
    else if (READ[p]) opts = [...READ[p], p];
    else opts = [p];
    const nx = [];
    for (const a of out) for (const o of opts) { if (nx.length < 48) nx.push(a + o); }
    out = nx;
  }
  return out;
}
// chiave di confronto: sillabe in romaji normalizzate (shi=si, ō=o=ou, doppie unite...)
export const key = s => {
  s = clean(s);
  if (/^[a-z']+$/.test(s)) return roNorm(s);
  return roNorm(romaji(toHira(s)));
};
function lev(a, b) { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let p = [...Array(n + 1).keys()]; for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[n]; }
// varianti di pronuncia della risposta attesa: は/へ/を come particelle, じ/ぢ, ず/づ
function targetKeys(reads) {
  const ks = new Set();
  for (const r of reads) {
    const h = toHira(r);
    for (const v of [h, h.replace(/は/g, 'わ'), h.replace(/へ/g, 'え'), h.replace(/を/g, 'お'), h.replace(/ぢ/g, 'じ').replace(/づ/g, 'ず')]) ks.add(key(v));
  }
  ks.delete('');
  return [...ks];
}

// target: { show: testo mostrato (kana, parola o kanji), reads: [letture accettate in kana] }
// alts: trascrizioni del riconoscitore. Ritorna true se una di queste corrisponde.
export function matches(target, alts) {
  const want = targetKeys(target.reads);
  const shown = clean(target.show), shownH = toHira(shown);
  for (const raw of alts) {
    const s = clean(raw);
    if (!s) continue;
    // il testo stesso (kanji o parola) compare in quello che ha capito
    if (s === shown || toHira(s) === shownH) return true;
    if ([...shown].length >= 2 || /\p{Script=Han}/u.test(shown)) { if (s.includes(shown) || toHira(s).includes(shownH)) return true; }
    for (const r of readings(s)) {
      const k = key(r);
      if (!k) continue;
      for (const w of want) {
        if (k === w) return true;
        // parole lunghe: una piccola differenza passa
        if (w.length >= 6 && lev(k, w) <= Math.floor(w.length / 6)) return true;
      }
    }
  }
  return false;
}
