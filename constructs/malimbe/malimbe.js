/* Malimbe Lodge · construct by BLACC Universal */
/* =========================================================
   CONFIG — set these before going live
   ========================================================= */
// Lodge pin. Approximate: west side of Oyo Road, opposite the IITA gate.
// Replace with the exact coordinates of the Malimbe gate.
const LODGE = { lat: 7.4962, lng: 3.9062 };
const IBADAN = { lat: 7.3775, lng: 3.9470 };      // city reference point
const IBADAN_RADIUS_M = 35000;                     // compass activates inside this radius
const DEMO_START = { lat: 7.4335, lng: 3.9178 };   // simulated start for the demo drive
// Paste a form endpoint (e.g. Formspree / Google Apps Script URL) to collect sign-ups.
const FORM_ENDPOINT = "";

/* =========================================================
   Gallery data
   ========================================================= */
const ROOMS = [1,2,3,4,5,6].map(n => ({src:`/constructs/malimbe/img/bedroom-${n}.webp`, label:`Room · ${String(n).padStart(2,'0')}`}));
const SPACES = [
  {src:'/constructs/malimbe/img/reception-1.webp', label:'Reception', cls:'b1'},
  {src:'/constructs/malimbe/img/living-1.webp', label:'Living room', cls:'b2'},
  {src:'/constructs/malimbe/img/restaurant-1.webp', label:'Indoor restaurant', cls:'b3'},
  {src:'/constructs/malimbe/img/bathroom-2.webp', label:'Bathroom', cls:'b4'},
  {src:'/constructs/malimbe/img/kitchen-2.webp', label:'Kitchen', cls:'b5'},
  {src:'/constructs/malimbe/img/restaurant-2.webp', label:'Restaurant / meeting room', cls:'b6'},
  {src:'/constructs/malimbe/img/living-3.webp', label:'Living room', cls:'b7'},
];
const ALL = [...ROOMS, ...SPACES, {src:'/constructs/malimbe/img/reception-2.webp',label:'Reception'},{src:'/constructs/malimbe/img/living-2.webp',label:'Living room'},{src:'/constructs/malimbe/img/bathroom-1.webp',label:'Bathroom'},{src:'/constructs/malimbe/img/kitchen-1.webp',label:'Kitchen'}];

const rail = document.getElementById('rail');
ROOMS.forEach((r,i)=>{
  const el=document.createElement('div'); el.className='room';
  el.innerHTML=`<div class="frame"><img src="${r.src}" alt="Culture-themed bedroom render ${i+1}" loading="lazy"></div><div class="room-meta mono"><b>${r.label}</b><span>Culture-themed suite</span></div>`;
  el.addEventListener('click',()=>openLB(ALL.indexOf(r)));
  rail.appendChild(el);
});
const bento=document.getElementById('bento');
SPACES.forEach(s=>{
  const el=document.createElement('div'); el.className='frame rv '+s.cls;
  el.innerHTML=`<img src="${s.src}" alt="${s.label} render" loading="lazy"><span class="tag mono">${s.label}</span>`;
  el.addEventListener('click',()=>openLB(ALL.indexOf(s)));
  bento.appendChild(el);
});
const step=()=>Math.min(rail.clientWidth*0.8,640);
document.getElementById('railPrev').onclick=()=>rail.scrollBy({left:-step(),behavior:'smooth'});
document.getElementById('railNext').onclick=()=>rail.scrollBy({left:step(),behavior:'smooth'});

/* Lightbox */
const lb=document.getElementById('lb'), lbImg=document.getElementById('lbImg'), lbCap=document.getElementById('lbCap');
let lbI=0;
function openLB(i){lbI=i;showLB();lb.classList.add('open');document.body.style.overflow='hidden'}
function showLB(){const it=ALL[(lbI+ALL.length)%ALL.length];lbImg.src=it.src;lbCap.textContent=`${it.label} — render · ${((lbI+ALL.length)%ALL.length)+1} / ${ALL.length}`}
function closeLB(){lb.classList.remove('open');document.body.style.overflow=''}
document.getElementById('lbClose').onclick=closeLB;
document.getElementById('lbPrev').onclick=e=>{e.stopPropagation();lbI--;showLB()};
document.getElementById('lbNext').onclick=e=>{e.stopPropagation();lbI++;showLB()};
lb.addEventListener('click',e=>{if(e.target===lb)closeLB()});
addEventListener('keydown',e=>{if(!lb.classList.contains('open'))return;if(e.key==='Escape')closeLB();if(e.key==='ArrowLeft'){lbI--;showLB()}if(e.key==='ArrowRight'){lbI++;showLB()}});

/* Nav */
const nav=document.getElementById('nav');
addEventListener('scroll',()=>nav.classList.toggle('scrolled',scrollY>30),{passive:true});
document.getElementById('burger').onclick=()=>document.body.classList.toggle('menu-open');
document.querySelectorAll('#mmenu a').forEach(a=>a.onclick=()=>document.body.classList.remove('menu-open'));
document.querySelectorAll('[data-interest]').forEach(a=>a.addEventListener('click',()=>{document.getElementById('f-int').value=a.dataset.interest}));

