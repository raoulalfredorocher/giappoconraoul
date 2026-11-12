/* ============ DATA ============ */
const SD = /*__SD__*/null;
const GROUPS=[
 {name:'Vocali',chars:'あいうえお'},
 {name:'Riga K',chars:'かきくけこ'},
 {name:'Riga S',chars:'さしすせそ'},
 {name:'Riga T',chars:'たちつてと'},
 {name:'Riga N',chars:'なにぬねの'},
 {name:'Riga H',chars:'はひふへほ'},
 {name:'Riga M',chars:'まみむめも'},
 {name:'Riga Y',chars:'やゆよ'},
 {name:'Riga R',chars:'らりるれろ'},
 {name:'W, WO e N',chars:'わをん'},
 {name:'Dakuten G e Z',chars:'がぎぐげござじずぜぞ'},
 {name:'Dakuten D, B e P',chars:'だぢづでどばびぶべぼぱぴぷぺぽ'},
 {name:'Kana piccoli',chars:'っゃゅょ'},
].map(g=>({...g,chars:[...g.chars]}));
const RO={あ:'a',い:'i',う:'u',え:'e',お:'o',か:'ka',き:'ki',く:'ku',け:'ke',こ:'ko',さ:'sa',し:'shi',す:'su',せ:'se',そ:'so',
た:'ta',ち:'chi',つ:'tsu',て:'te',と:'to',な:'na',に:'ni',ぬ:'nu',ね:'ne',の:'no',は:'ha',ひ:'hi',ふ:'fu',へ:'he',ほ:'ho',
ま:'ma',み:'mi',む:'mu',め:'me',も:'mo',や:'ya',ゆ:'yu',よ:'yo',ら:'ra',り:'ri',る:'ru',れ:'re',ろ:'ro',わ:'wa',を:'wo',ん:'n',
が:'ga',ぎ:'gi',ぐ:'gu',げ:'ge',ご:'go',ざ:'za',じ:'ji',ず:'zu',ぜ:'ze',ぞ:'zo',だ:'da',ぢ:'ji',づ:'zu',で:'de',ど:'do',
ば:'ba',び:'bi',ぶ:'bu',べ:'be',ぼ:'bo',ぱ:'pa',ぴ:'pi',ぷ:'pu',ぺ:'pe',ぽ:'po',っ:'tsu piccolo',ゃ:'ya piccolo',ゅ:'yu piccolo',ょ:'yo piccolo'};
const KANA_WORD={え:'disegno, quadro',て:'mano',め:'occhio',き:'albero',け:'pelo',こ:'bambino',は:'dente; foglia',ひ:'fuoco; giorno',ほ:'vela',ち:'sangue',を:'particella del complemento oggetto',ん:'"n" finale',っ:'raddoppia la consonante dopo',ゃ:'si unisce al kana prima (きゃ = kya)',ゅ:'si unisce al kana prima (きゅ = kyu)',ょ:'si unisce al kana prima (きょ = kyo)'};
const WORDS_RAW=`あい|amore
あお|blu
いえ|casa
うえ|sopra
いいえ|no
おい|ehi!
あう|incontrare
いう|dire
あき|autunno
こい|carpa (e anche: amore)
うきうき|allegro, euforico
かお|viso
いけ|stagno
えき|stazione
かき|cachi
ここ|qui
きく|ascoltare
あか|rosso
いく|andare
かく|scrivere
こえ|voce
おおきい|grande
かう|comprare
いか|calamaro
おか|collina
くうき|aria
あおい|blu (aggettivo)
いい|buono, bello
きかい|macchina; occasione
けいこ|allenamento
かい|conchiglia; riunione
くき|stelo
おけ|secchio
あかい|rosso (aggettivo)
きおく|memoria
あく|aprirsi
うく|galleggiare
おく|mettere, posare
かかく|prezzo
きかく|progetto
こうこう|liceo
くうこう|aeroporto
かこ|passato
おおい|molti
けいかく|piano, programma
こうかい|rimpianto
さけ|sakè; salmone
すし|sushi
あさ|mattina
うそ|bugia
しお|sale
すき|mi piace
せかい|mondo
いす|sedia
かさ|ombrello
しか|cervo
すいか|anguria
あし|piede, gamba
そこ|lì
おかし|dolcetti
あさい|poco profondo
しかい|presentatore
せき|posto a sedere; tosse
あそこ|laggiù
すこし|un po'
かしこい|intelligente
うすい|sottile, leggero
おいしい|buono, delizioso
しかく|quadrato
くさ|erba
すいそ|idrogeno
いし|pietra
うし|mucca
しあい|partita
けしき|paesaggio
せいかく|carattere (di una persona)
おそい|lento, tardi
さく|fiorire
たこ|polpo
とけい|orologio
した|sotto
くち|bocca
そと|fuori
うた|canzone
きた|nord
たかい|alto; caro
ちかい|vicino
つき|luna
あつい|caldo
いち|uno
あした|domani
たいせつ|importante
ちいさい|piccolo
つくえ|scrivania
なつ|estate
ねこ|gatto
いぬ|cane
にく|carne
なか|dentro
なに|cosa?
きのこ|fungo
さかな|pesce
おかね|soldi
くに|paese
こねこ|gattino
あなた|tu
なす|melanzana
にし|ovest
はな|fiore; naso
ひと|persona
ふね|nave
ほし|stella
へそ|ombelico
はし|ponte; bacchette
ふく|vestiti
ひこうき|aereo
はい|sì
ひとつ|uno (oggetto)
ふたつ|due (oggetti)
はなし|racconto
ほそい|sottile
へた|maldestro, negato
まち|città
みみ|orecchio
むし|insetto
もも|pesca (frutto)
うみ|mare
あたま|testa
なまえ|nome
みせ|negozio
さむい|freddo
くも|nuvola
いま|adesso
あめ|pioggia
もの|oggetto
むすめ|figlia
みなみ|sud
やま|montagna
ゆめ|sogno
ゆき|neve
ふゆ|inverno
へや|stanza
やさい|verdura
ゆうき|coraggio
よむ|leggere
やすみ|vacanza, riposo
おゆ|acqua calda
よこ|di fianco
やすい|economico
そら|cielo
よる|notte
はる|primavera
くるま|automobile
さくら|ciliegio
みどり|verde
とり|uccello
くすり|medicina
ろく|sei
きいろ|giallo
しろ|bianco
くろ|nero
ひる|mezzogiorno
さる|scimmia
ふるい|vecchio (di oggetti)
れきし|storia
わたし|io
ほん|libro
にほん|Giappone
せんせい|insegnante
みかん|mandarino
かわ|fiume
わに|coccodrillo
おんな|donna
てんき|tempo (meteo)
すみません|mi scusi
こんにちは|buongiorno, ciao|konnichiwa
おかあさん|mamma
おとうさん|papà
ほんをよむ|leggere un libro|hon o yomu
みんな|tutti
ふとん|futon
ありがとう|grazie
かぎ|chiave
ごはん|riso cotto; pasto
げんき|in forma, energico
かぜ|vento; raffreddore
みず|acqua
ちず|mappa
かぞく|famiglia
ぎんこう|banca
えいご|inglese
にほんご|lingua giapponese
すごい|fantastico
じかん|tempo, ore
ぞう|elefante
ひざ|ginocchio
りんご|mela
たまご|uovo
でんわ|telefono
まど|finestra
ともだち|amico
からだ|corpo
そば|soba (spaghetti di grano saraceno)
さんぽ|passeggiata
てんぷら|tempura
えんぴつ|matita
ばら|rosa
ぶた|maiale
くび|collo
ゆび|dito
たべもの|cibo
ひだり|sinistra
かばん|borsa
ぴかぴか|scintillante
どうぞ|prego
でぐち|uscita
こんばんは|buonasera|konbanwa
きって|francobollo
がっこう|scuola
しゃしん|foto
おちゃ|tè
きょう|oggi
でんしゃ|treno
じしょ|dizionario
りょこう|viaggio
ちょっと|un po'
ざっし|rivista
しゅくだい|compiti
きゅう|nove
いっしょ|insieme
とうきょう|Tokyo
ひゃく|cento`;
const SMALLY={ゃ:'ya',ゅ:'yu',ょ:'yo'};
function romaji(w){
  let out='';const a=[...w];
  for(let i=0;i<a.length;i++){
    const c=a[i],n=a[i+1];
    if(c==='っ'){const nx=romaji(a.slice(i+1).join('')); out+= nx.startsWith('ch')?'t':(nx[0]||''); continue;}
    if(n&&SMALLY[n]){let b=RO[c]; let y=SMALLY[n]; if(/^(shi|chi|ji)$/.test(b)) out+=b.slice(0,-1)+y.slice(1); else out+=b.slice(0,-1)+y; i++; continue;}
    out+=RO[c]||c;
  }
  return out;
}
const CHAR_GROUP={};GROUPS.forEach((g,i)=>g.chars.forEach(c=>CHAR_GROUP[c]=i));
const WORDS=WORDS_RAW.split('\n').map(l=>{const [k,it,ro]=l.split('|');const chars=[...k];
  return {k,it,ro:ro||romaji(k),chars,g:Math.max(...chars.map(c=>CHAR_GROUP[c]??99))};}).filter(w=>w.g<99);
