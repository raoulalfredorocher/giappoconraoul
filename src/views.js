/* ============ VIEWS ============ */
const TABLE_BASE=[['あ','い','う','え','お'],['か','き','く','け','こ'],['さ','し','す','せ','そ'],['た','ち','つ','て','と'],['な','に','ぬ','ね','の'],
 ['は','ひ','ふ','へ','ほ'],['ま','み','む','め','も'],['や','','ゆ','','よ'],['ら','り','る','れ','ろ'],['わ','','','','を'],['ん','','','','']];
const TABLE_DAKU=[['が','ぎ','ぐ','げ','ご'],['ざ','じ','ず','ぜ','ぞ'],['だ','ぢ','づ','で','ど'],['ば','び','ぶ','べ','ぼ'],['ぱ','ぴ','ぷ','ぺ','ぽ']];
const TABLE_COMBO=[...'きしちにひみりぎじびぴ'].map(c=>['ゃ','ゅ','ょ'].map(s=>c+s));
const ORDER=[...TABLE_BASE.flat(),...TABLE_DAKU.flat(),'っ','ゃ','ゅ','ょ'].filter(Boolean);

let view={name:'home'};let Q=null;let pad=null;
function go(name,args={}){if(pad)pad.stopAnim();view={name,...args};render();window.scrollTo(0,0);}
function render(){const app=$('#app');
  ({home:renderHome,study:renderStudy,review:renderReview,quiz:renderQuiz,results:renderResults,alpha:renderAlpha,kana:renderKana,settings:renderSettings}[view.name]||renderHome)(app);}
function lastGroupLabel(){return GROUPS[S.unlocked-1].chars.slice(0,5).join(' ');}

function renderHome(app){
  const done=S.history[today()]!==undefined;const d=S.daily&&S.daily.date===today()?S.daily:null;const st=streak();
  const dueN=dueList().length,nx=nextDueDay();const nd=nx?(()=>{const g=Math.round((nx-dayStart(Date.now()))/DAY);return g<=1?'domani':`fra ${g} giorni`;})():'';
  app.innerHTML=`<div class="narrow">
  <div class="home-head"><span class="glyph" aria-hidden="true">ひ</span><h1 style="flex:1">Hiragana a mano</h1>
    <button class="icon-btn plain" id="b-set" aria-label="Impostazioni">${IC.gear}</button></div>
  <div class="choices">
    <button class="choice main" id="b-daily"><span class="k" style="font-family:var(--f-ui);font-size:1.5rem;font-weight:700">10</span><span style="flex:1;min-width:0"><b>Test di oggi</b>
      <span class="sub">${done?`Fatto: ${S.history[today()]}/10. Puoi rifarlo.`:d&&d.idx>0?`Riprendi da ${d.idx+1}/10`:'10 domande, dai kana alle parole'}</span></span>${IC.next}</button>
    <button class="choice" id="b-rip"><span class="k" style="font-family:var(--f-ui);font-size:1.5rem;font-weight:700">${dueN}</span><span style="flex:1;min-width:0"><b>Ripasso</b>
      <span class="sub">${dueN?`${dueN===1?'1 cosa da ripassare':dueN+' cose da ripassare'} oggi`:nd?`Niente per oggi. Il prossimo ${nd}`:'Si riempie con i kana e le parole che fai'}</span></span>${IC.next}</button>
    <button class="choice" id="b-study"><span class="k">${IC.mic}</span><span style="flex:1;min-width:0"><b>Studio e ascolto</b>
      <span class="sub">Leggi ad alta voce e di' cosa significa</span></span>${IC.next}</button>
    <button class="choice" id="b-train"><span class="k" style="font-family:var(--f-ui);font-size:1.9rem">∞</span><span style="flex:1;min-width:0"><b>Allenamento</b>
      <span class="sub">Kana e parole senza fine, finché esci</span></span>${IC.next}</button>
    <button class="choice" id="b-alpha"><span class="k">あ</span><span style="flex:1;min-width:0"><b>Alfabeto</b>
      <span class="sub">Tutti gli hiragana, con ordine dei tratti e pronuncia</span></span>${IC.next}</button>
  </div>
  <div style="text-align:center;margin-top:14px"><button class="btn" id="b-hist">Storico dei test</button></div>
  <div class="home-foot"><span style="opacity:.45">v__VER__</span> · Nei test: righe da あ a ${GROUPS[S.unlocked-1].chars[0]}${st?` · serie di ${st} ${st===1?'giorno':'giorni'}`:''}</div>
  </div>`;
  $('#b-set').onclick=()=>go('settings');
  $('#b-daily').onclick=()=>startQuiz('daily');
  $('#b-train').onclick=()=>startQuiz('training');
  $('#b-rip').onclick=()=>{const l=dueList().slice(0,20);if(!l.length){toast(nd?`Niente da ripassare oggi. Il prossimo ripasso: ${nd}.`:'Fai qualche test: quello che scrivi torna qui nei giorni giusti.');return;}
    Q={mode:'rip',list:l,li:0,stats:{ok:0,n:0},recent:[],again:new Set()};loadItem(l[0]);go('quiz');if(S.settings.autoSpeak)speak(Q.item);};
  $('#b-study').onclick=()=>startStudy();
  $('#b-alpha').onclick=()=>go('alpha');
  $('#b-hist').onclick=()=>go('review');
}

