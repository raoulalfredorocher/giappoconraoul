let ADV_T=0.06;
// ---- Stroke recognizer: compares user strokes with KanjiVG templates ----
const RN = 32;
function pathLen(p){let L=0;for(let i=1;i<p.length;i++)L+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);return L;}
function resample(p,n){
  if(p.length===1) return Array.from({length:n},()=>[p[0][0],p[0][1]]);
  const L=pathLen(p); if(L===0) return Array.from({length:n},()=>[p[0][0],p[0][1]]);
  const step=L/(n-1), out=[[p[0][0],p[0][1]]]; let acc=0, prev=[p[0][0],p[0][1]];
  for(let i=1;i<p.length;i++){
    let cur=p[i], d=Math.hypot(cur[0]-prev[0],cur[1]-prev[1]);
    while(acc+d>=step && out.length<n){
      const t=(step-acc)/d, q=[prev[0]+t*(cur[0]-prev[0]),prev[1]+t*(cur[1]-prev[1])];
      out.push(q); prev=q; d=Math.hypot(cur[0]-prev[0],cur[1]-prev[1]); acc=0;
    }
    acc+=d; prev=cur;
  }
  while(out.length<n) out.push([p[p.length-1][0],p[p.length-1][1]]);
  return out;
}
function normalize(strokes){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const s of strokes)for(const [x,y] of s){if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y;}
  const cx=(x0+x1)/2, cy=(y0+y1)/2, sc=Math.max(x1-x0,y1-y0)||1;
  return strokes.map(s=>resample(s,RN).map(([x,y])=>[(x-cx)/sc,(y-cy)/sc]));
}
function sdist(a,b){let d=0;for(let i=0;i<RN;i++)d+=Math.hypot(a[i][0]-b[i][0],a[i][1]-b[i][1]);return d/RN;}
function sdistRev(a,b){let d=0;for(let i=0;i<RN;i++)d+=Math.hypot(a[RN-1-i][0]-b[i][0],a[RN-1-i][1]-b[i][1]);return d/RN;}

const TPL = {}; // char -> {raw:[[pts]], norm:[[pts]]}
function buildTemplates(strokeData){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width','0');svg.setAttribute('height','0');svg.style.position='absolute';
  document.body.appendChild(svg);
  const path=document.createElementNS('http://www.w3.org/2000/svg','path'); svg.appendChild(path);
  for(const ch in strokeData){
    const raw=strokeData[ch].map(d=>{
      path.setAttribute('d',d); const L=path.getTotalLength(), n=Math.max(8,Math.ceil(L/1.5)), pts=[];
      for(let i=0;i<=n;i++){const q=path.getPointAtLength(L*i/n);pts.push([q.x,q.y]);}
      return pts;
    });
    TPL[ch]={raw,norm:normalize(raw),d:strokeData[ch]};
  }
  svg.remove();
}
const SMALL_PAIRS={'っ':'つ','ゃ':'や','ゅ':'ゆ','ょ':'よ','ぁ':'あ','ぃ':'い','ぅ':'う','ぇ':'え','ぉ':'お','ゎ':'わ'};
const THR={soft:0.19,normal:0.15,strict:0.115};
function permutations(n){
  const res=[];const a=[...Array(n).keys()];
  (function rec(k){if(k===n){res.push(a.slice());return;}for(let i=k;i<n;i++){[a[k],a[i]]=[a[i],a[k]];rec(k+1);[a[k],a[i]]=[a[i],a[k]];}})(0);
  return res;
}
function charScore(U,T){ // U,T normalized, same length
  let sum=0,max=0;const per=[];
  for(let i=0;i<U.length;i++){const d=sdist(U[i],T[i]);per.push(d);sum+=d;if(d>max)max=d;}
  return {avg:sum/U.length,max,per};
}
function recognize(userStrokes,target,level,candidates){
  const thr=THR[level]||THR.normal;
  const T=TPL[target]; if(!T) return {ok:true,quality:1};
  const U0=userStrokes.filter(s=>s.length>0);
  if(U0.length!==T.norm.length) return {ok:false,reason:'count',expected:T.norm.length,got:U0.length};
  const U=normalize(U0);
  const sc=charScore(U,T.norm);
  const bad=sc.per.map((d,i)=>d>=thr?i:-1).filter(i=>i>=0);
  if(bad.length===0){
    // make sure it does not look more like another character
    const base=SMALL_PAIRS[target]||target;
    let best=null;
    for(const c of candidates){
      if(c===target||c===base||SMALL_PAIRS[c]===base) continue;
      const t=TPL[c]; if(!t||t.norm.length!==U.length) continue;
      const s=charScore(U,t.norm);
      if(s.max<thr && s.avg<sc.avg*0.8 && (!best||s.avg<best.avg)) best={c,avg:s.avg};
    }
    if(best) return {ok:false,reason:'similar',similar:best.c,per:sc.per,thr};
    return {ok:true,quality:Math.max(0,Math.min(1,1-sc.avg/thr)),per:sc.per,thr};
  }
  // diagnose: direction
  const rev=bad.filter(i=>sdistRev(U[i],T.norm[i])<thr);
  if(rev.length===bad.length) return {ok:false,reason:'direction',strokes:rev,per:sc.per,thr};
  // diagnose: order
  if(U.length>1&&U.length<=6){
    let bestP=null,bestMax=Infinity;
    for(const p of permutations(U.length)){
      let mx=0;for(let i=0;i<U.length;i++){const d=Math.min(sdist(U[i],T.norm[p[i]]),sdistRev(U[i],T.norm[p[i]]));if(d>mx)mx=d;if(mx>=bestMax)break;}
      if(mx<bestMax){bestMax=mx;bestP=p;}
    }
    if(bestMax<thr && bestP.some((v,i)=>v!==i)) return {ok:false,reason:'order',perm:bestP,per:sc.per,thr};
  }
  return {ok:false,reason:'shape',strokes:bad,per:sc.per,thr};
}

