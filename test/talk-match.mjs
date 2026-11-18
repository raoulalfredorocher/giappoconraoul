// Test del confronto di "Parla": trascrizioni tipiche del riconoscitore vocale -> giusto/sbagliato.
// Uso: node test/talk-match.mjs  (costruisce un bundle temporaneo con esbuild)
import { execSync } from 'child_process';
import { mkdtempSync } from 'fs'; import { tmpdir } from 'os'; import { join } from 'path';
const out = join(mkdtempSync(join(tmpdir(), 'tm-')), 'm.mjs');
execSync(`npx --yes esbuild@0.24.2 test/talk-match-entry.js --bundle --format=esm --platform=node --loader:.txt=text --outfile=${out} --log-level=warning`);
const { matches, addReadings, KANJI, WORDS } = await import(out);
addReadings(KANJI);
let f = 0, p = 0;
const T = (show, reads, alts, exp) => { const r = matches({ show, reads }, alts); if (r === exp) p++; else { f++; console.log('✗', show, JSON.stringify(alts), 'atteso', exp); } };
// kana singoli
T('あ', ['あ'], ['あー'], true); T('あ', ['あ'], ['ああ'], true); T('き', ['き'], ['木'], true); T('き', ['き'], ['気'], true);
T('し', ['し'], ['4'], true); T('し', ['し'], ['shi'], true); T('つ', ['つ'], ['ツ'], true); T('ふ', ['ふ'], ['フー'], true);
T('き', ['き'], ['か'], false); T('あ', ['あ'], ['い'], false); T('ね', ['ね'], ['の', '野'], false); T('め', ['め'], ['目'], true);
T('キ', ['キ'], ['き'], true); T('ン', ['ン'], ['ん'], true); T('きゃ', ['きゃ'], ['キャ'], true); T('しゅ', ['しゅ'], ['しゅう'], true);
// parole
T('いえ', ['いえ'], ['家'], true); T('ねこ', ['ねこ'], ['猫'], true); T('ありがとう', ['ありがとう'], ['ありがと'], true); T('ありがとう', ['ありがとう'], ['有難う', 'ありがとう。'], true);
T('アイスクリーム', ['アイスクリーム'], ['アイスクリーム'], true); T('アイスクリーム', ['アイスクリーム'], ['アイスクリム'], true); T('イタリア', ['イタリア'], ['イタリア。'], true);
T('こんにちは', ['こんにちは'], ['こんにちわ'], true); T('いえ', ['いえ'], ['いぬ'], false); T('あお', ['あお'], ['青'], true);
// kanji
T('山', ['やま'], ['山'], true); T('山', ['やま'], ['やま'], true); T('三', ['さん'], ['3'], true); T('十', ['じゅう'], ['10'], true); T('水', ['みず'], ['ミズ'], true);
T('山', ['やま'], ['川'], false); T('九', ['きゅう'], ['9'], true);
// tutti i kanji: il kanji stesso e la sua lettura passano; un'altra lettura no
for (const k of KANJI) { T(k.k, [k.yomi], [k.k], true); T(k.k, [k.yomi], [k.yomi], true); }
for (const sc of ['hira', 'kata']) for (const w of WORDS[sc]) T(w.k, [w.k], [w.k], true);
console.log(`${p} ok, ${f} errori`); process.exit(f ? 1 : 0);