/* Reveal */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.rv').forEach(el=>io.observe(el));

/* Google Maps link */
const GMAPS=`https://www.google.com/maps/dir/?api=1&destination=${LODGE.lat},${LODGE.lng}`;
document.getElementById('gmapsLink').href=GMAPS;

/* Form */
document.getElementById('joinForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const f=e.target, msg=document.getElementById('formMsg');
  const name=f.name.value.trim(), email=f.email.value.trim();
  if(!name||!/^\S+@\S+\.\S+$/.test(email)){msg.className='form-msg';msg.textContent='Please add your name and a valid email.';return}
  if(!FORM_ENDPOINT){msg.className='form-msg';msg.textContent='Sign-ups open soon. The list isn’t connected yet.';return}
  try{
    const r=await fetch(FORM_ENDPOINT,{method:'POST',headers:{'Accept':'application/json'},body:new FormData(f)});
    if(!r.ok)throw 0;
    msg.className='form-msg ok';msg.textContent=`You're on the list, ${name.split(' ')[0]}. See you at the gate.`;f.reset();
  }catch(_){msg.className='form-msg';msg.textContent='Something went wrong. Please try again in a moment.'}
});

/* =========================================================
   WAYFINDER MAP
   ========================================================= */
(()=>{
const canvas=document.getElementById('map'), ctx=canvas.getContext('2d');
const stage=document.getElementById('stage');
const $=id=>document.getElementById(id);
const D2R=Math.PI/180;
const MLAT=110574, MLNG=111320*Math.cos(LODGE.lat*D2R);
const toW=p=>({x:(p.lng-LODGE.lng)*MLNG, y:-(p.lat-LODGE.lat)*MLAT});
function hav(a,b){const R=6371000,dLa=(b.lat-a.lat)*D2R,dLo=(b.lng-a.lng)*D2R;const s=Math.sin(dLa/2)**2+Math.cos(a.lat*D2R)*Math.cos(b.lat*D2R)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(s))}
function brg(a,b){const y=Math.sin((b.lng-a.lng)*D2R)*Math.cos(b.lat*D2R);const x=Math.cos(a.lat*D2R)*Math.sin(b.lat*D2R)-Math.sin(a.lat*D2R)*Math.cos(b.lat*D2R)*Math.cos((b.lng-a.lng)*D2R);return (Math.atan2(y,x)/D2R+360)%360}
const card=d=>['N','NE','E','SE','S','SW','W','NW'][Math.round(((d%360)+360)%360/45)%8];
const angDiff=(a,b)=>((b-a+540)%360)-180;
const fmtDist=m=>m<1000?`${Math.round(m)} m`:`${(m/1000).toFixed(m<10000?1:0)} km`;
const fmtEta=m=>{const min=Math.max(1,Math.round(m/1000/26*60));return min<60?`${min} min`:`${Math.floor(min/60)}h ${String(min%60).padStart(2,'0')}`};

/* ---- procedural street network (deterministic) ---- */
const C=150, GR=-15*D2R, cosG=Math.cos(GR), sinG=Math.sin(GR);
const g2w=(u,v)=>({x:u*cosG-v*sinG, y:u*sinG+v*cosG});
const w2g=(x,y)=>({u:x*cosG+y*sinG, v:-x*sinG+y*cosG});
function hash(i,j,k){let h=Math.imul(i|0,374761393)^Math.imul(j|0,668265263)^Math.imul(k+7,2246822519);h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296}
const mod=(a,n)=>((a%n)+n)%n;
const inForest=(i,j)=>i>=2&&i<=14&&j>=-10&&j<=6;
const exists=(i,j)=>!inForest(i,j);
const WA=70, warp=p=>({x:p.x+WA*(Math.sin(p.y/760+1.3)-Math.sin(1.3))+WA*.5*(Math.sin(p.y/310+.2)-Math.sin(.2)),
  y:p.y+WA*(Math.sin(p.x/830+.4)-Math.sin(.4))});
const vcache=new Map();
function vert(i,j){
  const k=i*100003+j; let v=vcache.get(k); if(v) return v;
  let ju=(hash(i,j,1)-.5)*.46*C, jv=(hash(i,j,2)-.5)*.46*C;
  if(mod(i,4)===0) ju*=.3; if(mod(j,4)===0) jv*=.3;
  if(i===1||(i===0&&j===0)) ju=0; if(i===0&&j===0) jv=0;
  v=warp(g2w(i*C+ju, j*C+jv)); if(vcache.size>200000) vcache.clear(); vcache.set(k,v); return v;
}
const edgeH=(i,j)=>exists(i,j)&&exists(i+1,j)&&(mod(j,4)===0||(i===0&&j===0)||hash(i,j,3)<.8);
const edgeV=(i,j)=>exists(i,j)&&exists(i,j+1)&&(mod(i,4)===0||i===1||hash(i,j,4)<.8);
const artH=j=>mod(j,4)===0, artV=i=>mod(i,4)===0||i===1;

/* ---- route: weighted A* over the grid ---- */
function nearestNode(w){
  const g=w2g(w.x,w.y); let bi=Math.round(g.u/C), bj=Math.round(g.v/C);
  if(!exists(bi,bj)){ // walk out of the forest
    let best=null,bd=1e18; for(let r=1;r<20&&!best;r++)for(let di=-r;di<=r;di++)for(let dj=-r;dj<=r;dj++){if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;if(exists(bi+di,bj+dj)){const p=vert(bi+di,bj+dj),d=(p.x-w.x)**2+(p.y-w.y)**2;if(d<bd){bd=d;best=[bi+di,bj+dj]}}}
    if(best){bi=best[0];bj=best[1]}
  }
  return [bi,bj];
}
function route(fromW){
  const [si,sj]=nearestNode(fromW), key=(i,j)=>i+','+j;
  const goal=key(0,0), open=[], gS=new Map(), came=new Map();
  const H=(i,j)=>{const p=vert(i,j);return Math.hypot(p.x,p.y)*.62*1.5};
  const push=(n)=>{open.push(n);let c=open.length-1;while(c>0){const p=(c-1)>>1;if(open[p].f<=open[c].f)break;[open[p],open[c]]=[open[c],open[p]];c=p}};
  const pop=()=>{const t=open[0],l=open.pop();if(open.length){open[0]=l;let c=0;for(;;){let a=2*c+1,b=a+1,m=c;if(a<open.length&&open[a].f<open[m].f)m=a;if(b<open.length&&open[b].f<open[m].f)m=b;if(m===c)break;[open[m],open[c]]=[open[c],open[m]];c=m}}return t};
  gS.set(key(si,sj),0); push({i:si,j:sj,f:H(si,sj)});
  let found=false, n=0;
  while(open.length&&n<60000){
    const cur=pop(), ck=key(cur.i,cur.j); n++;
    if(ck===goal){found=true;break}
    const g0=gS.get(ck), a=vert(cur.i,cur.j);
    const nb=[[1,0,edgeH(cur.i,cur.j),artH(cur.j)],[-1,0,edgeH(cur.i-1,cur.j),artH(cur.j)],[0,1,edgeV(cur.i,cur.j),artV(cur.i)],[0,-1,edgeV(cur.i,cur.j-1),artV(cur.i)]];
    for(const [di,dj,ok,art] of nb){ if(!ok)continue;
      const ni=cur.i+di,nj=cur.j+dj,b=vert(ni,nj);
      const w=Math.hypot(b.x-a.x,b.y-a.y)*((di===0&&cur.i===1)?.62:art?.8:1);
      const nk=key(ni,nj),ng=g0+w;
      if(ng<(gS.get(nk)??Infinity)){gS.set(nk,ng);came.set(nk,ck);push({i:ni,j:nj,f:ng+H(ni,nj)})}
    }
  }
  const pts=[{x:0,y:0}];
  if(found){let k=goal;while(came.has(k)){k=came.get(k);const [i,j]=k.split(',').map(Number);pts.push(vert(i,j))}}
  pts.push({x:fromW.x,y:fromW.y}); pts.reverse();
  // cumulative distances
  const cum=[0]; for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y));
  return {pts,cum,len:cum[cum.length-1]};
}
function pointAt(r,d){
  d=Math.max(0,Math.min(r.len,d)); let i=1; while(i<r.cum.length-1&&r.cum[i]<d)i++;
  const a=r.pts[i-1],b=r.pts[i],t=(d-r.cum[i-1])/((r.cum[i]-r.cum[i-1])||1);
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,seg:i,dir:(Math.atan2(b.x-a.x,-(b.y-a.y))/D2R+360)%360};
}
function nextTurn(r,d){
  const p=pointAt(r,d); let i=p.seg;
  for(;i<r.pts.length-1;i++){
    const a=r.pts[i-1],b=r.pts[i],c=r.pts[i+1];
    const v1={x:b.x-a.x,y:b.y-a.y},v2={x:c.x-b.x,y:c.y-b.y};
    const ang=Math.atan2(v1.x*v2.y-v1.y*v2.x, v1.x*v2.x+v1.y*v2.y)/D2R;
    if(Math.abs(ang)>32) return {dist:r.cum[i]-d, dir:ang>0?'right':'left', idx:i};
  }
  return null;
}