const WORD_MAP=Object.fromEntries(WORDS.map(w=>[w.k,w]));
const ALL_CHARS=GROUPS.flatMap(g=>g.chars);

/* ============ RECOGNIZER ============ */
/*__RECOG__*/

/* ============ STATE ============ */
const LS_KEY='hiragana-mano-v1';
const DAY=864e5,INTV=[0,1,2,4,8,16];
const today=()=>new Date().toLocaleDateString('sv');
function freshState(){return {v:1,updatedAt:0,unlocked:2,chars:{},words:{},daily:null,history:{},tests:[],
  read:{},settings:{level:'easy',syl:true,hints:'auto',voice:'sys',autoSpeak:true,rate:0.85,mode:'mix'}};}
function migrate(s){const f=freshState();s={...f,...s};s.settings={...f.settings,...(s.settings||{})};if(!['easy','normal'].includes(s.settings.level))s.settings.level='easy';s.settings.mode='mix';s.read=s.read||{};
  // v2: review dates (spaced repetition). Older entries get a due date from their last practice.
  const fix=o=>{Object.values(o||{}).forEach(x=>{if(x.box==null)x.box=x.n?Math.min(3,Math.round(4*x.ok/x.n)):0;if(x.due==null&&x.n){x.box=Math.min(x.box,3);x.due=dayStart(x.last||Date.now())+INTV[x.box]*DAY;}});};
  fix(s.chars);fix(s.words);return s;}
let S=freshState();
try{const raw=localStorage.getItem(LS_KEY); if(raw) S=migrate(JSON.parse(raw));}catch(e){}
let device={pencilOnly:false};
try{device={...device,...JSON.parse(localStorage.getItem(LS_KEY+'-device')||'{}')};}catch(e){}
function saveDevice(){try{localStorage.setItem(LS_KEY+'-device',JSON.stringify(device));}catch(e){}}

let DB=null,UID=null,syncState='local',pushTimer=null,pushing=false,pushAgain=false;
function save(){
  S.updatedAt=Date.now();
  try{localStorage.setItem(LS_KEY,JSON.stringify(S));}catch(e){}
  if(DB){clearTimeout(pushTimer);pushTimer=setTimeout(pushRemote,1500);}
}
async function pushRemote(){
  if(!DB||!UID) return; if(pushing){pushAgain=true;return;}
  pushing=true;
  try{await DB.set({json:JSON.stringify(S),updatedAt:S.updatedAt});syncState='ok';}
  catch(e){syncState='err';}
  pushing=false; if(pushAgain){pushAgain=false;pushRemote();}
}
async function pullRemote(){
  if(!DB||!UID) return;
  try{
    const d=await DB.get();
    if(d){
      if(d&&d.json&&(d.updatedAt||0)>(S.updatedAt||0)){S=migrate(JSON.parse(d.json));try{localStorage.setItem(LS_KEY,JSON.stringify(S));}catch(e){} if(view.name==='home'||view.name==='map') render();}
      else if((S.updatedAt||0)>(d.updatedAt||0)) pushRemote();
    } else if(S.updatedAt) pushRemote();
    syncState='ok';
  }catch(e){syncState='err';}
}
// Remote store: {get():Promise<{json,updatedAt}|null>, set(d)}. Standalone app provides window.HIRA_SYNC (Firebase).
async function initSync(){
  try{
    if(window.HIRA_SYNC){DB=window.HIRA_SYNC;UID='fb';await pullRemote();return;}
    if(!window.claude||!window.claude.use) return;
    const [db,user]=await Promise.all([window.claude.use('db'),window.claude.use('user')]);
    if(!db||!user) return;
    const id=await user.id(); if(!id) return;
    const ref=()=>db.doc('data/users/'+id+'/progress');
    DB={get:async()=>{const s=await ref().get();return s.exists?s.data():null;},set:d=>ref().set(d)};UID=id; await pullRemote();
  }catch(e){}
}
addEventListener('hira-sync-ready',()=>initSync());addEventListener('hira-signed-out',()=>{DB=null;UID=null;});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pullRemote();});

