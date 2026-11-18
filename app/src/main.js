// Avvio: tema, sincronizzazione con l'account, PDF disponibili, prima schermata.
import { S, connect, disconnect, onRemoteChange } from './store.js';
import { render, applyTheme, view, pdfAvail } from './views.js';
import { exItem } from './exercise.js';

applyTheme();
render();

onRemoteChange(() => { applyTheme(); if (view.name !== 'ex' && view.name !== 'sheet') render(); });
addEventListener('jca-sync-ready', () => { if (window.JCA_SYNC) connect(window.JCA_SYNC).then(() => { if (view.name === 'settings') render(); }); });
addEventListener('jca-signed-out', () => { disconnect(); if (view.name === 'settings') render(); });
if (window.JCA_SYNC) connect(window.JCA_SYNC);

// PDF (alfabeto e kanji): compaiono quando i file vengono aggiunti nella cartella pdf/
for (const [k, f] of Object.entries({ hira: 'pdf/hiragana.pdf', kata: 'pdf/katakana.pdf', kanji: 'pdf/kanji.pdf' })) {
  fetch(f, { method: 'HEAD', cache: 'no-cache' }).then(r => { const ok = r.ok && /pdf/i.test(r.headers.get('content-type') || ''); if (ok) { pdfAvail[k] = true; if (['alpha', 'kanjiHome', 'kanjiList'].includes(view.name)) render(); } }).catch(() => {});
}
// per i test automatici
window.JCA = { S: () => S, view: () => view, item: () => exItem() };