/* ---- quiz ---- */
function wordsSection(){
  const gs=[];for(let g=S.unlocked-1;g>=0;g--){const ws=WORDS.filter(w=>w.g===g);if(ws.length)gs.push([g,ws]);}
  if(!gs.length)return '';
  return `<div class="sec"><h2>Parole</h2><span class="muted small">si sbloccano con le righe · tocca per scriverle</span></div>
  ${gs.map(([g,ws],n)=>{const list=ws.map(w=>w.k).join(',');return `<div class="wgroup"><div class="row" style="margin:14px 0 6px"><b>Con ${esc(GROUPS[g].name.replace('Riga ','la riga '))}</b>
      ${n===0&&S.unlocked>2?'<span class="badge ok">Nuove</span>':''}<span class="spacer"></span><button class="btn" style="min-height:38px" data-w="1" data-all="1" data-list="${list}" data-i="0">Scrivile tutte</button></div>
    <div class="list">${ws.map((w,i)=>`<div class="li"><button class="wbtn" data-w="1" data-list="${list}" data-i="${i}"><span class="k">${w.k}</span><span class="t">${esc(w.it)}<span class="muted small"> · ${esc(w.ro)}</span></span></button><button class="icon-btn plain" data-say="${w.k}" aria-label="Ascolta ${w.k}">${IC.sound}</button></div>`).join('')}</div></div>`;}).join('')}`;
}
function startPractice(list,i){
  Q={mode:'practice',list,li:i,stats:{ok:0,n:0},recent:[]};loadItem(list[i]);go('quiz');if(S.settings.autoSpeak)speak(Q.item);
}
function startQuiz(mode,queue){
  if(mode==='daily'){if(!S.daily||S.daily.date!==today()||S.daily.idx>=S.daily.items.length){S.daily=buildDaily();save();}}
  Q={mode,stats:{ok:0,n:0},recent:[],queue:queue?queue.slice():null};
  loadItem(mode==='daily'?S.daily.items[S.daily.idx]:nextTraining());
  go('quiz');if(S.settings.autoSpeak)speak(Q.item);
}
function loadItem(item){
  Q.item=item;Q.showHint=false;Q.word=WORD_MAP[item]||null;Q.cells=[...item].map(c=>({ch:c,st:'todo',miss:false}));Q.ci=0;Q.phase='draw';Q.msg=null;Q.tips=[];Q.lastStrokes=null;Q.cellFb=null;Q.wordStrokes=null;Q.ghost=false;Q.draw=[];
  if(Q.mode==='training'){Q.recent.push(item);if(Q.recent.length>6)Q.recent.shift();}
}
function renderQuiz(app){
  const daily=Q.mode==='daily',rip=Q.mode==='rip',prac=Q.mode==='practice'||rip,w=Q.word,item=Q.item;
  const known=c=>{const x=S.chars[c];return x&&x.box>=3;};
  const hintAll=S.settings.hints==='always'||Q.showHint||Q.phase==='done'||[...item].some(c=>!known(c));
  const tog=Q.together=!!(S.settings.together&&w&&Q.cells.length>1);const PS={l:'Grande',m:'Medio',s:'Piccolo'};
  const it=w?esc(w.it):esc(RO[item]);
  const ro=w?(hintAll?esc(w.ro):''):(KANA_WORD[item]&&/^[a-zà-ù]/i.test(KANA_WORD[item])&&!/^(particella|si unisce|raddoppia)/.test(KANA_WORD[item])?'anche una parola: '+esc(KANA_WORD[item]):'');
  app.innerHTML=`<div class="topbar"><button class="icon-btn" id="b-back" aria-label="Esci">${IC.close}</button>
    <span class="title hide-phone">${daily?'Test di oggi':rip?'Ripasso':prac?'Scrivi le parole':'Allenamento'}</span><span class="spacer"></span>
    <span class="count">${daily?`<button class="btn" id="b-rev" style="min-height:40px;padding:0 12px;font-size:.85rem">${Math.min(S.daily.idx+1,10)}/10<span class="hide-phone">&nbsp;· rivedi</span></button>`:prac?`${Q.li+1}/${Q.list.length}`:`${Q.stats.ok}/${Q.stats.n} giuste`}</span>
    <button class="btn" id="b-shuf" style="min-height:40px;padding:0 12px;font-size:.85rem" aria-label="Rimescola: nuove parole">${IC.shuffle}<span class="hide-phone">Rimescola</span></button>
    <button class="btn" id="b-size" style="min-height:40px;padding:0 12px;font-size:.85rem" aria-label="Dimensione del foglio"><span class="hide-phone">Foglio: </span>${PS[device.padSize||'l']}</button></div>
  <div class="quiz">
    <div class="side"><section class="prompt">
      <div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div style="flex:1;min-width:0"><div class="it">${it}</div>${ro?`<div class="ro">${ro}</div>`:w&&!hintAll?`<button class="linkbtn" id="b-hint">mostra la pronuncia</button>`:''}</div>
        <button class="icon-btn" id="b-say" aria-label="Ascolta">${IC.sound}</button></div>
      ${prac&&!rip?`<div class="ref">Si scrive <span>${esc(item)}</span></div>`:''}
      ${w&&Q.cells.length>1?`<div class="seg" role="group" aria-label="Modo di scrittura"><button data-tog="0" aria-pressed="${!tog}">Una lettera</button><button data-tog="1" aria-pressed="${tog}">Tutta la parola</button></div>`:''}
      <div class="cells">${Q.cells.map((c,i)=>`<div class="cell ${c.st==='ok'?'ok':c.st==='bad'?'bad':!tog&&i===Q.ci&&Q.phase!=='done'?'cur':''}"><div class="box">${c.st!=='todo'?c.ch:''}</div><div class="syl">${hintAll||c.st!=='todo'||!known(c.ch)?RO[c.ch].replace(' piccolo',' picc.'):'·'}</div></div>`).join('')}</div>
    </section></div>
    <div class="fbslot" id="fbslot">${quizFeedback()}</div>
    <div class="padwrap" id="padwrap">
      <canvas class="pad" id="pad" aria-label="Foglio per scrivere"></canvas>
      <div class="tools">
        <button class="icon-btn" id="b-clear" aria-label="Cancella">${IC.clear}</button>
        <button class="btn" id="b-help">${IC.eye} Modello</button>
        ${Q.phase==='draw'?`<button class="btn primary" id="b-check" style="flex:1;max-width:220px">${IC.check} Controlla</button>`
          :Q.phase==='bad'?`<button class="btn primary" id="b-retry" style="flex:1;max-width:220px">Riprova</button>`
          :Q.phase==='tip'?`<button class="btn primary" id="b-go" style="flex:1;max-width:220px">Avanti ${IC.next}</button>`
          :`<button class="btn primary" id="b-next" style="flex:1;max-width:220px">Avanti ${IC.next}</button>`}
      </div>
    </div>
  </div>`;
  pad=new Pad($('#pad'));
  if(tog){pad.cols=Q.cells.length;pad.cellFb=Q.cellFb;pad.strokes=Q.wordStrokes?Q.wordStrokes.slice():[];pad.ghostWord=Q.ghost?item:null;}
  fitPad(pad,$('#padwrap'),76);
  if(tog&&(Q.phase==='bad'||Q.phase==='tip'))pad.locked=true;
  if(!tog&&(Q.phase==='bad'||Q.phase==='tip')&&Q.lastStrokes){pad.strokes=Q.lastStrokes;pad.fb=Q.lastFb;pad.locked=true;pad.draw();}
  if(Q.phase==='done')pad.locked=true;
  $('#b-back').onclick=()=>{if(!daily&&Q.stats.n)toast(`${Q.stats.ok} giuste su ${Q.stats.n}.`);go(prac&&!rip?'alpha':'home');};
  const hb=$('#b-hint');if(hb)hb.onclick=()=>{Q.showHint=true;if(tog&&Q.phase==='draw')Q.wordStrokes=pad.strokes.slice();render();speak(item);};
  $('#b-say').onclick=()=>speak(item);
  const rv=$('#b-rev');if(rv)rv.onclick=()=>{if(Q.phase==='draw'&&pad.strokes.length&&!tog)Q.lastStrokes=null;if(tog&&Q.phase==='draw')Q.wordStrokes=pad.strokes.slice();if(pad)pad.stopAnim();view={name:'review',fromQuiz:true};render();window.scrollTo(0,0);};
  $('#b-shuf').onclick=()=>{
    if(Q.mode==='daily'){reshuffleDaily();save();loadItem(S.daily.items[S.daily.idx]);toast('Nuove domande da qui alla fine del test.');}
    else if(Q.mode==='practice'||Q.mode==='rip'){const rest=Q.list.slice(Q.li).sort(()=>Math.random()-.5);Q.list=Q.list.slice(0,Q.li).concat(rest);loadItem(Q.list[Q.li]);toast('Parole rimescolate.');}
    else{loadItem(nextTraining());}
    render();if(S.settings.autoSpeak)speak(Q.item);};
  $('#b-size').onclick=()=>{const o=['l','m','s'];device.padSize=o[(o.indexOf(device.padSize||'l')+1)%3];saveDevice();if(tog&&Q.phase==='draw')Q.wordStrokes=pad.strokes.slice();render();};
  app.querySelectorAll('[data-tog]').forEach(b=>b.onclick=()=>{const v=b.dataset.tog==='1';if(v===!!S.settings.together)return;S.settings.together=v;save();loadItem(item);render();});
  $('#b-clear').onclick=()=>{if(Q.phase!=='draw')return;if(tog){pad.strokes=pad.strokes.filter(st=>Q.cells[pad.cellOf(st)].st!=='todo');pad.draw();}else pad.clear();};
  if(tog){
    $('#b-help').onclick=()=>{if(Q.phase==='done'||Q.phase==='tip')return;Q.cells.forEach(c=>{if(c.st==='todo')c.miss=true;});Q.ghost=true;
      if(Q.phase==='bad'){retryWord();}else{pad.ghostWord=item;pad.draw();}
      $('#fbslot').innerHTML=`<div class="fb info">Ricalca il modello in grigio, seguendo i numeri.</div>`;};
    const ck=$('#b-check');if(ck)ck.onclick=checkWord;
    const rt=$('#b-retry');if(rt)rt.onclick=retryWord;
    const gb=$('#b-go');if(gb)gb.onclick=finishItem;
    const nx=$('#b-next');if(nx)nx.onclick=nextItem;
    return;
  }
  $('#b-help').onclick=()=>{if(Q.phase==='done'||Q.phase==='tip')return;const c=Q.cells[Q.ci];c.miss=true;
    if(Q.phase!=='draw'){Q.phase='draw';Q.lastStrokes=null;Q.msg=null;render();}
    pad.locked=true;pad.animate(c.ch,()=>{pad.locked=false;pad.draw();});
    $('#fbslot').innerHTML=`<div class="fb info">Ecco come si scrive <span style="font-family:var(--f-kana);font-size:1.2rem">${c.ch}</span>. Ora prova tu.</div>`;};
  const ck=$('#b-check');if(ck)ck.onclick=checkCell;
  const rt=$('#b-retry');if(rt)rt.onclick=()=>{Q.phase='draw';Q.lastStrokes=null;Q.msg=null;render();};
  const nx=$('#b-next');if(nx)nx.onclick=nextItem;
  const gb=$('#b-go');if(gb)gb.onclick=advanceCell;
}
function quizFeedback(){
  if(Q.phase==='done'){const ok=!Q.cells.some(c=>c.miss),w=Q.word;
    return `<div class="done"><span class="k">${esc(Q.item)}</span><div style="flex:1;min-width:0"><div style="font-weight:650">${w?esc(w.it):esc(RO[Q.item])}</div><div class="muted small">${w?esc(w.ro):'kana'}</div></div>
      <span class="badge ${ok?'ok':'bad'}">${ok?'Giusto':'Da ripassare'}</span></div>
      ${Q.tips.length?`<div class="fb tip" style="margin-top:10px">${esc(Q.tips[0])}</div>`:''}`;}
  if(Q.msg)return `<div class="fb ${Q.msg.type}">${Q.msg.lines?Q.msg.lines.map(esc).join('<br>'):esc(Q.msg.text)}</div>`;
  return '';
}
function checkCell(){
  const c=Q.cells[Q.ci];
  if(!pad.strokes.length){toast('Scrivi prima il kana.');return;}
  const r=check(pad.strokes,c.ch,S.settings.level,ALL_CHARS);
  if(r.ok){
    if(!c.miss)charResult(c.ch,true);
    c.st=c.miss?'bad':'ok';
    Q.draw.push(...pad.strokes.map(st=>st.map(([x,y])=>[x+Q.ci*109,y])));
    if(r.tips.length){Q.tips.push(r.tips[0]);Q.msg={type:'tip',text:'Giusto! '+r.tips[0]};
      Q.phase='tip';Q.lastStrokes=pad.strokes.slice();Q.lastFb={ch:c.ch,ok:true,hl:r.hl};render();return;}
    Q.msg={type:'ok',text:r.quality>.45?'Ottimo!':'Giusto!'};
    pad.fb={ch:c.ch,ok:true};pad.draw();pad.locked=true;
    $('#fbslot').innerHTML=quizFeedback();
    setTimeout(advanceCell,450);
  }else{
    if(!c.miss){charResult(c.ch,false);c.miss=true;}
    Q.phase='bad';Q.msg={type:'bad',text:r.msg};Q.lastStrokes=pad.strokes.slice();Q.lastFb={ch:c.ch,bad:r.hl&&r.hl.length?r.hl:pad.strokes.map((_,i)=>i),showTpl:true,hl:r.hl};save();render();
  }
}
function checkWord(){
  if(!pad.strokes.length){toast('Scrivi prima la parola.');return;}
  const n=Q.cells.length,groups=Array.from({length:n},()=>[]);
  pad.strokes.forEach(st=>{const c=pad.cellOf(st);groups[c].push(st.map(([x,y])=>[x-c*109,y]));});
  const cf=(Q.cellFb||[]).slice(),bad=[],tips=[];const ord=i=>`${i+1}° kana`;
  Q.cells.forEach((c,i)=>{
    if(c.st!=='todo')return;
    if(!groups[i].length){if(!c.miss){charResult(c.ch,false);c.miss=true;}cf[i]={ch:c.ch,state:'bad',showTpl:true};bad.push(`${ord(i)} (${c.ch}): manca, scrivilo nel suo riquadro.`);return;}
    const r=check(groups[i],c.ch,S.settings.level,ALL_CHARS);
    if(r.ok){if(!c.miss)charResult(c.ch,true);c.st=c.miss?'bad':'ok';cf[i]={ch:c.ch,state:'ok',hl:r.tips.length?r.hl:null};if(r.tips.length)tips.push(`${ord(i)} (${c.ch}): ${r.tips[0]}`);}
    else{if(!c.miss){charResult(c.ch,false);c.miss=true;}cf[i]={ch:c.ch,state:'bad',showTpl:true,hl:r.hl};bad.push(`${ord(i)} (${c.ch}): ${r.msg}`);}
  });
  Q.cellFb=cf;Q.wordStrokes=pad.strokes.slice();Q.tips.push(...tips);
  if(bad.length){Q.phase='bad';Q.msg={type:'bad',lines:[...bad,...(tips.length?['Consigli: '+tips.join(' ')]:[])]};save();render();return;}
  if(tips.length){Q.phase='tip';Q.msg={type:'tip',lines:['Giusto! Due ritocchi alla forma:',...tips]};save();render();return;}
  Q.msg={type:'ok',text:'Ottimo!'};save();render();setTimeout(()=>{if(view.name==='quiz'&&Q.phase==='draw')finishItem();},450);
}
function retryWord(){
  Q.phase='draw';Q.msg=null;
  Q.wordStrokes=(Q.wordStrokes||[]).filter(st=>Q.cells[pad.cellOf(st)].st!=='todo');
  Q.cellFb=(Q.cellFb||[]).map((f,i)=>Q.cells[i].st!=='todo'?f:null);render();
}
function advanceCell(){Q.phase='draw';Q.lastStrokes=null;Q.lastFb=null;if(Q.ci<Q.cells.length-1){Q.ci++;render();}else finishItem();}
function finishItem(){
  const ok=!Q.cells.some(c=>c.miss);Q.phase='done';
  if(Q.word)wordResult(Q.item,ok);
  const d=encStrokes(Q.together?(Q.wordStrokes||[]):(Q.draw||[]));
  if(Q.mode==='daily'){S.daily.results.push({item:Q.item,ok,d});S.daily.idx++;}
  else if(Q.mode==='practice'){Q.stats.n++;if(ok)Q.stats.ok++;}
  else if(Q.mode==='rip'){Q.stats.n++;if(ok)Q.stats.ok++;else if(!Q.again.has(Q.item)){Q.again.add(Q.item);Q.list.push(Q.item);}}
  else{Q.stats.n++;if(ok)Q.stats.ok++;else{Q.queue=Q.queue||[];Q.queue.splice(3,0,Q.item);}}
  save();render();speak(Q.item);
}
function nextItem(){
  if(Q.mode==='daily'){
    if(S.daily.idx>=S.daily.items.length){const sc=S.daily.results.filter(r=>r.ok).length;S.history[today()]=Math.max(sc,S.history[today()]??0);save();go('results');return;}
    loadItem(S.daily.items[S.daily.idx]);
  }else if(Q.mode==='practice'||Q.mode==='rip'){
    if(Q.li>=Q.list.length-1){toast(Q.mode==='rip'?`Ripasso finito: ${Q.stats.ok} giuste su ${Q.stats.n}. Gli errori tornano domani.`:`Finite! ${Q.stats.ok} giuste su ${Q.stats.n}.`);go(Q.mode==='rip'?'home':'alpha');return;}
    Q.li++;loadItem(Q.list[Q.li]);
  }else loadItem(nextTraining());
  render();if(S.settings.autoSpeak)speak(Q.item);
}
function renderResults(app){
  const d=S.daily,sc=d.results.filter(r=>r.ok).length,wrong=d.results.filter(r=>!r.ok).map(r=>r.item);
  app.innerHTML=`<div class="narrow"><div class="topbar"><button class="icon-btn" id="b-back" aria-label="Home">${IC.close}</button><span class="title">Risultato di oggi</span></div>
  <div class="row" style="margin:6px 0 16px;align-items:flex-end"><div class="score">${sc}<span class="muted" style="font-size:1.3rem">/10</span></div>
    <div class="muted" style="flex:1;min-width:180px">${sc>=9?'Eccellente.':sc>=6?'Buon lavoro. Gli errori torneranno più spesso.':'Gli errori torneranno più spesso nei prossimi giorni.'}</div></div>
  <div class="list">${d.results.map(resRow).join('')}</div>
  <div class="row" style="margin-top:16px">${wrong.length?`<button class="btn primary" id="b-err">Ripassa gli errori</button>`:''}<button class="btn" id="b-home">Home</button></div></div>`;
  $('#b-back').onclick=$('#b-home').onclick=()=>go('home');
  const e=$('#b-err');if(e)e.onclick=()=>startQuiz('training',wrong);
  app.querySelectorAll('[data-say]').forEach(b=>b.onclick=()=>speak(b.dataset.say));
}