/* ============ SRS ============ */
// Leitner boxes with review dates: box 0..5 -> next review after INTV[box] days
function dayStart(t){const d=new Date(t);d.setHours(0,0,0,0);return d.getTime();}
function schedule(s,ok){const now=Date.now();
  if(ok){if(!s.due||s.due<=now||s.box<1)s.box=Math.min(5,s.box+1);s.due=dayStart(now)+INTV[s.box]*DAY;}
  else{s.box=Math.max(0,s.box-2);s.due=now;}}
function isDue(s){return !!(s&&s.n&&(s.due==null||s.due<=Date.now()));}
function dueList(){const now=Date.now();
  const cs_=unlockedChars().filter(c=>isDue(S.chars[c])).map(c=>[c,S.chars[c].due||0]);
  const ws=availWords().filter(w=>isDue(S.words[w.k])).map(w=>[w.k,S.words[w.k].due||0]);
  return cs_.concat(ws).sort((a,b)=>a[1]-b[1]).map(x=>x[0]);}
function nextDueDay(){let m=Infinity;const now=Date.now();
  unlockedChars().forEach(c=>{const s=S.chars[c];if(s&&s.n&&s.due>now)m=Math.min(m,s.due);});
  availWords().forEach(w=>{const s=S.words[w.k];if(s&&s.n&&s.due>now)m=Math.min(m,s.due);});
  return m===Infinity?null:m;}
function cs(c){return S.chars[c]||(S.chars[c]={n:0,ok:0,box:0,last:0});}
function charResult(c,ok){const s=cs(c);s.n++;if(ok)s.ok++;schedule(s,ok);s.last=Date.now();}
function wordResult(k,ok){const s=S.words[k]||(S.words[k]={n:0,ok:0,last:0,box:0});s.n++;if(ok)s.ok++;schedule(s,ok);s.last=Date.now();}
function unlockedChars(){return GROUPS.slice(0,S.unlocked).flatMap(g=>g.chars);}
function availWords(){return WORDS.filter(w=>w.g<S.unlocked);}
function charWeight(c){const s=S.chars[c];const box=s?s.box:0;let w=(6-box)**2;if(!s||!s.n)w+=8;
  if(CHAR_GROUP[c]===S.unlocked-1&&S.unlocked>2)w+=6; if(isDue(s))w+=12;else if(s&&s.box>=2)w*=.5; if(s&&Date.now()-s.last<90e3)w*=.25; return w;}
function wordWeight(w){const cw=Math.sqrt(w.chars.reduce((a,c)=>a+charWeight(c),0)/w.chars.length)*3;const s=S.words[w.k];
  let x=cw+(s?0:6); if(s&&s.n&&s.ok/s.n<.7)x+=6; if(isDue(s))x+=8; if(s&&Date.now()-s.last<5*60e3)x*=.2; return x;}
function wpick(arr,wf,exclude){const pool=arr.filter(x=>!exclude||!exclude(x));if(!pool.length)return null;
  const ws=pool.map(wf);let t=ws.reduce((a,b)=>a+b,0)*Math.random();for(let i=0;i<pool.length;i++){t-=ws[i];if(t<=0)return pool[i];}return pool[pool.length-1];}
function mastery(c){const s=S.chars[c];return s?s.box/5:0;}
function groupMastery(i){const g=GROUPS[i];return g.chars.reduce((a,c)=>a+mastery(c),0)/g.chars.length;}

function encStrokes(st){return st.map(s=>{const o=[];let lx=-99,ly=-99;s.forEach(([x,y],i)=>{if(i===0||i===s.length-1||Math.hypot(x-lx,y-ly)>=3){o.push(Math.round(x),Math.round(y));lx=x;ly=y;}});return o.join(',');}).join(';');}
function decStrokes(d){if(!d)return [];return d.split(';').map(s=>{const a=s.split(',').map(Number),p=[];for(let i=0;i+1<a.length;i+=2)p.push([a[i],a[i+1]]);return p;});}
function archiveDaily(){
  if(!S.daily||!S.daily.results||!S.daily.results.length)return;
  S.tests=S.tests||[];S.tests.push({date:S.daily.date,results:S.daily.results});
  if(S.tests.length>60)S.tests=S.tests.slice(-60);
  S.tests.forEach((t,i)=>{if(i<S.tests.length-14)t.results.forEach(r=>{delete r.d;});});
}
function recentItems(){const r=new Set();(S.tests||[]).slice(-2).forEach(t=>t.results.forEach(x=>r.add(x.item)));if(S.daily)S.daily.items.forEach(i=>r.add(i));return r;}
function buildDaily(){
  const recent=recentItems();archiveDaily();
  return {date:today(),items:genItems(recent),idx:0,results:[]};
}
function genItems(recent){
  const chars=unlockedChars(),all=availWords(),items=[],used=new Set();
  const fresh=all.filter(w=>!recent.has(w.k)),words=fresh.length>=8?fresh:all;
  for(let i=0;i<3;i++){const c=wpick(chars,charWeight,x=>used.has(x));if(c){used.add(c);items.push(c);}}
  const short=words.filter(w=>w.chars.length<=3),long=words.filter(w=>w.chars.length>=3);
  for(let i=0;i<4;i++){const w=wpick(short.length?short:words,wordWeight,x=>used.has(x.k));if(w){used.add(w.k);items.push(w.k);}}
  for(let i=0;i<3;i++){const w=wpick(long.length?long:words,w=>wordWeight(w)*w.chars.length,x=>used.has(x.k));if(w){used.add(w.k);items.push(w.k);}}
  while(items.length<10){const c=wpick(chars,charWeight,x=>used.has(x))||wpick(chars,charWeight);used.add(c);items.push(c);}
  return items;
}
function reshuffleDaily(){
  const d=S.daily,done=d.items.slice(0,d.idx),ex=new Set([...d.items,...recentItems()]);
  const fresh=genItems(ex);d.items=done.concat(fresh.slice(d.idx));
}
function nextTraining(){
  const mode=S.settings.mode,recent=Q.recent||[];
  if(Q.queue&&Q.queue.length) return Q.queue.shift();
  const useWord=mode==='words'||(mode==='mix'&&Math.random()<.6);
  if(useWord){const w=wpick(availWords(),wordWeight,x=>recent.includes(x.k));if(w)return w.k;}
  return wpick(unlockedChars(),charWeight,x=>recent.includes(x))||wpick(unlockedChars(),charWeight);
}
function streak(){let n=0;const d=new Date();if(!S.history[today()])d.setDate(d.getDate()-1);
  while(S.history[d.toLocaleDateString('sv')]!==undefined){n++;d.setDate(d.getDate()-1);}return n;}

