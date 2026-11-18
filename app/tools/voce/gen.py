import json, sys, os, subprocess, tempfile
from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile
SID = int(sys.argv[1]); OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
FIX = {'っ':'ちいさい つ','ゃ':'ちいさい や','ゅ':'ちいさい ゆ','ょ':'ちいさい よ','ッ':'ちいさい ツ','ャ':'ちいさい ヤ','ュ':'ちいさい ユ','ョ':'ちいさい ヨ','ー':'ちょうおん'}
def tohira(s): return ''.join(chr(ord(c)-0x60) if 'ァ'<=c<='ヶ' else c for c in s)
def key(t):
    s = FIX.get(t, t)
    if len(s) <= 2 and all('ァ'<=c<='ヶ' or c=='ー' for c in s): s = tohira(s)
    return s
def fnv(s):
    h = 0x811c9dc5; b = s.encode('utf-16-le')
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i+1] << 8); h = (h * 0x01000193) & 0xffffffff
    return '%08x' % h
OVR = {'はは': 'ハハ', 'あらう': '洗う', 'つかう': '使う'}
SINGLE = set(json.load(open('single.json')))
def tokata(s): return ''.join(chr(ord(c)+0x60) if 'ぁ'<=c<='ゖ' else c for c in s)
texts = json.load(open('texts.json')) + list(FIX.keys())
keys = sorted(set(key(t) for t in texts))
hs = {}
for k in keys:
    h = fnv(k); assert h not in hs, (k, hs.get(h)); hs[h] = k
ort = Onnxruntime.load_once(filename="voicevox_onnxruntime-linux-x64-1.17.3/lib/libvoicevox_onnxruntime.so.1.17.3")
syn = Synthesizer(ort, OpenJtalk("open_jtalk_dic_utf_8-1.11"))
vv = {29:'6',30:'6',31:'6',14:'1',13:'15',52:'12'}[SID]
with VoiceModelFile.open(f"vvm/{vv}.vvm") as m: syn.load_voice_model(m)
import io, wave, array
def norm(wav):
    w = wave.open(io.BytesIO(wav)); p = w.getparams(); a = array.array('h', w.readframes(p.nframes))
    m = max(1, max(abs(x) for x in a)); g = 0.89 * 32767 / m
    a = array.array('h', (max(-32768, min(32767, int(x * g))) for x in a))
    o = io.BytesIO(); ww = wave.open(o, 'wb'); ww.setparams(p); ww.writeframes(a.tobytes()); ww.close(); return o.getvalue()
report = []
for h, k in hs.items():
    if k in SINGLE:
        q = syn.create_audio_query_from_kana(tokata(k).replace('ヂ','ジ').replace('ヅ','ズ').replace('ヲ','オ') + "'", SID)
    else:
        q = syn.create_audio_query(OVR.get(k, k), SID)
        if len(q.accent_phrases) > 1:
            q2 = syn.create_audio_query(tokata(k), SID)
            if len(q2.accent_phrases) == 1: q = q2
    kana = q.kana
    report.append((k, kana))
    for suf, sp in (('', 1.0), ('-s', 0.72)):
        q.speed_scale = sp; q.pre_phoneme_length = 0.05; q.post_phoneme_length = 0.1
        q.volume_scale = 1.15
        wav = norm(syn.synthesis(q, SID))
        with tempfile.NamedTemporaryFile(suffix='.wav') as f:
            f.write(wav); f.flush()
            subprocess.run(['ffmpeg','-loglevel','error','-y','-i',f.name,'-af','silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,apad=pad_dur=0.08','-ac','1','-ar','24000','-c:a','libmp3lame','-b:a','48k',f'{OUT}/{h}{suf}.mp3'], check=True)
json.dump(report, open(f'{OUT}.report.json','w'), ensure_ascii=False, indent=0)
json.dump(sorted(hs.keys()), open(f'{OUT}.hashes.json','w'))
print(len(hs), 'texts')
