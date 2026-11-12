# Giappo con Raoul — Hiragana a mano

App personale per imparare a scrivere e leggere gli hiragana, su iPhone, iPad (anche con Apple Pencil) e computer.
Sito statico su GitHub Pages; login e progressi su Firebase (piano gratuito).

- **Test di oggi**: 10 domande, dai kana alle parole.
- **Ripasso**: quello che hai scritto torna dopo 1, 2, 4, 8 e 16 giorni.
- **Studio e ascolto**: leggi ad alta voce al microfono e di' il significato.
- **Allenamento** senza fine e **Alfabeto** con ordine dei tratti e pronuncia.

## Struttura

| File | Cosa fa |
|---|---|
| `index.html`, `sw.js` | Generati da `build.py`: non modificarli a mano. |
| `config.js` | Configurazione web di Firebase. Se è `null` l'app funziona senza account. |
| `src/core.js` | Dati (kana, parole), ripasso, voce, microfono, foglio di scrittura. |
| `src/recog.js` | Riconoscimento della scrittura e consigli sulla forma. |
| `src/views.js` | Schermate. |
| `src/page.html` | Pagina, login e collegamento a Firebase. |
| `firestore.rules` | Regole da incollare in Firebase › Firestore › Regole. |

## Modificare e pubblicare

```bash
python3 build.py
```

Poi commit e push su `main`: GitHub Pages pubblica da solo (Settings › Pages › Deploy from a branch › `main` / root).

## Firebase (una volta sola)

1. Authentication › Metodo di accesso › Email/password attivo.
2. Firestore › Crea database, poi incolla `firestore.rules` in Regole e pubblica.
3. Authentication › Impostazioni › Domini autorizzati: aggiungi `raoulalfredorocher.github.io`.
4. Impostazioni progetto › Le tue app › Web: copia `firebaseConfig` in `config.js`.

## Crediti

Ordine dei tratti: [KanjiVG](https://kanjivg.tagaini.net) di Ulrich Apel, licenza CC BY-SA 3.0 (`src/strokes.json` ne deriva ed è sotto la stessa licenza).
