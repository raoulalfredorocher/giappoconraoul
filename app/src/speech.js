// Voce giapponese (sintesi del sistema, ja-JP). Velocità: lenta o normale (Impostazioni).
import { S } from './store.js';

let jaVoice = null;
function loadVoices() {
  try {
    const vs = speechSynthesis.getVoices();
    jaVoice = vs.find(v => /^ja/i.test(v.lang) && /kyoko|otoya|o-ren|hattori|google/i.test(v.name)) || vs.find(v => /^ja/i.test(v.lang)) || null;
  } catch (e) {}
}
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
export const voiceName = () => (jaVoice ? jaVoice.name : '');
export const hasSpeech = () => 'speechSynthesis' in window;

// Piccoli kana letti da soli: si dice il nome per esteso
const FIX = { っ: 'ちいさい つ', ゃ: 'ちいさい や', ゅ: 'ちいさい ゆ', ょ: 'ちいさい よ', ッ: 'ちいさい ツ', ャ: 'ちいさい ヤ', ュ: 'ちいさい ユ', ョ: 'ちいさい ヨ', ー: 'ちょうおん' };
const rate = () => (S.settings.rate === 'slow' ? 0.55 : 0.9);

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
      u.lang = 'ja-JP'; if (jaVoice) u.voice = jaVoice; u.rate = rate();
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