/* ---- view / state ---- */
let W=0,H=0,DPR=1;
const state={mode:'idle',user:null,userW:null,acc:null,heading:0,headSrc:'none',sensor:null,gpsCourse:null,route:null,prog:0,lastRouteFrom:null,demoT:0,arrivedAt:0};
const view={cx:0,cy:0,s:.16,rot:0,ox:.62,oy:.52};
let ambient=null;

const off=document.createElement('canvas'), octx=off.getContext('2d');
let offMeta=null;

function resize(){
  const r=canvas.getBoundingClientRect(); DPR=Math.min(devicePixelRatio||1,2);
  W=r.width;H=r.height; canvas.width=Math.round(W*DPR); canvas.height=Math.round(H*DPR); offMeta=null;
}
new ResizeObserver(resize).observe(canvas); resize();
const mobile=()=>W<721;

function renderStreets(){
  const Dpx=Math.ceil(Math.hypot(W,H))+80;
  off.width=Math.round(Dpx*DPR); off.height=Math.round(Dpx*DPR);
  const s=view.s, cx=view.cx, cy=view.cy;
  octx.setTransform(DPR,0,0,DPR,0,0); octx.clearRect(0,0,Dpx,Dpx);
  const tx=x=>(x-cx)*s+Dpx/2, ty=y=>(y-cy)*s+Dpx/2;
  const R=Dpx/2/s, cg=w2g(cx,cy);
  const i0=Math.floor((cg.u-R)/C)-1,i1=Math.ceil((cg.u+R)/C)+1,j0=Math.floor((cg.v-R)/C)-1,j1=Math.ceil((cg.v+R)/C)+1;
  const px=s*C; const lod=px>3.2?1:px*4>5?4:16; const ma=Math.min(1,Math.max(.35,(px-2)/8));

  // forest
  const fc=[];[[1.55,-10.5],[14.5,-10.5],[14.5,6.5],[1.55,6.5]].forEach(([u,v],k,a)=>{const [u2,v2]=a[(k+1)%4];for(let t=0;t<12;t++)fc.push(warp(g2w((u+(u2-u)*t/12)*C,(v+(v2-v)*t/12)*C)))});
  octx.beginPath(); fc.forEach((p,k)=>k?octx.lineTo(tx(p.x),ty(p.y)):octx.moveTo(tx(p.x),ty(p.y))); octx.closePath();
  const fg=octx.createLinearGradient(tx(fc[0].x),ty(fc[0].y),tx(fc[24].x),ty(fc[24].y));
  fg.addColorStop(0,'rgba(138,154,91,.20)');fg.addColorStop(1,'rgba(138,154,91,.07)');
  octx.fillStyle=fg; octx.fill();
  if(px>5){octx.fillStyle='rgba(170,200,140,.16)';
    for(let i=2;i<=14;i++)for(let j=-10;j<=6;j++)for(let k=0;k<4;k++){const p=warp(g2w((i-.45+hash(i,j,10+k))*C,(j-.5+hash(i,j,20+k))*C));octx.fillRect(tx(p.x),ty(p.y),1.2,1.2)}}

  const minor=new Path2D(), art=new Path2D(), major=new Path2D();
  const seg=(P,a,b)=>{P.moveTo(tx(a.x),ty(a.y));P.lineTo(tx(b.x),ty(b.y))};
  for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){
    if(lod>1&&mod(i,lod)!==0&&mod(j,lod)!==0&&i!==1)continue;
    if(edgeH(i,j)&&(lod===1||mod(j,lod)===0)) seg(artH(j)?art:minor,vert(i,j),vert(i+1,j));
    if(edgeV(i,j)&&(lod===1||mod(i,lod)===0||i===1)) seg(i===1?major:artV(i)?art:minor,vert(i,j),vert(i,j+1));
  }
  octx.lineCap='round';
  octx.strokeStyle=`rgba(239,230,223,${(.08*ma).toFixed(3)})`;octx.lineWidth=1;octx.stroke(minor);
  octx.strokeStyle='rgba(239,230,223,.14)';octx.lineWidth=lod>1?1:1.6;octx.stroke(art);
  octx.strokeStyle='rgba(239,230,223,.24)';octx.lineWidth=3.2;octx.stroke(major);
  offMeta={cx,cy,s,Dpx};
}

