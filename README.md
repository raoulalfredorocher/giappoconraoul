# Japan con Alfredo — ジャパン・コン・アルフレード

App personale per imparare il giapponese scrivendo a mano: iPhone, iPad (anche con Apple Pencil) e computer.
Sito statico su GitHub Pages; account e progressi su Firebase (piano gratuito).

- **Home**: ひらがな, カタカナ, 漢字, 文法 e 総合日本語 (Giapponese completo).
- **Hiragana / Katakana**: Alfabeto (righe scelte salvate), Allenamento (Lettere, Audio), Vocabolario (Scrittura, Audio).
- **Kanji**: kanji di base (o il PDF), Allenamento (Scrivi il kanji, Simbolo, Audio). Grammatica e Giapponese completo: in arrivo.
- **Impostazioni**: tema chiaro/scuro, lingua italiano/日本語, correzione, foglio, aiuti, solo Apple Pencil, voce lenta/normale.

## Struttura

| File | Cosa fa |
|---|---|
| `index.html` | Pagina, stile, login e collegamento a Firebase. |
| `app.js` | Generato da `app/build.sh`: non modificarlo a mano. |
| `app/src/*.js` | Sorgenti (moduli separati: niente nomi in conflitto). `exercise.js` esercizi, `recog.js` riconoscimento, `pad.js` foglio, `store.js` salvataggio, `views.js` schermate. |
| `app/data/` | Tratti KanjiVG (hiragana, katakana, kanji) ed elenco dei kanji. |
| `pdf/` | PDF opzionali: `hiragana.pdf`, `katakana.pdf`, `kanji.pdf`. |
| `test/e2e.js` | Test nel browser con tocco e Apple Pencil simulati. |
| `config.js`, `firestore.rules` | Configurazione Firebase e regole (dati in `users/{uid}/hiragana/japan`). |

## Modificare

```bash
sh app/build.sh                       # ricostruisce app.js
python3 -m http.server 8765 &         # poi, in un altro terminale:
node test/e2e.js                      # test completo
```

Salvataggio: righe scelte e impostazioni vanno subito in `localStorage` e subito sull'account; ognuna ha la sua data di modifica,
quindi uno stato vecchio di un altro dispositivo non le sovrascrive mai.

## Crediti

Tratti: [KanjiVG](https://kanjivg.tagaini.net) di Ulrich Apel, licenza CC BY-SA 3.0 (`app/data/strokes-*.json` ne derivano, stessa licenza).