// ---- Lenient recognizer: stroke-order/direction independent point cloud ($P style) ----
const CN=48;
function cloudOf(strokes){
  strokes=strokes.filter(s=>s.length);
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const s of strokes)for(const [x,y] of s){if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y;}
  const cx=(x0+x1)/2,cy=(y0+y1)/2,sc=Math.max(x1-x0,y1-y0)||1;
  const lens=strokes.map(s=>Math.max(pathLen(s),sc*0.03)),tot=lens.reduce((a,b)=>a+b,0);
  const cnt=lens.map(l=>Math.max(1,Math.round(CN*l/tot)));
  let diff=CN-cnt.reduce((a,b)=>a+b,0);
  while(diff!==0){let k=cnt.indexOf(Math.max(...cnt));if(diff<0&&cnt[k]<=1)break;cnt[k]+=Math.sign(diff);diff-=Math.sign(diff);}
  const pts=[];strokes.forEach((s,i)=>{const r=cnt[i]===1?[s[Math.floor(s.length/2)]]:resample(s,cnt[i]);for(const [x,y] of r)pts.push([(x-cx)/sc,(y-cy)/sc]);});
  return pts;
}
function cloudRun(a,b,start){
  const n=a.length,m=b.length,used=new Uint8Array(m);let sum=0,i=start;
  for(let k=0;k<n;k++){let best=Infinity,bj=-1;
    for(let j=0;j<m;j++){if(used[j])continue;const d=Math.hypot(a[i][0]-b[j][0],a[i][1]-b[j][1]);if(d<best){best=d;bj=j;}}
    if(bj<0)break;used[bj]=1;sum+=(1-k/n)*best;i=(i+1)%n;}
  return sum;
}
function cloudDist(a,b){
  const n=Math.min(a.length,b.length),step=Math.max(1,Math.floor(Math.sqrt(n)));let best=Infinity;
  for(let i=0;i<a.length;i+=step){const d=Math.min(cloudRun(a,b,i),cloudRun(b,a,i%b.length));if(d<best)best=d;}
  return best/(n*0.5);
}
const CLOUD={};
function tplCloud(c){return CLOUD[c]||(CLOUD[c]=cloudOf(TPL[c].raw));}
const DAKU={が:'か',ぎ:'き',ぐ:'く',げ:'け',ご:'こ',ざ:'さ',じ:'し',ず:'す',ぜ:'せ',ぞ:'そ',だ:'た',ぢ:'ち',づ:'つ',で:'て',ど:'と',ば:'は',び:'ひ',ぶ:'ふ',べ:'へ',ぼ:'ほ',ぱ:'は',ぴ:'ひ',ぷ:'ふ',ぺ:'へ',ぽ:'ほ'};
const HANDAKU='ぱぴぷぺぽ';
const LEVELS={easy:{abs:0.22,ratio:1.45},normal:{abs:0.16,ratio:1.15}};
function famOf(c){return DAKU[c]||c;}
function eqv(a,b){const sa=SMALL_PAIRS[a]||a,sb=SMALL_PAIRS[b]||b;return sa===sb||famOf(sa)===famOf(sb);}
function isLoop(s){const L=pathLen(s);if(L<1)return false;const d=Math.hypot(s[0][0]-s[s.length-1][0],s[0][1]-s[s.length-1][1]);return d<0.35*L;}
function check(userStrokes,target,level,candidates){
  const L=LEVELS[level]||LEVELS.easy;
  const U=userStrokes.filter(s=>s.length);
  if(!U.length) return {ok:false,msg:'Scrivi prima il kana.'};
  const nT=TPL[target].raw.length,nU=U.length;
  const base=DAKU[target];
  if(base){
    const nB=TPL[base].raw.length;
    if(nU<=nB) return {ok:false,msg:HANDAKU.includes(target)?'Manca il cerchietto in alto a destra (゜).':'Mancano i due trattini in alto a destra (゛).'};
    const extra=U.slice(nB),loop=extra.some(isLoop);
    if(HANDAKU.includes(target)&&!loop&&extra.length>=2) return {ok:false,msg:'Qui ci vuole il cerchietto (゜), non i due trattini.'};
    if(!HANDAKU.includes(target)&&loop&&extra.length===1) return {ok:false,msg:'Qui ci vogliono i due trattini (゛), non il cerchietto.'};
  }
  // stroke-by-stroke check first: if the strokes are right, it passes
  let strokeRes=null;
  if(nU===nT){strokeRes=recognize(U,target,'soft',[]);}
  const uc=cloudOf(U);
  const dT=cloudDist(uc,tplCloud(target));
  let best=null;
  for(const c of candidates){if(eqv(c,target)||!TPL[c])continue;const d=cloudDist(uc,tplCloud(c));if(!best||d<best.d)best={c,d};}
  const cloudPass=dT<L.abs&&(!best||dT<=best.d*L.ratio);
  const strokePass=strokeRes&&(strokeRes.ok||strokeRes.reason==='order'||strokeRes.reason==='direction');
  const tooSimilar=best&&best.d<dT*0.6; // clearly another kana
  if(!(cloudPass||(strokePass&&!tooSimilar))){
    if(best&&best.d<dT&&best.d<L.abs) return {ok:false,msg:`Sembra più ${best.c} (${(typeof RO!=='undefined'&&RO[best.c])||''}). Guarda il modello in grigio e riprova.`,similar:best.c,dist:dT};
    if(nU===nT){const a=strokeAdvice(U,target);if(a.tips.length)return {ok:false,msg:'Quasi. '+a.tips[0],hl:a.hl,dist:dT};}
    return {ok:false,msg:'Non lo riconosco ancora. Guarda il modello in grigio e riprova.',dist:dT};
  }
  let tips=[],hl=[];
  {const a=strokeAdvice(U,target);tips=a.tips;hl=a.hl;}
  const quality=Math.max(0,Math.min(1,1-dT/L.abs));
  return {ok:true,tips,hl,quality,dist:dT};
}