function W2S(p){ // world -> screen
  const dx=(p.x-view.cx)*view.s, dy=(p.y-view.cy)*view.s, c=Math.cos(-view.rot), si=Math.sin(-view.rot);
  return {x:W*view.ox+dx*c-dy*si, y:H*view.oy+dx*si+dy*c};
}

/* ---- drawing ---- */
function drawLabel(p,txt,sub,color,align){
  const q=W2S(p); ctx.textAlign=align||'center';
  ctx.font='500 10.5px Jost,sans-serif';ctx.letterSpacing='2px'; ctx.fillStyle=color||'rgba(239,230,223,.85)';
  ctx.fillText(txt,q.x,q.y); if(sub){ctx.font='400 9.5px Jost,sans-serif';ctx.fillStyle='rgba(239,233,220,.7)';ctx.fillText(sub,q.x,q.y+14)}
}
function drawRoute(r,fromD,t){
  if(!r)return;
  const pts=r.pts.map(W2S); const startI=pointAt(r,fromD).seg;
  const cur=W2S(pointAt(r,fromD));
  // travelled
  if(fromD>0){ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<startI;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.lineTo(cur.x,cur.y);
    ctx.strokeStyle='rgba(239,230,223,.28)';ctx.lineWidth=3;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke()}
  // ahead
  const end=pts[pts.length-1];
  const g=ctx.createLinearGradient(cur.x,cur.y,end.x,end.y); g.addColorStop(0,'#e6a15f'); g.addColorStop(1,'#c4532b');
  ctx.beginPath();ctx.moveTo(cur.x,cur.y);for(let i=startI;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
  ctx.save();ctx.shadowColor='rgba(222,140,80,.85)';ctx.shadowBlur=18;ctx.strokeStyle=g;ctx.lineWidth=3.2;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();ctx.restore();
  ctx.save();ctx.globalAlpha=.35;ctx.strokeStyle=g;ctx.lineWidth=9;ctx.filter='blur(6px)';ctx.stroke();ctx.restore();
  // travelling pulse
  const pd=fromD+((t/22)%Math.max(1,(r.len-fromD)));
  const pp=W2S(pointAt(r,pd)); const rg=ctx.createRadialGradient(pp.x,pp.y,0,pp.x,pp.y,16);
  rg.addColorStop(0,'rgba(255,220,190,.95)');rg.addColorStop(1,'rgba(217,138,80,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(pp.x,pp.y,16,0,7);ctx.fill();
}
function drawLodge(t){
  const q=W2S({x:0,y:0}), pulse=(t%2400)/2400;
  ctx.beginPath();ctx.arc(q.x,q.y,10+pulse*34,0,7);ctx.strokeStyle=`rgba(217,138,80,${.55*(1-pulse)})`;ctx.lineWidth=1.2;ctx.stroke();
  // pin
  ctx.save();ctx.translate(q.x,q.y-24);
  ctx.shadowColor='rgba(217,138,80,.8)';ctx.shadowBlur=16;
  ctx.beginPath();ctx.arc(0,0,13,Math.PI*.85,Math.PI*.15);ctx.quadraticCurveTo(6,12,0,22);ctx.quadraticCurveTo(-6,12,-12.1,5);ctx.closePath();
  ctx.fillStyle='#b8653a';ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle='#fff';ctx.globalAlpha=.95;
  // mini mark: arches
  ctx.lineWidth=1.6;ctx.strokeStyle='#fff';
  for(let k=0;k<3;k++){ctx.beginPath();ctx.arc(0,1,6.5-k*2.2,Math.PI,0);ctx.stroke()}
  ctx.restore();
  ctx.beginPath();ctx.arc(q.x,q.y,3.2,0,7);ctx.fillStyle='#fff';ctx.fill();
  ctx.beginPath();ctx.arc(q.x,q.y,6,0,7);ctx.strokeStyle='#b8653a';ctx.lineWidth=1.5;ctx.stroke();
  ctx.letterSpacing='3px';ctx.textAlign='center';ctx.font='600 11px Jost,sans-serif';ctx.fillStyle='#fff';ctx.fillText('MALIMBE LODGE',q.x,q.y+26);
}
function drawCompass(t){
  const u=W2S(state.userW), R=mobile()?62:78;
  // accuracy halo
  if(state.acc&&state.mode==='live'){const ar=Math.min(140,state.acc*view.s);ctx.beginPath();ctx.arc(u.x,u.y,ar,0,7);ctx.fillStyle='rgba(217,138,80,.06)';ctx.fill()}
  ctx.save();ctx.translate(u.x,u.y);
  // ring rotates with map (north follows map)
  ctx.rotate(-view.rot);
  ctx.beginPath();ctx.arc(0,0,R,0,7);ctx.strokeStyle='rgba(239,230,223,.18)';ctx.lineWidth=1;ctx.stroke();
  for(let a=0;a<360;a+=5){const big=a%30===0,r1=R-(big?9:4);ctx.beginPath();ctx.moveTo(Math.sin(a*D2R)*r1,-Math.cos(a*D2R)*r1);ctx.lineTo(Math.sin(a*D2R)*R,-Math.cos(a*D2R)*R);ctx.strokeStyle=big?'rgba(239,230,223,.55)':'rgba(239,230,223,.2)';ctx.lineWidth=1;ctx.stroke()}
  ctx.font='600 10px Jost,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  [['N',0],['E',90],['S',180],['W',270]].forEach(([l,a])=>{const x=Math.sin(a*D2R)*(R+13),y=-Math.cos(a*D2R)*(R+13);ctx.save();ctx.translate(x,y);ctx.rotate(view.rot);ctx.fillStyle=l==='N'?'#d98a50':'rgba(239,230,223,.6)';ctx.fillText(l,0,0);ctx.restore()});
  // lodge bearing chevron
  const b=brg(state.user,LODGE)*D2R;
  ctx.save();ctx.rotate(b);
  ctx.beginPath();ctx.arc(0,0,R,-Math.PI/2-.2,-Math.PI/2+.2);ctx.strokeStyle='#d98a50';ctx.lineWidth=3;ctx.shadowColor='#d98a50';ctx.shadowBlur=12;ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,-R-4);ctx.lineTo(-6,-R+7);ctx.lineTo(6,-R+7);ctx.closePath();ctx.fillStyle='#d98a50';ctx.fill();
  // dashed bearing line
  ctx.setLineDash([2,6]);ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(0,-R+10);ctx.strokeStyle='rgba(217,138,80,.6)';ctx.lineWidth=1.2;ctx.shadowBlur=0;ctx.stroke();ctx.setLineDash([]);
  ctx.restore();
  ctx.restore();
  if(state.headSrc==='none'){ctx.beginPath();ctx.arc(u.x,u.y,7,0,7);ctx.fillStyle='#d98a50';ctx.shadowColor='#d98a50';ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(u.x,u.y,11,0,7);ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=1.5;ctx.stroke();return}
  // user arrow (always points up = direction of travel/facing)
  ctx.save();ctx.translate(u.x,u.y);ctx.rotate(state.heading*D2R-view.rot);
  ctx.shadowColor='rgba(217,138,80,.9)';ctx.shadowBlur=14;
  ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(11,12);ctx.lineTo(0,6);ctx.lineTo(-11,12);ctx.closePath();
  const ag=ctx.createLinearGradient(0,-15,0,12);ag.addColorStop(0,'#e6a15f');ag.addColorStop(1,'#b8653a');ctx.fillStyle=ag;ctx.fill();
  ctx.restore();
  // scan sweep
  const sw=(t/1600)%1; ctx.beginPath();ctx.arc(u.x,u.y,R*sw,0,7);ctx.strokeStyle=`rgba(217,138,80,${.35*(1-sw)})`;ctx.lineWidth=1;ctx.stroke();
}
function drawScan(t){ // locating animation around lodge area center
  const c={x:W*view.ox,y:H*view.oy};
  for(let k=0;k<3;k++){const p=((t/1400)+k/3)%1;ctx.beginPath();ctx.arc(c.x,c.y,30+p*220,0,7);ctx.strokeStyle=`rgba(217,138,80,${.4*(1-p)})`;ctx.lineWidth=1;ctx.stroke()}
}

/* ---- HUD ---- */
const setStatus=(cls,txt)=>{const el=$('hudStatus');el.className='hud-status '+cls;$('hudStatusText').textContent=txt};
function setToast(text,sub,actions,arrowDeg){
  $('toastText').textContent=text; $('toastSub').textContent=sub||'';
  const box=$('toastActions'); box.innerHTML='';
  (actions||[]).forEach(a=>{const el=document.createElement(a.href?'a':'button');el.className='chip'+(a.hot?' hot':'');el.textContent=a.label;if(a.href){el.href=a.href;el.target='_blank';el.rel='noopener'}else el.onclick=a.fn;box.appendChild(el)});
  $('toastArrow').style.transform=`rotate(${arrowDeg||0}deg)`;
}
const A_MAPS={label:'Open in Google Maps',href:GMAPS};
const A_DEMO={label:'Run the demo',fn:()=>startDemo(),hot:true};
const A_RETRY={label:'Try again',fn:()=>start()};
const A_STOP={label:'Exit',fn:()=>stop()};
let lastHud=0;
function updateHud(t,force){
  if(!force&&t-lastHud<250)return; lastHud=t;
  if(!state.user)return;
  const r=state.route, rem=r?Math.max(0,r.len-state.prog):hav(state.user,LODGE);
  const straight=hav(state.user,LODGE), b=brg(state.user,LODGE);
  $('hudDist').textContent=fmtDist(rem); $('hudEta').textContent=fmtEta(rem);
  $('hudBearing').textContent=`${String(Math.round(b)).padStart(3,'0')}° ${card(b)}`;
  $('hudHeading').textContent=state.headSrc==='none'?'N-UP':`${String(Math.round((state.heading+360)%360)).padStart(3,'0')}°`;
  $('hudMeter').style.width=r?`${Math.max(4,Math.min(100,state.prog/r.len*100))}%`:'8%';
  $('hudCoord').textContent=`${state.user.lat.toFixed(4)}° N · ${state.user.lng.toFixed(4)}° E`;
  const delta=angDiff(state.heading,b);
  if(straight<70){setToast('You’ve arrived. Welcome to Malimbe Lodge.','Opposite IITA · Oyo Road',state.mode==='demo'?[A_STOP]:[],0);return}
  let txt,sub;
  const nt=r&&nextTurn(r,state.prog);
  if(nt&&nt.dist<1200) txt=`In ${fmtDist(Math.max(10,nt.dist))}, turn ${nt.dir}`;
  else if(r&&r.len-state.prog<400) txt=`Malimbe is ${Math.abs(delta)<25?'just ahead':delta>0?'ahead on your right':'ahead on your left'}`;
  else txt=`Continue ${fmtDist(nt?nt.dist:rem)} towards Malimbe`;
  const look=state.headSrc==='none'?`Lodge bears ${Math.round(b)}° ${card(b)}`:Math.abs(delta)<12?'Malimbe is dead ahead':`Malimbe: ${Math.round(Math.abs(delta))}° to your ${delta>0?'right':'left'}`;
  sub=`${look} · ${fmtDist(straight)} as the crow flies`;
  const arrow=nt&&nt.dist<1200?(nt.dir==='right'?90:-90):(state.headSrc==='none'?b:delta);
  setToast(txt,sub,state.mode==='demo'?[A_STOP,A_MAPS]:[A_MAPS],arrow);
}

/* ---- modes ---- */
let watchId=null;
function stop(){
  if(watchId!=null){navigator.geolocation.clearWatch(watchId);watchId=null}
  Object.assign(state,{mode:'idle',user:null,userW:null,route:null,prog:0,headSrc:'none',arrivedAt:0});
  setStatus('','Standby');
  ['hudDist','hudEta','hudBearing'].forEach(id=>$(id).textContent='—');$('hudHeading').textContent='N-UP';$('hudMeter').style.width='8%';
  $('hudCoord').textContent=`${LODGE.lat.toFixed(4)}° N · ${LODGE.lng.toFixed(4)}° E`;
  setToast('Tap “Guide me there” for a live compass.','Opposite IITA · Oyo Road · Ibadan',[A_DEMO,A_MAPS],0);
}
async function enableSensors(){
  try{ if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){await DeviceOrientationEvent.requestPermission()} }catch(_){}
  const h=e=>{let hd=null;if(e.webkitCompassHeading!=null&&!isNaN(e.webkitCompassHeading))hd=e.webkitCompassHeading;else if(e.absolute&&e.alpha!=null)hd=360-e.alpha;
    if(hd!=null){const so=(screen.orientation&&screen.orientation.angle)||window.orientation||0;state.sensor=(hd+so+360)%360}};
  addEventListener('deviceorientationabsolute',h,true); addEventListener('deviceorientation',h,true);
}
function start(){
  if(state.mode==='demo')stop();
  (mobile()?stage:document.getElementById('wayfinder')).scrollIntoView({behavior:'smooth',block:mobile()?'center':'start'});
  enableSensors();
  if(!('geolocation' in navigator)){blocked('This browser can’t share its location.');return}
  state.mode='locating'; setStatus('scan','Acquiring signal'); setToast('Acquiring your position…','Allow location access when your browser asks',[],0);
  let first=true;
  const timer=setTimeout(()=>{if(state.mode==='locating')blocked('No location signal yet.')},15000);
  try{
    watchId=navigator.geolocation.watchPosition(pos=>{
      clearTimeout(timer);
      const u={lat:pos.coords.latitude,lng:pos.coords.longitude};
      const fromCity=hav(u,IBADAN);
      if(fromCity>IBADAN_RADIUS_M){
        state.mode='outside';setStatus('','Outside Ibadan');
        const d=hav(u,LODGE);
        setToast(`You’re ${fmtDist(d)} away. The compass switches on once you’re in Ibadan.`,'From Lagos: ~90 mins via the Lagos–Ibadan Expressway',[A_MAPS,A_DEMO],0);
        $('hudDist').textContent=fmtDist(d);$('hudBearing').textContent=`${String(Math.round(brg(u,LODGE))).padStart(3,'0')}° ${card(brg(u,LODGE))}`;
        return;
      }
      state.mode='live'; state.user=u; state.userW=toW(u); state.acc=pos.coords.accuracy;
      if(pos.coords.heading!=null&&!isNaN(pos.coords.heading)&&(pos.coords.speed||0)>1.2)state.gpsCourse=pos.coords.heading;
      setStatus('live',`Live · GPS ±${Math.round(pos.coords.accuracy)} m`);
      if(first||!state.lastRouteFrom||Math.hypot(state.userW.x-state.lastRouteFrom.x,state.userW.y-state.lastRouteFrom.y)>60){
        state.route=route(state.userW); state.lastRouteFrom={...state.userW}; state.prog=0;
      } else {
        // project progress along existing route
        let best=0,bd=1e18; const r=state.route;
        for(let i=1;i<r.pts.length;i++){const a=r.pts[i-1],b=r.pts[i],vx=b.x-a.x,vy=b.y-a.y,L=vx*vx+vy*vy||1;let tt=((state.userW.x-a.x)*vx+(state.userW.y-a.y)*vy)/L;tt=Math.max(0,Math.min(1,tt));const px=a.x+vx*tt,py=a.y+vy*tt,d=(px-state.userW.x)**2+(py-state.userW.y)**2;if(d<bd){bd=d;best=r.cum[i-1]+Math.sqrt(L)*tt}}
        state.prog=best;
      }
      first=false; updateHud(performance.now(),true);
    },err=>{
      clearTimeout(timer);
      blocked(err.code===1?'Location access is turned off for this page.':'We couldn’t get a location fix.');
    },{enableHighAccuracy:true,maximumAge:2000,timeout:20000});
  }catch(_){clearTimeout(timer);blocked('Location isn’t available here.')}
}
function blocked(why){
  if(watchId!=null){navigator.geolocation.clearWatch(watchId);watchId=null}
  state.mode='blocked'; setStatus('','No signal');
  setToast(why,'Run the demo to see the compass on a simulated drive across Ibadan',[A_DEMO,A_RETRY,A_MAPS],0);
}
function startDemo(){
  if(watchId!=null){navigator.geolocation.clearWatch(watchId);watchId=null}
  state.mode='demo'; state.headSrc='demo';
  state.route=route(toW(DEMO_START)); state.prog=0; state.demoT=0; state.arrivedAt=0;
  const p=pointAt(state.route,0); state.userW={x:p.x,y:p.y}; state.user=DEMO_START; state.heading=p.dir; state.acc=null;
  setStatus('demo','Demo · Simulated drive');
  (mobile()?stage:document.getElementById('wayfinder')).scrollIntoView({behavior:'smooth',block:mobile()?'center':'start'});
  updateHud(performance.now(),true);
}
document.getElementById('guideBtn').addEventListener('click',start);