/* ============ SPEECH ============ */
let jaVoice=null;
function loadVoices(){try{const vs=speechSynthesis.getVoices();jaVoice=vs.find(v=>/^ja/i.test(v.lang)&&/kyoko|otoya|o-ren|hattori|google/i.test(v.name))||vs.find(v=>/^ja/i.test(v.lang))||null;}catch(e){}}
if('speechSynthesis' in window){loadVoices();speechSynthesis.onvoiceschanged=loadVoices;}
const SPEAK_FIX={っ:'ちいさい つ',ゃ:'ちいさい や',ゅ:'ちいさい ゆ',ょ:'ちいさい よ',を:'を'};
let TTS=null,DICT=null,SAMPLE=null;
function speak(text){
  if(TTS&&S.settings.voice==='claude'&&!speak.ttsOff){try{if('speechSynthesis' in window)speechSynthesis.cancel();}catch(e){}
    TTS.speak(SPEAK_FIX[text]||text,{language:'ja',rate:Math.max(.7,S.settings.rate)}).catch(e=>{if(e&&(e.code==='not_granted'||e.code==='unavailable')){speak.ttsOff=true;speakSys(text);}});return;}
  speakSys(text);
}
function speakSys(text){
  if(!('speechSynthesis' in window)){toast('Questo browser non ha la sintesi vocale.');return;}
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(SPEAK_FIX[text]||text);u.lang='ja-JP';if(jaVoice)u.voice=jaVoice;u.rate=S.settings.rate;speechSynthesis.speak(u);
    if(!jaVoice&&!speak.warned){speak.warned=true;setTimeout(()=>{loadVoices();if(!jaVoice)toast('Voce giapponese non trovata: vedi Impostazioni.');},800);}
  }catch(e){}
}

/* ============ MICROPHONE + ANSWER CHECK ============ */
const NSR=window.SpeechRecognition||window.webkitSpeechRecognition||null;
const MIC={cb:null,text:'',nativeOff:false,dictOff:{}};
function micKind(lang){if(window.HIRA_WHISPER)return 'rec';if(DICT&&!MIC.dictOff[lang])return 'dict';if(NSR&&!MIC.nativeOff)return 'native';return null;}
function micEnd(texts,err){const cb=MIC.cb;MIC.cb=null;if(!cb)return;if(texts&&texts.length&&texts[0])cb.onDone(texts);else cb.onFail(err||'empty');}
function micStop(){if(REC.stop){REC.stop();return;}if(MIC.rec){try{MIC.rec.stop();}catch(e){}}if(DICT&&DICT.active())DICT.stop().catch(()=>{});}
// must be called synchronously from a click
function micListen(lang,onPartial,onDone,onFail){
  const k=micKind(lang);if(!k){onFail('unavailable');return;}
  if(k==='rec'){recListen(lang,onPartial,onDone,onFail);return;}
  MIC.cb={onPartial,onDone,onFail,lang,kind:k};MIC.text='';
  if(k==='dict'){DICT.start({language:lang}).catch(e=>{const c=(e&&e.code)||'upstream_error';if(c==='unavailable')MIC.dictOff[lang]=true;micEnd(null,c);});return;}
  try{const r=new NSR();MIC.rec=r;r.lang=lang==='ja'?'ja-JP':'it-IT';r.interimResults=true;r.maxAlternatives=4;r.continuous=false;
    let alts=[],lastInterim='';
    r.onresult=e=>{const res=e.results[e.results.length-1];if(res.isFinal){alts=[...res].map(a=>a.transcript.trim()).filter(Boolean);try{r.stop();}catch(_){}}else{lastInterim=res[0].transcript;if(MIC.cb)MIC.cb.onPartial(lastInterim);}};
    r.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed')MIC.nativeOff=true;MIC.rec=null;micEnd(null,e.error==='no-speech'?'empty':e.error==='not-allowed'||e.error==='service-not-allowed'?'not_granted':'upstream_error');};
    r.onend=()=>{MIC.rec=null;micEnd(alts.length?alts:lastInterim?[lastInterim]:[],'empty');};
    r.start();
  }catch(e){MIC.nativeOff=true;micEnd(null,'unavailable');}
}

/* ============ OWN RECORDER + WHISPER (standalone site: works in Home-screen mode and on desktop) ============ */
const REC={diag:{},model:'idle',pct:0,stop:null,level:0,peak:0};
function recUI(fn){try{fn();}catch(e){}}
function recStatus(t){REC.status=t;const el=document.getElementById('mic-status');if(el)el.textContent=t;}
function recLevel(v){REC.level=v;const el=document.getElementById('lvl');if(el)el.style.width=Math.round(Math.min(1,v)*100)+'%';}
function recDiag(){const D=REC.diag,el=document.getElementById('diag');if(!el)return;
  el.textContent=Object.entries(D).map(([k,v])=>k+': '+v).join('\n');}
let ASR=null,asrP=null;const asrFiles={};
function loadASR(){
  if(ASR)return Promise.resolve(ASR);if(asrP)return asrP;
  REC.model='loading';
  asrP=(async()=>{
    const T=await import(new URL('vendor/transformers.min.js',document.baseURI).href);
    T.env.allowLocalModels=false;T.env.useBrowserCache=true;
    T.env.backends.onnx.wasm.wasmPaths=new URL('vendor/',document.baseURI).href;
    T.env.backends.onnx.wasm.numThreads=1;
    const a=await T.pipeline('automatic-speech-recognition','Xenova/whisper-base',{progress_callback:p=>{
      if(p&&p.file&&p.total){asrFiles[p.file]={l:p.loaded||0,t:p.total};let l=0,t=0;for(const f in asrFiles){l+=asrFiles[f].l;t+=asrFiles[f].t;}REC.pct=t?Math.round(100*l/t):0;
        const el=document.getElementById('model-status');if(el)el.textContent='Modello vocale: scarico '+REC.pct+'% (solo la prima volta)';}}});
    ASR=a;REC.model='ready';const el=document.getElementById('model-status');if(el)el.textContent='Modello vocale pronto';return a;
  })();
  asrP.catch(e=>{REC.model='error';REC.modelErr=(e&&e.message)||String(e);asrP=null;const el=document.getElementById('model-status');if(el)el.textContent='Modello vocale non caricato: '+REC.modelErr;});
  return asrP;
}
function resample(f32,from,to){if(from===to)return f32;const r=from/to,n=Math.floor(f32.length/r),o=new Float32Array(n);
  for(let i=0;i<n;i++){const a=Math.floor(i*r),b=Math.min(f32.length,Math.floor((i+1)*r));let s=0;for(let j=a;j<b;j++)s+=f32[j];o[i]=s/Math.max(1,b-a);}return o;}
