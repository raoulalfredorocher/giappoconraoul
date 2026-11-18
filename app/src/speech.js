// Voce giapponese: audio neurale pre-generato (VOICEVOX, voce No.7) in audio/, normale e lenta (Impostazioni).
// Se per un testo manca il file si usa la sintesi del sistema (ja-JP).
import { S } from './store.js';
import IDX from './voice-index.js';

// Piccoli kana letti da soli: si dice il nome per esteso
const FIX = { っ: 'ちいさい つ', ゃ: 'ちいさい や', ゅ: 'ちいさい ゆ', ょ: 'ちいさい よ', ッ: 'ちいさい ツ', ャ: 'ちいさい ヤ', ュ: 'ちいさい ユ', ョ: 'ちいさい ヨ', ー: 'ちょうおん' };
const slow = () => S.settings.rate === 'slow';

// Stessa chiave di app/tools/voce/gen.py: kana singoli e sillabe in katakana -> hiragana (stesso suono)
export function voiceKey(text) {
  let s = FIX[text] || text;
  if ([...s].length <= 2 && /^[ァ-ヶー]+$/.test(s)) s = s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  return s;
}
export function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return ('0000000' + h.toString(16)).slice(-8);
}
const HAVE = new Set(IDX.split(' '));
export const audioFor = text => { const h = fnv(voiceKey(text)); return HAVE.has(h) ? `audio/${h}${slow() ? '-s' : ''}.mp3` : null; };

// Un solo elemento audio, riusato: su iPhone/iPad dopo il primo tocco può ripartire anche dai timer (ripetizioni)
let el = null, micMode = false;
// Parla: mentre il microfono è in uso la sessione audio resta "registra e suona"
export function setMicMode(v) { micMode = v; }
function player() {
  if (!el) {
    el = new Audio(); el.preload = 'auto'; el.setAttribute('playsinline', '');
    try { if (navigator.audioSession && !micMode) navigator.audioSession.type = 'playback'; } catch (e) {} // suona anche col silenzioso
  }
  return el;
}

let token = 0;
// times: quante volte ripetere (con una pausa tra una e l'altra)
export function speak(text, times = 1) {
  const my = ++token;
  sysCancel();
  const src = audioFor(text);
  if (!src) return sysSpeak(text, times, my);
  const a = player();
  try { a.pause(); } catch (e) {}
  let i = 0, done = false;
  const next = () => { if (done || my !== token) return; i++; if (i < times) setTimeout(() => { if (my === token) play(); }, slow() ? 900 : 700); };
  const fail = () => { if (done || my !== token) return; done = true; sysSpeak(text, times - i, my); };
  a.onended = next; a.onerror = fail;
  const play = () => { try { a.currentTime = 0; } catch (e) {} const p = a.play(); if (p && p.catch) p.catch(err => { if (err && err.name !== 'AbortError') fail(); }); };
  if (!a.src.endsWith(src)) { a.src = src; a.load(); }
  play();
  return true;
}
export function stopSpeech() { token++; try { if (el) el.pause(); } catch (e) {} sysCancel(); }
export const hasSpeech = () => true;

// ---- riserva: sintesi del sistema ----
const sys = () => 'speechSynthesis' in window;
function sysCancel() { try { if (sys()) speechSynthesis.cancel(); } catch (e) {} }
function sysVoice() {
  try {
    const v = speechSynthesis.getVoices().filter(v => /^ja/i.test(v.lang));
    return v.find(x => /natural|neural|premium|enhanced|siri|google|nanami|kyoko|otoya/i.test(x.name)) || v[0] || null;
  } catch (e) { return null; }
}
function sysSpeak(text, times, my) {
  if (!sys()) return false;
  try {
    const say = FIX[text] || text, rate = slow() ? 0.6 : 0.95, voice = sysVoice();
    const one = (i) => {
      if (my !== token || i >= times) return;
      const u = new SpeechSynthesisUtterance(say);
      u.lang = 'ja-JP'; if (voice) u.voice = voice; u.rate = rate;
      let nx = false; const go = () => { if (nx) return; nx = true; setTimeout(() => one(i + 1), 650); };
      u.onend = go; u.onerror = go; setTimeout(go, 1200 + say.length * 450 / rate); // su alcuni iPhone onend non arriva
      speechSynthesis.speak(u);
    };
    one(0);
    return true;
  } catch (e) { return false; }
}