/* ---- frame loop ---- */
ambient=route({x:900,y:3600});
stop();
let last=performance.now();
const lerpA=(a,b,k)=>a+angDiff(a,b)*k;
let onScreen=false;
new IntersectionObserver(es=>{onScreen=es[0].isIntersecting;if(onScreen){last=performance.now();requestAnimationFrame(frame)}}).observe(canvas);
function frame(t){
  if(!onScreen)return;
  const dt=Math.min(64,t-last); last=t;
  if(W===0||H===0){requestAnimationFrame(frame);return}
  // demo motion
  if(state.mode==='demo'){
    const r=state.route;
    if(state.prog<r.len){state.prog=Math.min(r.len,state.prog+dt*0.11)}
    else if(!state.arrivedAt)state.arrivedAt=t;
    else if(t-state.arrivedAt>5000){state.prog=0;state.arrivedAt=0}
    const p=pointAt(r,state.prog); state.userW={x:p.x,y:p.y};
    state.user={lat:LODGE.lat-p.y/MLAT,lng:LODGE.lng+p.x/MLNG};
    const ahead=pointAt(r,state.prog+60);
    state.heading=lerpA(state.heading,ahead.dir+Math.sin(t/900)*4,Math.min(1,dt/260));
    updateHud(t);
  }
  if(state.mode==='live'){
    let target=null;
    if(state.sensor!=null){target=state.sensor;state.headSrc='sensor'}
    else if(state.gpsCourse!=null){target=state.gpsCourse;state.headSrc='gps'}
    else state.headSrc='none';
    if(target!=null)state.heading=lerpA(state.heading,target,Math.min(1,dt/180));
    updateHud(t);
  }
  // camera
  const tracking=(state.mode==='live'||state.mode==='demo')&&state.userW;
  let tcx,tcy,ts,trot,tox,toy;
  if(tracking){
    tox=mobile()?.5:.66; toy=mobile()?.66:.64;
    const u={x:W*tox,y:H*toy}, edge=Math.max(80,Math.min(u.x-(mobile()?20:W*.38),W-u.x-30,u.y-80,H-u.y-30));
    const d=Math.max(250,Math.hypot(state.userW.x,state.userW.y));
    ts=Math.max(.012,Math.min(.55,edge*.92/d));
    tcx=state.userW.x;tcy=state.userW.y;
    trot=state.headSrc==='none'?0:state.heading*D2R;
  } else {
    tox=mobile()?.5:.66; toy=mobile()?.56:.54; tcx=0; tcy=0; ts=mobile()?.2:.17;
    trot=Math.sin(t/14000)*.12;
  }
  const k=Math.min(1,dt/(tracking?220:600));
  view.cx+=(tcx-view.cx)*k; view.cy+=(tcy-view.cy)*k; view.s*=Math.pow(ts/view.s,k);
  view.rot+=(((trot-view.rot+Math.PI*3)%(Math.PI*2))-Math.PI)*k; view.ox+=(tox-view.ox)*k; view.oy+=(toy-view.oy)*k;

  // streets cache
  if(!offMeta||Math.abs(Math.log(view.s/offMeta.s))>.04||Math.hypot(view.cx-offMeta.cx,view.cy-offMeta.cy)*view.s>120)renderStreets();

  ctx.setTransform(DPR,0,0,DPR,0,0); ctx.clearRect(0,0,W,H); ctx.letterSpacing='0px';
  // streets layer: placed so its center maps to (offMeta.cx,offMeta.cy)
  ctx.save();
  const sc=view.s/offMeta.s, c0=W2S({x:offMeta.cx,y:offMeta.cy});
  ctx.translate(c0.x,c0.y); ctx.rotate(-view.rot); ctx.scale(sc,sc);
  ctx.drawImage(off,-offMeta.Dpx/2,-offMeta.Dpx/2,offMeta.Dpx,offMeta.Dpx);
  ctx.restore();

  // labels
  ctx.textBaseline='alphabetic';
  if(view.s>.05){
    const il=warp(g2w(8*C,-2*C)), ilq=W2S(il), lq=W2S({x:0,y:0});
    if(Math.hypot(ilq.x-lq.x,ilq.y-lq.y)>150) drawLabel(il,'IITA FOREST','1,000-acre research reserve','rgba(190,215,160,.75)');
    const oy=warp(g2w(1*C,-9*C)); const q=W2S(oy); ctx.save();ctx.translate(q.x+10,q.y);ctx.rotate(-view.rot+(-15*D2R)+Math.PI/2);ctx.font='500 9.5px Jost,sans-serif';ctx.fillStyle='rgba(239,230,223,.4)';ctx.textAlign='center';ctx.fillText('OYO ROAD',0,0);ctx.restore();
  }
  if(state.mode==='idle'||state.mode==='blocked'||state.mode==='outside'){
    drawRoute(ambient,0,t);
    drawLabel(ambient.pts[0],'FROM THE CITY','Sample route','rgba(239,230,223,.7)');
  }
  if(tracking) drawRoute(state.route,state.prog,t);
  drawLodge(t);
  ctx.letterSpacing='0px';
  if(state.mode==='locating') drawScan(t);
  if(tracking) drawCompass(t);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