const HALLU=/ご視聴|ありがとうございました|チャンネル登録|thank you|thanks for watching|sottotitoli|amara\.org|subs by|字幕/i;
function recListen(lang,onPartial,onDone,onFail){
  const D=REC.diag={app:'standalone='+!!(navigator.standalone||matchMedia('(display-mode: standalone)').matches),ua:navigator.userAgent.slice(0,90),lingua:lang};
  REC.stop=null;REC.peak=0;
  const fail=(code,det)=>{D.errore=code+(det?' / '+det:'');recDiag();REC.stop=null;onFail(code,det);};
  let AC;try{AC=new (window.AudioContext||window.webkitAudioContext)();if(AC.resume)AC.resume();}catch(e){fail('audio',e.message);return;}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){fail('nomic','getUserMedia assente');return;}
  loadASR().catch(()=>{});
  navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}}).then(stream=>{
    const tr=stream.getAudioTracks()[0];D.microfono=(tr&&tr.label)||'?';D.rate=AC.sampleRate;
    const src=AC.createMediaStreamSource(stream),sp=AC.createScriptProcessor(4096,1,1),mute=AC.createGain();mute.gain.value=0;
    src.connect(sp);sp.connect(mute);mute.connect(AC.destination);
    const chunks=[];let t0=performance.now(),floor=null,nf=0,speech=false,speechIdx=0,lastLoud=0,done=false,rmsMax=0;
    const end=async why=>{
      if(done)return;done=true;REC.stop=null;
      try{sp.disconnect();src.disconnect();mute.disconnect();}catch(e){}
      try{stream.getTracks().forEach(t=>t.stop());}catch(e){}
      const rate=AC.sampleRate;try{AC.close();}catch(e){}
      recLevel(0);D.fine=why;D.picco=rmsMax.toFixed(3);D.durata=((performance.now()-t0)/1000).toFixed(1)+'s';
      if(!speech){fail('silence','picco '+rmsMax.toFixed(3));return;}
      const from=Math.max(0,speechIdx-4),all=new Float32Array(chunks.slice(from).reduce((a,c)=>a+c.length,0));let o=0;for(const c of chunks.slice(from)){all.set(c,o);o+=c.length;}
      const pcm=resample(all,rate,16000);D.campioni=pcm.length;
      recStatus(ASR?'Elaboro…':'Elaboro… (scarico il modello vocale, solo la prima volta)');
      try{
        const a=await loadASR();const t1=performance.now();
        const out=await a(pcm,{language:lang==='ja'?'japanese':'italian',task:'transcribe'});
        let text=((out&&out.text)||'').trim();D.trascrizione=JSON.stringify(text);D.tempo=((performance.now()-t1)/1000).toFixed(1)+'s';
        if(/^[(（\[].*[)）\]]$/.test(text)||/^[♪♫\s]+$/.test(text)){D.nota='scartata (rumore, non parlato)';text='';}
        else if(pcm.length<16000*1.6&&HALLU.test(text)){D.nota='scartata (frase tipica di Whisper su audio breve)';text='';}
        recDiag();REC.stop=null;
        if(!text){onFail('unclear','');return;}
        onDone([text]);
      }catch(e){fail('asr',(e&&e.message)||String(e));}
    };
    REC.stop=()=>end('stop');
    sp.onaudioprocess=e=>{if(done)return;const d=e.inputBuffer.getChannelData(0);chunks.push(new Float32Array(d));
      let sum=0;for(let i=0;i<d.length;i++)sum+=d[i]*d[i];const rms=Math.sqrt(sum/d.length);if(rms>rmsMax)rmsMax=rms;recLevel(rms*7);
      const now=performance.now()-t0;
      if(now<400){floor=((floor||0)*nf+rms)/(nf+1);nf++;}
      const thr=Math.max(0.012,(floor||0)*3);
      if(rms>thr){if(!speech){speech=true;speechIdx=chunks.length-1;recStatus('Ti sento…');}lastLoud=now;}
      if(speech&&now-lastLoud>900)end('silenzio dopo la voce');
      else if(!speech&&now>6000)end('nessuna voce');
      else if(now>9000)end('tempo massimo');
    };
    recStatus('Parla ora');
  }).catch(err=>{try{AC.close();}catch(e){}fail(err&&err.name==='NotAllowedError'?'not_granted':err&&err.name==='NotFoundError'?'nomic':'audio',(err&&err.name)+': '+(err&&err.message));});
}
function wireDictation(d){
  d.onPartial(e=>{if(MIC.cb&&MIC.cb.kind==='dict')MIC.cb.onPartial(e.text);});
  d.onFinal(e=>{if(!MIC.cb||MIC.cb.kind!=='dict')return;MIC.text+=e.text;if(MIC.text.trim())d.stop().catch(()=>{}).then(()=>micEnd([MIC.text.trim()]));});
  d.onState(e=>{if(e.state==='idle'&&MIC.cb&&MIC.cb.kind==='dict'){if(e.reason==='unavailable')MIC.dictOff[MIC.cb.lang]=true;micEnd(MIC.text.trim()?[MIC.text.trim()]:null,e.reason==='stopped'||e.reason==='viewer_stopped'?'empty':e.reason);}});
}
function initCaps(){
  try{if(!window.claude||!window.claude.use)return;
    window.claude.use('dictation').then(d=>{if(d){DICT=d;wireDictation(d);if(view.name==='study')render();}}).catch(()=>{});
    window.claude.use('tts').then(t=>{if(t){TTS=t;if(view.name==='settings')render();}}).catch(()=>{});
    window.claude.use('sample').then(x=>{if(x)SAMPLE=x;}).catch(()=>{});
  }catch(e){}
}
function toHira(t){return t.normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));}
function cleanJa(t){return toHira(t).toLowerCase().replace(/[\s。、．，,.!！?？「」・ー〜~'"]/g,'');}
const RO_ALT=[[/shi/g,'si'],[/chi/g,'ti'],[/tsu/g,'tu'],[/fu/g,'hu'],[/ji/g,'zi'],[/sha/g,'sya'],[/shu/g,'syu'],[/sho/g,'syo'],[/cha/g,'tya'],[/chu/g,'tyu'],[/cho/g,'tyo'],[/ja/g,'zya'],[/ju/g,'zyu'],[/jo/g,'zyo'],[/wo/g,'o'],[/dzu/g,'zu'],[/du/g,'zu'],[/di/g,'zi'],[/n'/g,'n'],[/-/g,''],[/\s/g,'']];
function roNorm(r){r=r.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');RO_ALT.forEach(([a,b])=>r=r.replace(a,b));return r.replace(/(.)\1+/g,'$1');}
function kanaRo(k){try{return romaji(k);}catch(e){return '';}}
// 'ok' | 'no' | 'unsure' (heard text has kanji or similar: needs a smarter judge)
const KANJI={};`あい|愛|藍
あお|青
いえ|家
あう|会う|合う|会|合
いう|言う|言
あき|秋
こい|鯉|恋
かお|顔
いけ|池
えき|駅
かき|柿|牡蠣
ここ|此処
きく|聞く|聴く|菊|聞
あか|赤
いく|行く|行|生く
かく|書く|描く|書
こえ|声
おおきい|大きい
かう|買う|買|飼う
いか|烏賊|以下
おか|丘|岡
くうき|空気
あおい|青い
いい|良い|好い
きかい|機械|機会
けいこ|稽古
かい|貝|会|回
くき|茎
おけ|桶
あかい|赤い
きおく|記憶
あく|開く|空く
うく|浮く
おく|置く|奥|億
かかく|価格
きかく|企画
こうこう|高校|孝行
くうこう|空港
かこ|過去
おおい|多い
けいかく|計画
こうかい|後悔|公開|航海
さけ|酒|鮭
すし|寿司|鮨
あさ|朝|麻
うそ|嘘
しお|塩|潮
すき|好き
せかい|世界
いす|椅子
かさ|傘
しか|鹿
すいか|西瓜
あし|足|脚
そこ|其処|底
おかし|お菓子|菓子
あさい|浅い
しかい|司会|視界
せき|席|咳
すこし|少し
かしこい|賢い
うすい|薄い
おいしい|美味しい
しかく|四角|資格
くさ|草
すいそ|水素
いし|石|医師|意志
うし|牛
しあい|試合
けしき|景色
せいかく|性格|正確
おそい|遅い
さく|咲く
たこ|蛸|凧
とけい|時計
した|下|舌
くち|口
そと|外
うた|歌
きた|北
たかい|高い
ちかい|近い
つき|月
あつい|暑い|熱い|厚い
いち|一|1
あした|明日
たいせつ|大切
ちいさい|小さい
つくえ|机
なつ|夏
ねこ|猫
いぬ|犬
にく|肉
なか|中
なに|何
きのこ|茸
さかな|魚
おかね|お金|金
くに|国
こねこ|子猫
あなた|貴方
なす|茄子
にし|西
はな|花|鼻
ひと|人
ふね|船|舟
ほし|星
へそ|臍
はし|橋|箸|端
ふく|服|吹く|福
ひこうき|飛行機
ひとつ|一つ|1つ
ふたつ|二つ|2つ
はなし|話
ほそい|細い
へた|下手
まち|町|街
みみ|耳
むし|虫
もも|桃
うみ|海
あたま|頭
なまえ|名前
みせ|店
さむい|寒い
くも|雲|蜘蛛
いま|今|居間
あめ|雨|飴
もの|物|者
むすめ|娘
みなみ|南
やま|山
ゆめ|夢
ゆき|雪
ふゆ|冬
へや|部屋
やさい|野菜
ゆうき|勇気
よむ|読む
やすみ|休み
おゆ|お湯|湯
よこ|横
やすい|安い
そら|空
よる|夜
はる|春
くるま|車
さくら|桜
みどり|緑
とり|鳥
くすり|薬
ろく|六|6
きいろ|黄色
しろ|白|城
くろ|黒
ひる|昼
さる|猿
ふるい|古い
れきし|歴史
わたし|私
ほん|本
にほん|日本
せんせい|先生
みかん|蜜柑
かわ|川|河|皮
わに|鰐
おんな|女
てんき|天気
こんにちは|今日は
おかあさん|お母さん
おとうさん|お父さん
ほんをよむ|本を読む
みんな|皆
ふとん|布団
ありがとう|有難う
かぎ|鍵
ごはん|ご飯|御飯
げんき|元気
かぜ|風|風邪
みず|水
ちず|地図
かぞく|家族
ぎんこう|銀行
えいご|英語
にほんご|日本語
すごい|凄い
じかん|時間
ぞう|象
ひざ|膝
りんご|林檎
たまご|卵|玉子
でんわ|電話
まど|窓
ともだち|友達
からだ|体
そば|蕎麦|側
さんぽ|散歩
てんぷら|天ぷら|天麩羅
えんぴつ|鉛筆
ばら|薔薇
ぶた|豚
くび|首
ゆび|指
たべもの|食べ物
ひだり|左
かばん|鞄
でぐち|出口
こんばんは|今晩は
きって|切手
がっこう|学校
しゃしん|写真
おちゃ|お茶|茶
きょう|今日
でんしゃ|電車
じしょ|辞書
りょこう|旅行
ざっし|雑誌
しゅくだい|宿題
きゅう|九|9
いっしょ|一緒
とうきょう|東京
ひゃく|百|100`.split('\n').forEach(l=>{const [k,...f]=l.split('|');KANJI[k]=f;});
function judgeReading(heards,item){
  const tgt=cleanJa(item),tr=roNorm(kanaRo(item)||RO[item]||'');let unsure=false;
  for(const h of heards){const c=cleanJa(h);if(!c)continue;
    if(c===tgt||(tgt.length===1&&c[0]===tgt&&/^(.)\1*$/.test(c)))return 'ok';
    if((KANJI[item]||[]).some(f=>cleanJa(f)===c||cleanJa(f).replace(/^お/,'')===c.replace(/^お/,'')))return 'ok';
    if(/^[a-z' -]+$/.test(c)){if(roNorm(c)===tr)return 'ok';continue;}
    if(/^[ぁ-ゖ]+$/.test(c)){const rc=roNorm(kanaRo(c));if(rc===tr)return 'ok';
      if(tgt.length>=2&&c.includes(tgt))return 'ok';
      if(tr.length>=4&&lev(rc,tr)<=1)return 'ok';if(tr.length>=7&&lev(rc,tr)<=2)return 'ok';continue;}
    unsure=true;}
  return unsure?'unsure':'no';
}
function itNorm(t){return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z\s']/g,' ').replace(/\b(il|lo|la|i|gli|le|un|uno|una|di|del|della|dei|delle)\b/g,' ').replace(/\b[lu]n?'/g,'').replace(/\s+/g,' ').trim();}
function lev(a,b){const m=a.length,n=b.length;if(!m)return n;if(!n)return m;let p=[...Array(n+1).keys()];for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c;}return p[n];}
function itAlts(it){return it.replace(/\([^)]*\)/g,'').split(/[,;/]| o /).map(itNorm).filter(Boolean);}
function judgeMeaning(heards,it){const alts=itAlts(it);
  for(const h of heards){const x=itNorm(h);if(!x)continue;
    for(const a of alts){if(x===a)return 'ok';const d=lev(x,a);if(d/Math.max(x.length,a.length)<=.25)return 'ok';
      if(a.length>=4&&(` ${x} `).includes(` ${a} `))return 'ok';if(x.length>=4&&(` ${a} `).includes(` ${x} `))return 'ok';}}
  return 'unsure';
}
async function askJudge(kind,item,heard){
  if(!SAMPLE)return null;const w=WORD_MAP[item];
  const q=kind==='read'
    ?`App per imparare l'hiragana. Parola o kana da leggere: ${item} (lettura: ${w?w.ro:RO[item]}). Il riconoscimento vocale giapponese ha trascritto: "${heard}". La trascrizione corrisponde alla pronuncia giusta di ${item}? Va bene anche se è scritta in kanji o katakana con la stessa lettura. Rispondi solo con JSON: {"ok": true|false}`
    :`App per imparare il giapponese. Parola: ${item} (${w?w.ro:''}), significato: "${w?w.it:''}". L'utente ha detto in italiano: "${heard}". Il significato è giusto (anche sinonimo o traduzione vicina)? Rispondi solo con JSON: {"ok": true|false, "nota": "max 12 parole in italiano, solo se utile"}`;
  try{const r=await Promise.race([SAMPLE.json(q,{modelTier:'quick'}),new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),9000))]);return r&&typeof r.ok==='boolean'?r:null;}catch(e){return null;}
}

/* ============ UI HELPERS ============ */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const IC={
 shuffle:'<svg viewBox="0 0 24 24"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>',
 back:'<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
 sound:'<svg viewBox="0 0 24 24"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M18.5 5.5a9 9 0 010 13"/></svg>',
 undo:'<svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/></svg>',
 clear:'<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>',
 eye:'<svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
 gear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
 check:'<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
 close:'<svg viewBox="0 0 24 24"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>',
 prev:'<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/></svg>',
 next:'<svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
 mic:'<svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0"/><path d="M12 17v4"/></svg>',
 stop:'<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
};
let toastT=null;
function toast(msg){let t=$('.toast');if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.appendChild(t);}
  t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2600);}
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim();}