// ---- Concrete advice: what to change in a stroke ----
function sMeta(s){
  const n=s.length;let cx=0,cy=0;for(const [x,y] of s){cx+=x;cy+=y;}cx/=n;cy/=n;
  const a=s[0],b=s[n-1],ch=Math.hypot(b[0]-a[0],b[1]-a[1]);let L=0,dev=0;
  for(let i=1;i<n;i++)L+=Math.hypot(s[i][0]-s[i-1][0],s[i][1]-s[i-1][1]);
  for(const p of s){const d=ch>1e-6?Math.abs((b[0]-a[0])*(a[1]-p[1])-(a[0]-p[0])*(b[1]-a[1]))/ch:Math.hypot(p[0]-a[0],p[1]-a[1]);if(d>dev)dev=d;}
  return {cx,cy,a,b,L,ch,dev,curv:L>1e-6?dev/Math.max(L,0.05):0,ang:Math.atan2(b[1]-a[1],b[0]-a[0])};
}
function where(x,y){const v=y<-0.15?'in alto':y>0.15?'in basso':'',h=x<-0.15?'a sinistra':x>0.15?'a destra':'';return [v,h].filter(Boolean).join(' ')||'al centro';}
function fromWhere(x,y){const v=y<-0.15?'dall\u2019alto':y>0.15?'dal basso':'',h=x<-0.15?'sinistra':x>0.15?'destra':'';return v?(v+(h?' a '+h:'')):(h?'da '+h:'dal centro');}
function dirWords(dx,dy){
  const ax=Math.abs(dx),ay=Math.abs(dy);
  const h=(ax<0.08||ax<0.4*ay)?'':dx>0?'da sinistra verso destra':'da destra verso sinistra',v=(ay<0.08||ay<0.4*ax)?'':dy>0?'dall’alto verso il basso':'dal basso verso l’alto';
  if(h&&v) return (dy>0?'in giù':'in su')+' e '+(dx>0?'verso destra':'verso sinistra');
  return h||v||'come nel modello';
}
function describeStroke(t){
  const m=sMeta(t);
  if(m.L<0.16) return 'il trattino '+where(m.cx,m.cy);
  const deg=Math.abs(m.ang*180/Math.PI);
  let kind=m.curv>0.18?'la curva':(deg<25||deg>155)?'il tratto orizzontale':(deg>65&&deg<115)?'il tratto verticale':'il tratto obliquo';
  return kind+' '+where(m.cx,m.cy);
}
function bestPerm(C){ // C[i][j] cost: user stroke i vs template stroke j (square, small)
  const n=C.length;let best=null,bc=1e9;const p=[...Array(n).keys()];
  const rec=(k,acc)=>{if(acc>=bc)return;if(k===n){bc=acc;best=p.slice();return;}
    for(let i=k;i<n;i++){[p[k],p[i]]=[p[i],p[k]];rec(k+1,acc+C[k][p[k]]);[p[k],p[i]]=[p[i],p[k]];}};
  rec(0,0);return best;
}
function tiltWord(u,t){ // orientation-free tilt comparison, in words
  const a=x=>{let d=Math.abs(x*180/Math.PI)%180;return d>90?180-d:d;}; // 0=horizontal 90=vertical
  const ua=a(u.ang),ta=a(t.ang);if(Math.abs(ua-ta)<20)return '';
  if(ta<25)return 'tienilo più orizzontale';if(ta>65)return 'tienilo più verticale';
  return ua>ta?'inclinalo di più verso l’orizzontale':'inclinalo di più verso la verticale';
}
function shapeWhole(Uraw,target){ // proportions of the whole kana
  const bb=P=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;P.forEach(s=>s.forEach(([x,y])=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}));return [x1-x0,y1-y0];};
  const [uw,uh]=bb(Uraw),[tw,th]=bb(TPL[target].raw);
  if(tw<35||th<35||uh<1||uw<1)return '';
  const r=(uw/uh)/(tw/th);
  if(r>1.55)return 'Nel complesso è troppo largo e basso: stringilo e allungalo in verticale, come il modello.';
  if(r<0.64)return 'Nel complesso è troppo stretto e alto: allargalo un po’, come il modello.';
  return '';
}
function strokeAdvice(Uraw,target){
  // shape only: order and direction of the strokes are ignored on purpose
  const Tr=TPL[target].raw.map(t=>resample(t,RN));let Ur=Uraw.map(u=>resample(u,RN));
  const whole=shapeWhole(Uraw,target);
  if(Ur.length!==Tr.length) return whole?{tips:[whole],hl:[]}:{tips:[],hl:[]};
  // rough alignment by centroid + RMS radius (no correspondences needed)
  const norm=S0=>{let cx=0,cy=0,n=0;S0.forEach(s=>s.forEach(([x,y])=>{cx+=x;cy+=y;n++;}));cx/=n;cy/=n;let r=0;S0.forEach(s=>s.forEach(([x,y])=>{r+=(x-cx)**2+(y-cy)**2;}));r=Math.sqrt(r/n)||1;return S0.map(s=>s.map(([x,y])=>[(x-cx)/r,(y-cy)/r]));};
  const Un=norm(Ur),Tn=norm(Tr);
  const C=Un.map(u=>Tn.map(t=>Math.min(sdist(u,t),sdistRev(u,t))));
  const perm=bestPerm(C); // user stroke i <-> template stroke perm[i]
  const M=[];Ur.forEach((u,i)=>{const j=perm[i];M[j]=sdistRev(Un[i],Tn[j])<sdist(Un[i],Tn[j])?u.slice().reverse():u;});
  Ur=M; // user strokes now in template order and direction
  // least-squares translation + scale onto the template
  let ux=0,uy=0,tx=0,ty=0,n=0;Ur.forEach((u,i)=>u.forEach((q,k)=>{ux+=q[0];uy+=q[1];tx+=Tr[i][k][0];ty+=Tr[i][k][1];n++;}));ux/=n;uy/=n;tx/=n;ty/=n;
  let su=0,st=0;Ur.forEach((u,i)=>u.forEach((q,k)=>{su+=(q[0]-ux)**2+(q[1]-uy)**2;st+=(Tr[i][k][0]-tx)**2+(Tr[i][k][1]-ty)**2;}));
  const k0=Math.sqrt(st/Math.max(su,1e-6)),SC=90;
  const T=Tr.map(t=>t.map(([x,y])=>[(x-54.5)/SC,(y-54.5)/SC]));
  const U=Ur.map(u=>u.map(([x,y])=>[((x-ux)*k0+tx-54.5)/SC,((y-uy)*k0+ty-54.5)/SC]));
  const per=U.map((u,i)=>sdist(u,T[i]));
  let w=-1,wd=ADV_T;for(let i=0;i<U.length;i++)if(per[i]>wd){wd=per[i];w=i;}
  if(w<0) return whole?{tips:[whole],hl:[]}:{tips:[],hl:[]};
  const u=sMeta(U[w]),t=sMeta(T[w]),fix=[];
  const lr=u.L/Math.max(t.L,1e-6);
  if(lr<0.8)fix.push([(1-lr)*1.5,'corto','allungalo']);else if(lr>1.22)fix.push([(lr-1)*1.5,'lungo','accorcialo']);
  const dy=u.cy-t.cy,dx=u.cx-t.cx;
  if(dy>0.055)fix.push([dy*3,'in basso','alzalo']);else if(dy<-0.055)fix.push([-dy*3,'in alto','abbassalo']);
  if(dx>0.055)fix.push([dx*3,'a destra','spostalo a sinistra']);else if(dx<-0.055)fix.push([-dx*3,'a sinistra','spostalo a destra']);
  if(t.curv-u.curv>0.09)fix.push([(t.curv-u.curv)*3,'dritto','curvalo di più']);else if(u.curv-t.curv>0.12)fix.push([(u.curv-t.curv)*3,'curvo','tienilo più dritto']);
  const tw=tiltWord(u,t);if(tw&&t.ch>0.12)fix.push([0.5,'','tw:'+tw]);
  fix.sort((a,b)=>b[0]-a[0]);
  if(!fix.length) return whole?{tips:[whole],hl:[]}:{tips:[],hl:[]};
  const name=describeStroke(T[w]),f=fix.slice(0,2);
  const probs=f.filter(x=>x[1]).map(x=>'troppo '+x[1]),acts=f.map(x=>x[2].replace('tw:',''));
  const prob=probs.length?'è '+probs.join(' e '):'è storto';
  let txt=`Forma: ${name} ${prob}. ${acts.join(' e ').replace(/^./,c=>c.toUpperCase())}, confrontandolo con quello giallo.`;
  if(/^la /.test(name))txt=txt.replace(/\b(cort|lung|dritt|curv|stort)o\b/g,'$1a').replace(/\b(allunga|accorcia|alza|abbassa|sposta|curva|tieni|inclina|confrontando)lo\b/gi,'$1la').replace('quello giallo','quella gialla');
  return {tips:[txt],hl:[w]};
}