function thumb(item,d){const n=[...item].length,st=decStrokes(d);if(!st.length)return '<span class="thumb empty" aria-hidden="true"></span>';
  return `<svg class="thumb" viewBox="0 0 ${109*n} 109" style="width:${n*40}px" aria-label="Il tuo disegno di ${item}">${Array.from({length:n-1},(_,i)=>`<line x1="${(i+1)*109}" y1="8" x2="${(i+1)*109}" y2="101" class="sep"/>`).join('')}${st.map(s=>s.length===1?`<circle cx="${s[0][0]}" cy="${s[0][1]}" r="3"/>`:`<polyline points="${s.map(p=>p.join(',')).join(' ')}"/>`).join('')}</svg>`;}
function resRow(r){const w=WORD_MAP[r.item];return `<div class="li rr">${thumb(r.item,r.d)}<div class="t"><div class="rk">${r.item}</div><div class="small">${w?esc(w.it):esc(RO[r.item])}<span class="muted"> · ${w?esc(w.ro):'kana'}</span></div></div><button class="icon-btn plain" data-say="${r.item}" aria-label="Ascolta">${IC.sound}</button><span class="badge ${r.ok?'ok':'bad'}">${r.ok?'OK':'NO'}</span></div>`;}
function renderReview(app){
  const blocks=[];
  if(S.daily&&S.daily.results&&S.daily.results.length)blocks.push({date:S.daily.date,results:S.daily.results,live:S.daily.idx<S.daily.items.length});
  (S.tests||[]).slice().reverse().forEach(t=>blocks.push(t));
  const fmt=ds=>{try{return new Date(ds+'T12:00:00').toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'});}catch(e){return ds;}};
  app.innerHTML=`<div class="narrow"><div class="topbar"><button class="icon-btn" id="b-back" aria-label="Indietro">${IC.back}</button><span class="title">${view.fromQuiz?'Test di oggi: fatte finora':'Storico dei test'}</span></div>
  ${blocks.length?blocks.map(b=>`<div class="row" style="margin:16px 0 8px"><b style="text-transform:capitalize">${b.date===today()?'Oggi':esc(fmt(b.date))}</b><span class="muted">${b.results.filter(r=>r.ok).length}/${b.results.length}${b.live?' · in corso':''}</span></div>
    <div class="list">${b.results.map(resRow).join('')}</div>`).join(''):'<p class="muted">Ancora nessun test. Fai il primo dalla home: qui vedrai ogni parola con il tuo disegno.</p>'}
  <p class="muted small" style="margin-top:14px">Il disegno si salva dai test fatti con questa versione. I test più vecchi di due settimane mostrano solo il risultato.</p></div>`;
  $('#b-back').onclick=()=>{if(view.fromQuiz&&Q&&Q.mode==='daily'){view={name:'quiz'};render();}else go('home');};
  app.querySelectorAll('[data-say]').forEach(b=>b.onclick=()=>speak(b.dataset.say));
}
/* ---- alphabet ---- */
function renderAlpha(app){
  const un=new Set(unlockedChars());
  const cell=c=>c?`<button class="kc ${un.has(c)?'':'off'}" data-ch="${c}" aria-label="${c} ${RO[c]}">${mastery(c)>=.6?'<span class="dot" aria-hidden="true"></span>':''}<span class="k">${c}</span><span class="r">${RO[c]}</span></button>`:'<span class="kc empty"></span>';
  const next=GROUPS[S.unlocked];
  app.innerHTML=`<div class="narrow"><div class="topbar"><button class="icon-btn" id="b-back" aria-label="Indietro">${IC.back}</button><span class="title">Alfabeto</span></div>
  <div class="testbar"><div><b>Nei test entrano</b> <span class="muted">i kana in chiaro (${un.size}).</span></div>
    <div class="row">${next?`<button class="btn primary" id="b-add">Aggiungi <span style="font-family:var(--f-kana);font-size:1.15rem;margin-left:4px">${next.chars.slice(0,5).join('')}${next.chars.length>5?'…':''}</span></button>`:''}
    ${S.unlocked>1?`<button class="btn" id="b-rem">Togli l'ultima riga</button>`:''}</div></div>
  <div class="sec"><h2>Base</h2><span class="muted small">Tocca un kana per vederlo scrivere e provarlo</span></div>
  <div class="kt">${TABLE_BASE.flat().map(cell).join('')}</div>
  <div class="sec"><h2>Con ゛ e ゜</h2><span class="muted small">suoni sonori (g, z, d, b) e p</span></div>
  <div class="kt">${TABLE_DAKU.flat().map(cell).join('')}</div>
  <div class="sec"><h2>Piccoli</h2><span class="muted small">っ raddoppia la consonante, ゃゅょ si uniscono al kana prima</span></div>
  <div class="kt">${['っ','ゃ','ゅ','ょ',''].map(cell).join('')}</div>
  <div class="sec"><h2>Combinazioni</h2><span class="muted small">tocca per ascoltare</span></div>
  <div class="kt three">${TABLE_COMBO.flat().map(c=>`<button class="kc" data-say="${c}"><span class="k">${c}</span><span class="r">${romaji(c)}</span></button>`).join('')}</div>
  ${wordsSection()}
  <p class="muted small" style="margin-top:18px">Ordine dei tratti: <a href="https://kanjivg.tagaini.net" target="_blank" rel="noopener" style="color:inherit">KanjiVG</a> di Ulrich Apel, CC BY-SA 3.0.</p></div>`;
  $('#b-back').onclick=()=>go('home');
  const a=$('#b-add');if(a)a.onclick=()=>{S.unlocked++;save();const nw=WORDS.filter(w=>w.g===S.unlocked-1).length;toast(`Aggiunti: ${GROUPS[S.unlocked-1].chars.join(' ')}${nw?` · ${nw} parole nuove in fondo alla pagina`:''}`);render();};
  app.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{let l=b.dataset.list.split(','),i=+b.dataset.i;if(b.dataset.all){l=l.sort(()=>Math.random()-.5);i=0;}startPractice(l,i);});
  const r=$('#b-rem');if(r)r.onclick=()=>{S.unlocked--;save();render();};
  app.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>go('kana',{ch:b.dataset.ch}));
  app.querySelectorAll('[data-say]').forEach(b=>b.onclick=()=>speak(b.dataset.say));
}
function renderKana(app){
  const ch=view.ch,i=ORDER.indexOf(ch),prev=ORDER[i-1],next=ORDER[i+1];
  const exs=WORDS.filter(w=>w.chars.includes(ch)).sort((a,b)=>a.g-b.g||a.chars.length-b.chars.length).slice(0,3);
  const n=TPL[ch]?TPL[ch].d.length:0;
  app.innerHTML=`<div class="topbar"><button class="icon-btn" id="b-back" aria-label="Alfabeto">${IC.back}</button><span class="title">Alfabeto</span><span class="spacer"></span>
    <button class="icon-btn" id="b-prev" aria-label="Precedente" ${prev?'':'disabled style="opacity:.35"'}>${IC.prev}</button><button class="icon-btn" id="b-nx" aria-label="Successivo" ${next?'':'disabled style="opacity:.35"'}>${IC.next}</button></div>
  <div class="quiz">
    <div class="side"><section class="prompt">
      <div class="sheet-head"><span class="k">${ch}</span><div style="flex:1;min-width:0"><div class="r">${RO[ch]}</div><div class="muted small">${n} ${n===1?'tratto':'tratti'}${KANA_WORD[ch]?' · '+esc(KANA_WORD[ch]):''}</div></div>
        <button class="icon-btn" id="b-say" aria-label="Ascolta">${IC.sound}</button></div>
      ${exs.length?`<div>${exs.map(w=>`<div class="ex"><span class="k">${w.k}</span><span style="flex:1;min-width:0">${esc(w.it)}<span class="muted small"> · ${esc(w.ro)}</span></span><button class="icon-btn plain" data-say="${w.k}" aria-label="Ascolta">${IC.sound}</button></div>`).join('')}</div>`:''}
    </section></div>
    <div class="fbslot" id="fbslot"><div class="fb info">Guarda l'ordine dei tratti, poi scrivilo tu.</div></div>
    <div class="padwrap" id="padwrap"><canvas class="pad" id="pad" aria-label="Foglio per scrivere ${ch}"></canvas>
      <div class="tools"><button class="icon-btn" id="b-clear" aria-label="Cancella">${IC.clear}</button><button class="btn" id="b-anim">${IC.eye} Rivedi</button>
        <button class="btn primary" id="b-check" style="flex:1;max-width:220px">${IC.check} Controlla</button></div></div>
  </div>`;
  pad=new Pad($('#pad'));fitPad(pad,$('#padwrap'),76);
  const anim=()=>{pad.locked=true;pad.animate(ch,()=>{pad.locked=false;pad.draw();});};
  $('#b-back').onclick=()=>go('alpha');
  if(prev)$('#b-prev').onclick=()=>go('kana',{ch:prev});
  if(next)$('#b-nx').onclick=()=>go('kana',{ch:next});
  $('#b-say').onclick=()=>speak(ch);
  app.querySelectorAll('[data-say]').forEach(b=>b.onclick=()=>speak(b.dataset.say));
  $('#b-clear').onclick=()=>pad.clear();
  $('#b-anim').onclick=anim;
  $('#b-check').onclick=()=>{
    if(!pad.strokes.length){toast('Scrivi prima il kana.');return;}
    const r=check(pad.strokes,ch,S.settings.level,ALL_CHARS),fb=$('#fbslot');
    if(r.ok){pad.fb={ch,ok:true,hl:r.tips.length?r.hl:null};pad.draw();const s=cs(ch);s.n++;s.ok++;if(s.box<2)s.box++;s.last=Date.now();save();
      fb.innerHTML=r.tips.length?`<div class="fb tip">Giusto! ${esc(r.tips[0])}</div>`:`<div class="fb ok">${r.quality>.45?'Ottimo!':'Giusto!'}</div>`;}
    else{pad.fb={ch,bad:r.hl&&r.hl.length?r.hl:pad.strokes.map((_,i)=>i),showTpl:true,hl:r.hl};pad.draw();fb.innerHTML=`<div class="fb bad">${esc(r.msg)}</div>`;}
    setTimeout(()=>{if(view.name==='kana'&&view.ch===ch&&pad.fb){pad.strokes=[];pad.fb=null;pad.draw();}},r.ok?(r.tips.length?4000:1100):3500);
  };
  setTimeout(()=>{if(view.name==='kana'&&view.ch===ch)anim();},250);
}

/* ---- study & listening (reading + meaning, by voice). One tap on the mic, then it runs by itself. ---- */
let SQ=null;
function readWeight(k){const r=S.read[k];let w=r?3:9;if(r&&r.n)w+=8*(1-r.ok/r.n);if(r&&Date.now()-r.last<10*60e3)w*=.15;return w;}
function nextStudy(){const recent=SQ?SQ.recent:[];
  const useWord=Math.random()<.65;
  if(useWord){const w=wpick(availWords(),x=>readWeight(x.k),x=>recent.includes(x.k));if(w)return w.k;}
  return wpick(unlockedChars(),readWeight,x=>recent.includes(x))||unlockedChars()[0];}
function startStudy(){SQ={ok:0,n:0,recent:[],auto:false,noMic:false};loadStudy(nextStudy());go('study');}
function loadStudy(item){SQ.item=item;SQ.w=WORD_MAP[item]||null;SQ.step='read';SQ.res={};SQ.heard='';SQ.listening=false;SQ.fail=null;SQ.good=false;SQ.recorded=undefined;SQ.line='';SQ.retry=0;
  SQ.recent.push(item);if(SQ.recent.length>8)SQ.recent.shift();}
function studyRecord(){const ok=SQ.res.read==='ok'&&(!SQ.w||SQ.res.mean==='ok');const r=S.read[SQ.item]||(S.read[SQ.item]={n:0,ok:0,last:0});
  if(SQ.recorded!==undefined){if(SQ.recorded!==ok){r.ok+=ok?1:-1;SQ.ok+=ok?1:-1;}}else{r.n++;if(ok)r.ok++;SQ.n++;if(ok)SQ.ok++;}
  SQ.recorded=ok;r.last=Date.now();save();}
function studyAlive(tk,st){return view.name==='study'&&SQ&&SQ.item===tk&&(st===undefined||SQ.step===st);}
function renderStudy(app){
  const it=SQ.item,w=SQ.w,step=SQ.step,f=SQ.fail;
  const reading=w?w.ro:RO[it],meaning=w?w.it:(KANA_WORD[it]||'');
  const showRo=step!=='read'||!!f,showIt=step==='done'||(f&&f.step==='mean');
  app.innerHTML=`<div class="narrow"><div class="topbar"><button class="icon-btn plain" id="b-back" aria-label="Esci">${IC.close}</button><span class="spacer"></span><span class="count">${SQ.ok}/${SQ.n}</span></div>
  <section class="study"><div class="big">${esc(it)}</div>
    <div class="sline">${showRo?`<span>${esc(reading)}</span><button class="icon-btn plain" id="b-say" aria-label="Ascolta">${IC.sound}</button>`:'&nbsp;'}</div>
    <div class="sline it">${showIt&&meaning?esc(meaning):'&nbsp;'}</div>
  </section>
  <div class="ask">
    ${f?`<div class="heard bad">${f.heard?'«'+esc(f.heard)+'»':'&nbsp;'}</div>
      <div class="row" style="justify-content:center">${f.heard?`<button class="btn" id="b-was">Era giusto</button>`:''}<button class="btn" id="b-again">Riprova</button><button class="btn primary" id="b-next">Avanti ${IC.next}</button></div>`
    :SQ.good?`<div class="heard ok">Giusto</div>`
    :SQ.noMic?`<form class="row" id="f-type" style="justify-content:center;flex-wrap:nowrap"><input id="i-type" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${step==='read'?'romaji':'italiano'}"><button class="btn primary" type="submit">${IC.check}</button></form>`
    :`<button class="mic ${SQ.listening?'on':''}" id="b-mic" aria-label="${SQ.listening?'Ferma':'Parla'}">${IC.mic}</button>
      <div class="lvlbar" aria-hidden="true"><div id="lvl"></div></div>
      <div class="heard" id="mic-status">${esc(SQ.line||'')}</div>`}
    ${!f&&!SQ.good?`<button class="linkbtn" id="b-show">Non lo so</button>`:''}
  </div></div>`;
  $('#b-back').onclick=()=>{SQ.auto=false;micStop();micClose();if(SQ.n)toast(`${SQ.ok} giuste su ${SQ.n}.`);go('home');};
  const sy=$('#b-say');if(sy)sy.onclick=()=>speak(it);
  const mb=$('#b-mic');if(mb)mb.onclick=()=>{if(SQ.listening){SQ.auto=false;micStop();return;}SQ.auto=true;studyListen();};
  const sh=$('#b-show');if(sh)sh.onclick=()=>{SQ.auto=false;micStop();studyFail(step,'');};
  const ag=$('#b-again');if(ag)ag.onclick=()=>{SQ.fail=null;SQ.auto=true;studyListen();};
  const wa=$('#b-was');if(wa)wa.onclick=()=>{const s=f.step;SQ.fail=null;SQ.auto=true;studyOk(s);};
  const nx=$('#b-next');if(nx)nx.onclick=()=>{SQ.fail=null;studyRecord();loadStudy(nextStudy());SQ.auto=!SQ.noMic;render();if(SQ.auto)studyListen();};
  const ft=$('#f-type');if(ft){const inp=$('#i-type');inp.focus();ft.onsubmit=e=>{e.preventDefault();const v=inp.value.trim();if(v)studyAnswer([v]);};}
}
function studyListen(){
  const tk=SQ.item,st=SQ.step,lang=st==='mean'?'it':'ja';
  SQ.listening=true;SQ.line='';render();
  recListen(lang,()=>{},texts=>{if(!studyAlive(tk,st))return;SQ.listening=false;studyAnswer(texts);},
    (err,det)=>{if(!studyAlive(tk,st))return;SQ.listening=false;
      if(err==='unclear'&&SQ.auto&&SQ.retry<2){SQ.retry++;SQ.line='Non ho capito, ripeti';render();setTimeout(()=>{if(studyAlive(tk,st)&&SQ.auto&&!SQ.listening)studyListen();},150);return;}
      if(err==='not_granted'||err==='nomic'||err==='audio'){SQ.noMic=true;SQ.auto=false;SQ.line='';toast(err==='not_granted'?'Microfono non permesso: scrivi la risposta.':'Microfono non disponibile: scrivi la risposta.');render();return;}
      SQ.auto=false;SQ.line=err==='unclear'?'Non ho capito':err==='asr'?'Riconoscimento non riuscito, riprova':'';render();});
}
function studyAnswer(texts){
  const st=SQ.step,it=SQ.item,w=SQ.w;SQ.heard=texts[0];
  const v=st==='read'?judgeReading(texts,it):(w?judgeMeaning(texts,w.it):'ok');
  if(v==='ok')studyOk(st);else studyFail(st,texts[0]);
}
function studyOk(st){
  const tk=SQ.item;SQ.res[st]='ok';SQ.retry=0;SQ.line='';
  if(st==='read'&&SQ.w){SQ.step='mean';render();if(SQ.auto)setTimeout(()=>{if(studyAlive(tk,'mean')&&SQ.auto&&!SQ.listening)studyListen();},200);return;}
  SQ.step='done';SQ.good=true;studyRecord();render();
  setTimeout(()=>{if(!studyAlive(tk,'done'))return;loadStudy(nextStudy());render();if(SQ.auto&&!SQ.noMic)studyListen();},700);
}
function studyFail(st,heard){
  SQ.res[st]='no';if(st==='read'&&SQ.w)SQ.res.mean=SQ.res.mean||'no';SQ.fail={step:st,heard};SQ.listening=false;SQ.line='';
  speak(SQ.item);render();
}

/* ---- settings ---- */
function renderSettings(app){
  const st=S.settings;
  app.innerHTML=`<div class="narrow"><div class="topbar"><button class="icon-btn" id="b-back" aria-label="Indietro">${IC.back}</button><span class="title">Impostazioni</span></div>
  <div class="list">
    <div class="li"><div class="t"><b>Correzione</b><div class="muted small">Tollerante: accetta la tua grafia e ti dà consigli. Precisa: più rigorosa sulla forma.</div></div>
      <div class="seg">${[['easy','Tollerante'],['normal','Precisa']].map(([k,l])=>`<button data-lv="${k}" aria-pressed="${st.level===k}">${l}</button>`).join('')}</div></div>
    <div class="li"><div class="t"><b>Dimensione del foglio</b><div class="muted small">Su questo dispositivo. Piccolo per scrivere come su un quaderno.</div></div>
      <div class="seg">${[['l','Grande'],['m','Medio'],['s','Piccolo']].map(([k,l])=>`<button data-ps="${k}" aria-pressed="${(device.padSize||'l')===k}">${l}</button>`).join('')}</div></div>
    <div class="li"><div class="t"><b>Aiuti nei test</b><div class="muted small">Automatici: la pronuncia sotto le caselle sparisce per i kana che sai già (la puoi sempre mostrare). Sempre: la vedi sempre.</div></div>
      <div class="seg">${[['auto','Automatici'],['always','Sempre']].map(([k,l])=>`<button data-hn="${k}" aria-pressed="${(st.hints||'auto')===k}">${l}</button>`).join('')}</div></div>
    <div class="li"><div class="t"><b>Solo Apple Pencil</b><div class="muted small">Su questo dispositivo ignora le dita sul foglio (niente segni del palmo). Lascialo spento su iPhone.</div></div>
      <button class="switch" role="switch" id="s-pen" aria-checked="${device.pencilOnly}" aria-label="Solo Apple Pencil"></button></div>
    <div class="li"><div class="t"><b>Voce</b><div class="muted small">${jaVoice?'Voce giapponese: '+esc(jaVoice.name):'Voce giapponese non trovata. Su iPhone e iPad: Impostazioni › Accessibilità › Contenuto letto ad alta voce › Voci › Giapponese.'}</div></div>
      <div class="seg">${[[.6,'Lenta'],[.85,'Normale']].map(([k,l])=>`<button data-rate="${k}" aria-pressed="${st.rate===k}">${l}</button>`).join('')}</div>
      <button class="icon-btn" id="b-test" aria-label="Prova la voce">${IC.sound}</button></div>
    ${TTS?`<div class="li"><div class="t"><b>Quale voce</b><div class="muted small">Claude ha una voce più naturale, ma c'è solo su computer (Chrome o Edge).</div></div>
      <div class="seg">${[['sys','Sistema'],['claude','Claude']].map(([k,l])=>`<button data-vc="${k}" aria-pressed="${(st.voice||'sys')===k}">${l}</button>`).join('')}</div></div>`:''}
    ${window.HIRA_AUTH?`<div class="li"><div class="t"><b>Account</b><div class="muted small">${window.HIRA_AUTH.email?'Collegato come '+esc(window.HIRA_AUTH.email)+'. I progressi sono uguali su tutti i dispositivi.':'Non collegato: i progressi restano solo su questo dispositivo.'}</div></div>
      <button class="btn" id="b-acc">${window.HIRA_AUTH.email?'Esci':'Accedi'}</button></div>`:''}
    <div class="li" style="flex-wrap:wrap"><div class="t"><b>Sposta i progressi</b><div class="muted small">Per passare a un'altra versione dell'app: copia qui, incolla di là.</div></div>
      <button class="btn" id="b-exp">Copia</button><button class="btn" id="b-imp">Incolla</button>
      ${view.io?`<div style="flex-basis:100%"><textarea id="t-io" rows="5" style="width:100%;margin-top:8px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--ink);padding:10px;font:inherit;font-size:.8rem" ${view.io==='exp'?'readonly':'placeholder="Incolla qui il testo copiato"'}>${view.io==='exp'?esc(JSON.stringify(S)):''}</textarea>
        ${view.io==='imp'?`<button class="btn primary" id="b-imp-go" style="margin-top:8px">Importa</button>`:`<div class="muted small" style="margin-top:6px">Se non è già copiato: tieni premuto nel riquadro › Seleziona tutto › Copia.</div>`}</div>`:''}</div>
    <div class="li"><div class="t"><b>Azzera i progressi</b><div class="muted small">${DB?'I progressi sono salvati sul tuo account, uguali su iPad e iPhone.':'I progressi sono salvati su questo dispositivo.'}</div></div>
      <button class="btn" id="b-reset">${view.confirm?'Sì, azzera':'Azzera'}</button></div>
  </div></div>`;
  $('#b-back').onclick=()=>go('home');
  app.querySelectorAll('[data-lv]').forEach(b=>b.onclick=()=>{st.level=b.dataset.lv;save();render();});
  app.querySelectorAll('[data-ps]').forEach(b=>b.onclick=()=>{device.padSize=b.dataset.ps;saveDevice();render();});
  app.querySelectorAll('[data-hn]').forEach(b=>b.onclick=()=>{st.hints=b.dataset.hn;save();render();});
  app.querySelectorAll('[data-vc]').forEach(b=>b.onclick=()=>{st.voice=b.dataset.vc;speak.ttsOff=false;save();render();speak('うきうき');});
  app.querySelectorAll('[data-rate]').forEach(b=>b.onclick=()=>{st.rate=+b.dataset.rate;save();render();});
  $('#s-pen').onclick=()=>{device.pencilOnly=!device.pencilOnly;device.penSeen=true;saveDevice();render();};
  $('#b-test').onclick=()=>speak('うきうき');
  const ac=$('#b-acc');if(ac)ac.onclick=()=>window.HIRA_AUTH.email?window.HIRA_AUTH.signOut():window.HIRA_AUTH.show();
  $('#b-exp').onclick=()=>{view.io='exp';render();const t=$('#t-io');t.focus();t.select();try{navigator.clipboard.writeText(t.value).then(()=>toast('Copiato. Ora incollalo nell\u2019altra app.'),()=>{});}catch(e){}};
  $('#b-imp').onclick=()=>{view.io='imp';render();$('#t-io').focus();};
  const ig=$('#b-imp-go');if(ig)ig.onclick=()=>{try{const x=JSON.parse($('#t-io').value.trim());if(!x||!x.chars||!x.settings)throw 0;S=migrate(x);save();toast('Progressi importati.');go('home');}catch(e){toast('Testo non valido: copialo di nuovo dall\u2019altra app.');}};
  $('#b-reset').onclick=()=>{if(!view.confirm){view.confirm=true;render();return;}S=freshState();save();toast('Progressi azzerati.');go('home');};
}

/* ============ BOOT ============ */
buildTemplates(SD);
render();
let rzT;window.addEventListener('resize',()=>{clearTimeout(rzT);rzT=setTimeout(()=>{if(pad&&document.body.contains(pad.c)){const wrap=$('#padwrap');if(wrap)fitPad(pad,wrap,76);}},150);});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>pad&&pad.draw());
initSync();initCaps();setTimeout(()=>{if(!DB)initSync();},2000);
if(window.HIRA_WHISPER&&window.Worker)setTimeout(()=>{loadASR().catch(()=>{});},2500);
