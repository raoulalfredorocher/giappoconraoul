// Voce giapponese (sintesi del sistema, ja-JP). Velocità: lenta o normale (Impostazioni).
import { S, device, saveDevice } from './store.js';

// Voci giapponesi ordinate per qualità: le voci "naturali"/"premium"/"avanzate" suonano molto meno metalliche
let jaVoice = null, jaVoices = [];
export function voiceScore(v) {
  const n = v.name.toLowerCase(); let s = 0;
  if (/natural|neural|premium|enhanced|avanzat|migliorat|siri|online/.test(n)) s += 20;
  if (/nanami|keita|aoi|daichi|mayu|naoki|shiori/.test(n)) s += 8; // Microsoft (Edge)
  if (/google/.test(n)) s += 7;
  if (/kyoko|otoya|o-ren|hattori/.test(n)) s += 5;
  if (/compact|eloquence|espeak/.test(n)) s -= 10;
  if (!v.localService) s += 2;
  return s;
}
function loadVoices() {
  try {
    jaVoices = speechSynthesis.getVoices().filter(v => /^ja/i.test(v.lang)).sort((a, b) => voiceScore(b) - voiceScore(a));
    jaVoice = jaVoices.find(v => v.name === device.voice) || jaVoices[0] || null;
    dispatchEvent(new Event('jca-voices'));
  } catch (e) {}
}
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
export const voiceName = () => (jaVoice ? jaVoice.name : '');
export const voiceList = () => jaVoices.map(v => v.name);
export function setVoice(name) { device.voice = name; saveDevice(); loadVoices(); }
export const hasSpeech = () => 'speechSynthesis' in window;

// Piccoli kana letti da soli: si dice il nome per esteso
const FIX = { っ: 'ちいさい つ', ゃ: 'ちいさい や', ゅ: 'ちいさい ゆ', ょ: 'ちいさい よ', ッ: 'ちいさい ツ', ャ: 'ちいさい ヤ', ュ: 'ちいさい ユ', ョ: 'ちいさい ヨ', ー: 'ちょうおん' };
const rate = () => (S.settings.rate === 'slow' ? 0.6 : 0.95);

let token = 0;
// times: quante volte ripetere (con una pausa tra una e l'altra)
export function speak(text, times = 1) {
  if (!hasSpeech()) return false;
  const my = ++token;
  try {
    speechSynthesis.cancel();
    const say = FIX[text] || text;
    const one = (i) => {
      if (my !== token || i >= times) return;
      const u = new SpeechSynthesisUtterance(say);
      u.lang = 'ja-JP'; if (jaVoice) u.voice = jaVoice; u.rate = rate(); u.pitch = 1;
      let next = false; const go = () => { if (next) return; next = true; setTimeout(() => one(i + 1), 650); };
      u.onend = go; u.onerror = go;
      // riserva: su alcuni iPhone onend non arriva
      setTimeout(go, 1200 + say.length * 450 / rate());
      speechSynthesis.speak(u);
    };
    one(0);
    if (!jaVoice) setTimeout(loadVoices, 600);
    return true;
  } catch (e) { return false; }
}
export function stopSpeech() { token++; try { speechSynthesis.cancel(); } catch (e) {} }