/* ============ WRITING PAD ============ */
class Pad{
  constructor(canvas){
    this.c=canvas;this.ctx=canvas.getContext('2d');this.strokes=[];this.cur=null;this.active=null;this.activeType=null;
    this.ghost=null;this.fb=null;this.locked=false;this.anim=null;this.size=300;this.onStroke=null;this.cols=1;this.cellFb=null;this.ghostWord=null;
    const pt=e=>{const r=this.c.getBoundingClientRect();return [(e.clientX-r.left)/r.height*109,(e.clientY-r.top)/r.height*109];};
    canvas.addEventListener('pointerdown',e=>{
      if(this.locked)return;
      if(e.pointerType==='touch'&&(device.pencilOnly||this.activeType==='pen'))return;
      if(e.pointerType==='pen'&&!device.pencilOnly&&!device.penSeen){device.penSeen=true;device.pencilOnly=true;saveDevice();toast('Apple Pencil rilevata: le dita sul foglio vengono ignorate (modificabile in Impostazioni).');}
      if(this.active!==null){ if(e.pointerType==='pen'&&this.activeType==='touch'){this.strokes.pop();this.active=null;} else return; }
      e.preventDefault();this.stopAnim();
      if(this.fb){this.fb=null;}
      if(this.cellFb){this.cellFb=this.cellFb.map(c=>c&&c.state==='ok'?c:null);}
      this.active=e.pointerId;this.activeType=e.pointerType;try{canvas.setPointerCapture(e.pointerId);}catch(_){}
      this.cur=[pt(e)];this.strokes.push(this.cur);this.draw();
    });
    canvas.addEventListener('pointermove',e=>{
      if(e.pointerId!==this.active)return;e.preventDefault();
      const evs=e.getCoalescedEvents?e.getCoalescedEvents():[e];for(const ev of (evs.length?evs:[e]))this.cur.push(pt(ev));this.draw();
    });
    const end=e=>{if(e.pointerId!==this.active)return;this.active=null;this.activeType=null;this.cur=null;this.draw();this.onStroke&&this.onStroke();};
    canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
    ['touchstart','touchmove'].forEach(t=>canvas.addEventListener(t,e=>e.preventDefault(),{passive:false}));
  }
  resize(size){const dpr=window.devicePixelRatio||1;this.size=size;this.c.style.width=(size*this.cols)+'px';this.c.style.height=size+'px';
    this.c.width=Math.round(size*this.cols*dpr);this.c.height=Math.round(size*dpr);this.draw();}
  clear(){this.strokes=[];this.fb=null;this.cellFb=null;this.stopAnim();this.draw();}
  undo(){this.strokes.pop();this.fb=null;this.draw();}
  stopAnim(){if(this.anim){cancelAnimationFrame(this.anim.raf);this.anim=null;}}
  tf(){const k=this.c.height/109;this.ctx.setTransform(k,0,0,k,0,0);}
  guides(){const x=this.ctx;x.save();x.strokeStyle=css('--grid');x.lineWidth=.5;x.setLineDash([2,2.2]);
    x.beginPath();for(let c=0;c<this.cols;c++){const o=c*109;x.moveTo(o+54.5,4);x.lineTo(o+54.5,105);x.moveTo(o+4,54.5);x.lineTo(o+105,54.5);}x.stroke();
    if(this.cols>1){x.setLineDash([]);x.lineWidth=.9;x.beginPath();for(let c=1;c<this.cols;c++){x.moveTo(c*109,0);x.lineTo(c*109,109);}x.stroke();}
    x.restore();}
  cellOf(s){let cx=0;for(const p of s)cx+=p[0];cx/=s.length;return Math.max(0,Math.min(this.cols-1,Math.floor(cx/109)));}
  drawWord(){const x=this.ctx;
    if(this.ghostWord){[...this.ghostWord].forEach((ch,c)=>{const t=TPL[ch];if(!t)return;x.save();x.translate(c*109,0);for(let i=0;i<t.d.length;i++)this.tplStroke(ch,i,css('--ghost'),5);for(let i=0;i<t.d.length;i++)this.num(ch,i,css('--ghost'));x.restore();});}
    const cf=this.cellFb||[];
    cf.forEach((f,c)=>{if(!f||!(f.showTpl||(f.hl&&f.hl.length)))return;const t=TPL[f.ch];const hl=f.hl||[];x.save();x.translate(c*109,0);
      for(let i=0;i<t.d.length;i++)this.tplStroke(f.ch,i,hl.includes(i)?css('--tip'):css('--ghost'),hl.includes(i)?6:5);
      for(let i=0;i<t.d.length;i++)if(f.showTpl||hl.includes(i))this.num(f.ch,i,hl.includes(i)?css('--tip'):css('--accent'));x.restore();});
    this.strokes.forEach(s=>{const f=cf[this.cellOf(s)];this.ink(s,f&&f.state==='ok'?css('--ok'):f&&f.state==='bad'?css('--bad'):css('--ink'));});
  }
  tplStroke(ch,i,color,w,dash){const t=TPL[ch];if(!t)return;const x=this.ctx;x.save();x.strokeStyle=color;x.lineWidth=w;x.lineCap='round';x.lineJoin='round';
    if(dash)x.setLineDash(dash.arr),x.lineDashOffset=dash.off;x.stroke(new Path2D(t.d[i]));x.restore();}
  num(ch,i,color){const t=TPL[ch];const p=t.raw[i][0],q=t.raw[i][Math.min(4,t.raw[i].length-1)];const x=this.ctx;
    let dx=p[0]-q[0],dy=p[1]-q[1];const L=Math.hypot(dx,dy)||1;const X=p[0]+dx/L*6,Y=p[1]+dy/L*6;
    x.save();x.fillStyle=color;x.beginPath();x.arc(X,Y,4.2,0,7);x.fill();x.fillStyle=css('--surface');x.font='600 5.6px Inter, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(String(i+1),X,Y+.3);x.restore();}
  ink(s,color){const x=this.ctx;if(!s.length)return;x.save();x.strokeStyle=color;x.fillStyle=color;x.lineWidth=4.6;x.lineCap='round';x.lineJoin='round';
    if(s.length===1){x.beginPath();x.arc(s[0][0],s[0][1],2.3,0,7);x.fill();}
    else{x.beginPath();x.moveTo(s[0][0],s[0][1]);for(let i=1;i<s.length-1;i++){const mx=(s[i][0]+s[i+1][0])/2,my=(s[i][1]+s[i+1][1])/2;x.quadraticCurveTo(s[i][0],s[i][1],mx,my);}
      const l=s[s.length-1];x.lineTo(l[0],l[1]);x.stroke();}
    x.restore();}
  draw(){
    const x=this.ctx;x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,this.c.width,this.c.height);this.tf();this.guides();
    if(this.cols>1){this.drawWord();return;}
    if(this.ghost&&TPL[this.ghost]&&!this.anim){const t=TPL[this.ghost];for(let i=0;i<t.d.length;i++)this.tplStroke(this.ghost,i,css('--ghost'),5);
      for(let i=0;i<t.d.length;i++)if(i>=this.strokes.length)this.num(this.ghost,i,css('--ghost'));}
    if(this.fb){const ch=this.fb.ch,t=TPL[ch];
      if(this.fb.showTpl||this.fb.hl){const hl=this.fb.hl||[];for(let i=0;i<t.d.length;i++)this.tplStroke(ch,i,hl.includes(i)?css('--tip'):css('--ghost'),hl.includes(i)?6:5);
        for(let i=0;i<t.d.length;i++)if(this.fb.showTpl||hl.includes(i))this.num(ch,i,hl.includes(i)?css('--tip'):css('--accent'));
}
      this.ctx.globalAlpha=this.fb.hl&&this.fb.hl.length?0.75:1;
      this.strokes.forEach((s,i)=>this.ink(s,this.fb.bad&&this.fb.bad.includes(i)?css('--bad'):(this.fb.ok?css('--ok'):css('--ink'))));
      this.ctx.globalAlpha=1;
      if(this.fb.hl&&this.fb.hl.length){for(const i of this.fb.hl){this.tplStroke(ch,i,css('--tip'),3.2);const r=t.raw[i];
          if(r.length>=4){const e=r[r.length-1],q=r[Math.max(0,r.length-6)];const a=Math.atan2(e[1]-q[1],e[0]-q[0]);const x=this.ctx;
            x.save();x.fillStyle=css('--tip');x.beginPath();x.moveTo(e[0]+Math.cos(a)*6,e[1]+Math.sin(a)*6);x.lineTo(e[0]+Math.cos(a+2.5)*6,e[1]+Math.sin(a+2.5)*6);x.lineTo(e[0]+Math.cos(a-2.5)*6,e[1]+Math.sin(a-2.5)*6);x.closePath();x.fill();x.restore();}
          this.num(ch,i,css('--tip'));}}
    } else this.strokes.forEach(s=>this.ink(s,css('--ink')));
    if(this.anim){const a=this.anim,t=TPL[a.ch];
      for(let i=0;i<t.d.length;i++){
        if(i<a.i){this.tplStroke(a.ch,i,css('--accent'),5);this.num(a.ch,i,css('--accent'));}
        else if(i===a.i){const L=a.lens[i];this.tplStroke(a.ch,i,css('--accent'),5,{arr:[L,L+2],off:L*(1-a.t)});this.num(a.ch,i,css('--accent'));}
      }}
  }
  animate(ch,done){
    this.stopAnim();this.strokes=[];this.fb=null;const t=TPL[ch];if(!t)return;
    const lens=t.raw.map(pathLen);const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.anim={ch,i:0,t:0,lens,raf:0};let start=null;const per=i=>Math.max(380,lens[i]*9);
    const step=ts=>{if(!this.anim)return;if(start===null)start=ts;const a=this.anim;let el=ts-start;
      if(reduce){a.i=t.d.length;}else{a.i=0;while(a.i<t.d.length&&el>per(a.i)+180){el-=per(a.i)+180;a.i++;}a.t=Math.min(1,el/per(Math.min(a.i,t.d.length-1)));}
      this.draw();
      if(a.i>=t.d.length){this.anim.raf=0;setTimeout(()=>{if(this.anim&&this.anim.ch===ch){this.anim=null;this.draw();done&&done();}},reduce?1500:900);return;}
      a.raf=requestAnimationFrame(step);};
    this.anim.raf=requestAnimationFrame(step);
  }
}
function fitPad(pad,wrap,reserve){
  const w=wrap.clientWidth||300;const top=pad.c.getBoundingClientRect().top+window.scrollY;
  const availH=window.innerHeight-Math.max(0,top-window.scrollY)-reserve;
  const ps=device.padSize||'l';
  if(pad.cols>1){const maxCell={l:300,m:210,s:140}[ps];let cell=Math.min(Math.floor((w-4)/pad.cols),maxCell,Math.max(availH,120));pad.resize(Math.max(56,cell));return;}
  const max={l:640,m:420,s:280}[ps];let size=Math.min(w,max,Math.max(availH,220));size=Math.max(200,Math.floor(size));pad.resize(size);
}
function reasonText(r,ch){
  switch(r.reason){
    case 'count':return `Tratti: ${ch} ne ha ${r.expected}, tu ne hai fatti ${r.got}.`;
    case 'direction':return `Il tratto ${r.strokes.map(i=>i+1).join(' e ')} va nella direzione opposta.`;
    case 'order':return 'La forma c’è, ma l’ordine dei tratti è sbagliato.';
    case 'similar':return `Somiglia di più a ${r.similar} (${RO[r.similar]}).`;
    default:return r.strokes&&r.strokes.length?`Forma da rivedere: tratto ${r.strokes.map(i=>i+1).join(', ')}.`:'Forma da rivedere.';
  }
}
function badStrokes(r){if(r.reason==='direction'||r.reason==='shape')return r.strokes||[];if(r.reason==='order')return r.perm.map((v,i)=>v!==i?i:-1).filter(i=>i>=0);return [];}

