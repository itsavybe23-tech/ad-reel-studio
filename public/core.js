/* ---------- core: platform specs, drawing, copy templates, zip (no DOM at top level) ---------- */
const PLATFORMS = {
  tiktok:   {id:'tiktok', name:'TikTok', w:1080,h:1920, ratio:'9:16', dur:15,
             safe:{t:160,r:150,b:500,l:70}, zones:{t:'Following / For You', r:'Like, comment, share', b:'Caption, sound, nav'}},
  reels:    {id:'reels', name:'Instagram Reels', w:1080,h:1920, ratio:'9:16', dur:12,
             safe:{t:220,r:130,b:440,l:70}, zones:{t:'Reels header', r:'Actions', b:'Caption, audio, nav'}},
  shorts:   {id:'shorts', name:'YouTube Shorts', w:1080,h:1920, ratio:'9:16', dur:20,
             safe:{t:240,r:190,b:460,l:70}, zones:{t:'Search, menu', r:'Like, dislike, share', b:'Title, channel, subscribe'}},
  pinterest:{id:'pinterest', name:'Pinterest', w:1000,h:1500, ratio:'2:3', dur:10,
             safe:{t:130,r:70,b:280,l:70}, zones:{t:'Close, menu', b:'Title, link button'}},
  x:        {id:'x', name:'X', w:1280,h:720, ratio:'16:9', dur:10,
             safe:{t:50,r:70,b:100,l:70}, zones:{b:'Player controls'}}
};
const PLATFORM_ORDER = ['tiktok','reels','shorts','pinterest','x'];
function platformDims(id, xFormat){
  const P = PLATFORMS[id];
  if (id==='x' && xFormat==='1:1') return Object.assign({}, P, {w:1080,h:1080,ratio:'1:1',safe:{t:70,r:70,b:120,l:70}});
  return P;
}
const FONTS = {
  anton:   {label:'Anton (condensed)', head:'"Anton", Impact, "Arial Narrow", sans-serif', w:400, upper:true},
  archivo: {label:'Archivo Black', head:'"Archivo Black", "Arial Black", sans-serif', w:400, upper:false},
  serif:   {label:'DM Serif Display', head:'"DM Serif Display", Georgia, serif', w:400, upper:false},
  poppins: {label:'Poppins ExtraBold', head:'"Poppins", "Helvetica Neue", Arial, sans-serif', w:800, upper:false}
};
const BODY_FONT = '"Poppins", "Helvetica Neue", Arial, sans-serif';
const PRESETS = {spin:'Spin-in', kenburns:'Ken Burns', split:'Split reveal', callouts:'Feature callouts', slideshow:'Slideshow'};
const BGS = {gradient:'Brand gradient', blur:'Blurred photo', solid:'Solid brand'};

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const prog=(t,a,b)=>clamp((t-a)/(b-a));
const easeOutCubic=t=>1-Math.pow(1-t,3);
const easeInOut=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const easeOutBack=t=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)};

function hexRgb(h){h=String(h||'#000').replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16)||0;return [n>>16&255,n>>8&255,n&255]}
function rgba(h,a){const [r,g,b]=hexRgb(h);return `rgba(${r},${g},${b},${a})`}
function shade(h,f){const [r,g,b]=hexRgb(h);const m=f<0?0:255,k=Math.abs(f);return `rgb(${Math.round(r+(m-r)*k)},${Math.round(g+(m-g)*k)},${Math.round(b+(m-b)*k)})`}
function lum(h){const [r,g,b]=hexRgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b}
function onColor(h){return lum(h)>0.42?'#111318':'#FFFFFF'}

function wrapLines(ctx,text,maxW){
  const words=String(text||'').split(/\s+/).filter(Boolean); const lines=[]; let cur='';
  for(const w of words){const test=cur?cur+' '+w:w; if(!cur||ctx.measureText(test).width<=maxW){cur=test}else{lines.push(cur);cur=w}}
  if(cur)lines.push(cur); return lines;
}
function fitText(ctx,text,o){
  const fam=o.family, wt=o.weight||700, maxLines=o.maxLines||3, min=o.min||24; let s=o.size||96;
  while(s>min){ctx.font=`${wt} ${s}px ${fam}`;const L=wrapLines(ctx,text,o.maxW);
    if(L.length<=maxLines&&L.every(l=>ctx.measureText(l).width<=o.maxW))return{size:s,lines:L};
    s-=Math.max(2,Math.round(s*.06));}
  ctx.font=`${wt} ${min}px ${fam}`; const L=wrapLines(ctx,text,o.maxW);
  if(L.length>maxLines){L.length=maxLines;L[maxLines-1]=L[maxLines-1].replace(/\s*\S*$/,'')+'…'}
  return{size:min,lines:L};
}
function roundRect(ctx,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function drawCover(ctx,img,iw,ih,x,y,w,h,zoom,px,py){
  const s=Math.max(w/iw,h/ih)*(zoom||1); const dw=iw*s,dh=ih*s;
  ctx.drawImage(img,x+(w-dw)/2+(px||0)*(dw-w)/2, y+(h-dh)/2+(py||0)*(dh-h)/2, dw, dh);
}
function containRect(iw,ih,x,y,w,h){const s=Math.min(w/iw,h/ih);const dw=iw*s,dh=ih*s;return{x:x+(w-dw)/2,y:y+(h-dh)/2,w:dw,h:dh}}

function timeline(D){
  const endLen=Math.min(3.2,Math.max(2.2,D*.28));
  const endStart=D-endLen, hookEnd=Math.min(2.8,D*.24);
  return {endStart,endLen,hookEnd,featStart:hookEnd,featEnd:endStart-.1};
}
function layoutFor(P){
  const W=P.w,H=P.h,sf=P.safe; const top=sf.t,bot=H-sf.b,U=bot-top; const safeW=W-sf.l-sf.r;
  const unit=Math.min(W,H)/1080;
  if(W/H>1.3){ // landscape
    const colW=W*.46-sf.l;
    return {o:'h',unit,top,bot,U,safeW,
      hook:{x:sf.l,y:top+U*.08,w:colW,size:84*unit,lines:3},
      prod:{x:W*.5,y:top+U*.04,w:W-sf.r-W*.5,h:U*.92},
      feat:{x:sf.l,y:top+U*.74,w:colW,align:'left'},
      end:{thumb:{x:W*.56,y:top+U*.08,w:W-sf.r-W*.56,h:U*.84},text:{x:sf.l,w:W*.5-sf.l,cy:top+U*.5},k:1}};
  }
  const sq=W/H>0.85;
  return {o:sq?'s':'v',unit,top,bot,U,safeW,
    hook:{x:sf.l,y:top+U*.02,w:safeW,size:(sq?86:100)*unit,lines:3},
    prod:{x:sf.l+safeW*.02,y:top+U*(sq?.23:.27),w:safeW*.96,h:U*(sq?.52:.56)},
    feat:{x:sf.l,y:top+U*(sq?.87:.90),w:safeW,align:'center'},
    end:{thumb:{x:sf.l+safeW*.08,y:top+U*.03,w:safeW*.84,h:U*(sq?.36:.44)},text:{x:sf.l,w:safeW,cy:top+U*(sq?.71:.75)},k:sq?1.05:1.2}};
}

function drawBg(ctx,W,H,t,st,hero){
  if(st.bg==='blur'&&hero&&hero.blur){
    drawCover(ctx,hero.blur,hero.blur.width,hero.blur.height,0,0,W,H,1.15+.05*Math.sin(t*.4),0,0);
    ctx.fillStyle='rgba(0,0,0,.38)';ctx.fillRect(0,0,W,H);return;
  }
  ctx.fillStyle=st.brand;ctx.fillRect(0,0,W,H);
  if(st.bg==='solid')return;
  const g=ctx.createLinearGradient(0,0,W*.35,H);g.addColorStop(0,shade(st.brand,.16));g.addColorStop(1,shade(st.brand,-.5));
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const cx=W*(.5+.25*Math.sin(t*.5)),cy=H*(.42+.1*Math.cos(t*.4)),r=Math.max(W,H)*.6;
  const rg=ctx.createRadialGradient(cx,cy,0,cx,cy,r);rg.addColorStop(0,rgba(st.accent,.32));rg.addColorStop(1,rgba(st.accent,0));
  ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
}
function scrims(ctx,W,H){
  let g=ctx.createLinearGradient(0,0,0,H*.42);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H*.42);
  g=ctx.createLinearGradient(0,H*.5,0,H);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.62)');ctx.fillStyle=g;ctx.fillRect(0,H*.5,W,H*.5);
}
function productCard(ctx,img,r,radius,unit){
  ctx.save();ctx.shadowColor='rgba(0,0,0,.38)';ctx.shadowBlur=70*unit;ctx.shadowOffsetY=34*unit;
  roundRect(ctx,r.x,r.y,r.w,r.h,radius);ctx.fillStyle='#fff';ctx.fill();ctx.restore();
  ctx.save();roundRect(ctx,r.x,r.y,r.w,r.h,radius);ctx.clip();ctx.drawImage(img.src,r.x,r.y,r.w,r.h);ctx.restore();
}

function drawText(ctx,lines,size,x,y,w,align,opt){
  // lines with optional per-line boxes; returns height used
  const lh=size*(opt.lh||1.12), padX=size*.32, padY=size*.12; let yy=y;
  ctx.textBaseline='middle';ctx.textAlign='left';
  for(const line of lines){
    const tw=ctx.measureText(line).width; const bw=tw+padX*2;
    let bx=align==='center'?x+(w-bw)/2:x; bx=Math.max(x-padX*.5,bx);
    const cy=yy+lh/2;
    if(opt.box){ctx.fillStyle=opt.box;roundRect(ctx,bx,cy-lh/2+padY*.2,bw,lh-padY*.4,size*.16);ctx.fill();}
    if(opt.shadow){ctx.save();ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=size*.35;ctx.shadowOffsetY=size*.06;}
    ctx.fillStyle=opt.color;ctx.fillText(line,bx+padX,cy+size*.04);
    if(opt.shadow)ctx.restore();
    yy+=lh+(opt.box?size*.1:0);
  }
  return yy-y;
}
function textOpts(st){
  if(st.textStyle==='accent')return{box:st.accent,color:onColor(st.accent)};
  if(st.textStyle==='shadow')return{box:null,color:'#FFFFFF',shadow:true};
  return{box:'#FFFFFF',color:'#111318'};
}

function drawFrame(ctx,P,t,D,S,A){
  const W=P.w,H=P.h,st=S.style,F=FONTS[st.font]||FONTS.anton,T=timeline(D),L=layoutFor(P),u=L.unit;
  const imgs=(A.images&&A.images.length)?A.images:[A.placeholder]; const hero=imgs[0];
  const cover=(st.preset==='kenburns'||st.preset==='slideshow');
  ctx.save();ctx.setTransform.apply(ctx,A.baseTransform||[1,0,0,1,0,0]);
  ctx.globalAlpha=1;ctx.clearRect(0,0,W,H);
  drawBg(ctx,W,H,t,st,hero);
  const pr=containRect(hero.w,hero.h,L.prod.x,L.prod.y,L.prod.w,L.prod.h);
  const rad=34*u;

  // ---- product layer
  if(st.preset==='kenburns'){
    const k=easeInOut(clamp(t/D));
    drawCover(ctx,hero.src,hero.w,hero.h,0,0,W,H,1.06+.16*k,lerp(-.6,.6,k),lerp(.3,-.3,k));scrims(ctx,W,H);
  }else if(st.preset==='slideshow'){
    const n=imgs.length, seg=Math.max(.5,T.endStart/n), idx=Math.min(n-1,Math.floor(t/seg)), local=clamp((t-idx*seg)/seg);
    const draw=(i,lt,a)=>{const im=imgs[i];ctx.globalAlpha=a;drawCover(ctx,im.src,im.w,im.h,0,0,W,H,1.05+.12*lt,(i%2?1:-1)*lerp(-.5,.5,lt),0);ctx.globalAlpha=1;};
    draw(idx,local,1);
    const fadeAt=1-Math.min(.5,.6/seg);
    if(idx<n-1&&local>fadeAt){draw(idx+1,0,easeInOut((local-fadeAt)/(1-fadeAt)));}
    scrims(ctx,W,H);
  }else if(st.preset==='spin'){
    const p=prog(t,.1,1.3),e=easeOutBack(p),a=prog(t,.1,.45);
    const sc=lerp(.25,1,e)*(1+.015*Math.sin(t*1.3)), rot=(1-easeOutCubic(p))*-.55+.02*Math.sin(t*.9), fy=Math.sin(t*1.6)*8*u;
    ctx.save();ctx.globalAlpha=a;ctx.translate(pr.x+pr.w/2,pr.y+pr.h/2+fy);ctx.rotate(rot);ctx.scale(sc,sc);
    productCard(ctx,hero,{x:-pr.w/2,y:-pr.h/2,w:pr.w,h:pr.h},rad,u);ctx.restore();
  }else if(st.preset==='split'){
    const e=easeOutCubic(prog(t,.05,1.0)), z=1+.03*clamp(t/D);
    const r={x:pr.x+pr.w*(1-z)/2,y:pr.y+pr.h*(1-z)/2,w:pr.w*z,h:pr.h*z};
    const off=(1-e)*W*.75;
    ctx.save();ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=60*u;ctx.shadowOffsetY=30*u;ctx.fillStyle='#fff';
    if(e>.98){roundRect(ctx,r.x,r.y,r.w,r.h,rad);ctx.fill();}ctx.restore();
    for(const side of [0,1]){
      ctx.save();ctx.translate(side?off:-off,0);roundRect(ctx,r.x,r.y,r.w,r.h,rad);ctx.clip();
      ctx.beginPath();ctx.rect(r.x+(side?r.w/2:0)-(side?0:1),r.y,r.w/2+1,r.h);ctx.clip();
      ctx.drawImage(hero.src,r.x,r.y,r.w,r.h);ctx.restore();
    }
    const bar=prog(t,.6,1.1); if(bar>0&&bar<1){ctx.fillStyle=rgba(st.accent,1-bar);const bh=r.h*easeOutCubic(bar);ctx.fillRect(r.x+r.w/2-5*u,r.y+(r.h-bh)/2,10*u,bh);}
  }else{ // callouts
    const a=prog(t,0,.5), z=lerp(.94,1,easeOutCubic(prog(t,0,1)))+.02*clamp(t/D);
    const r={x:pr.x+pr.w*(1-z)/2,y:pr.y+pr.h*(1-z)/2,w:pr.w*z,h:pr.h*z};
    ctx.save();ctx.globalAlpha=a;productCard(ctx,hero,r,rad,u);ctx.restore();
  }

  const tOpt=textOpts(st);
  const headFam=F.head, up=s=>F.upper?String(s).toUpperCase():String(s);
  const inMain=t<T.endStart+.35;

  // ---- hook, then product name
  if(inMain){
    const hk=(S.copy.hook||'').trim();
    if(hk&&t<T.hookEnd){
      const pin=easeOutBack(prog(t,.12,.5)), pout=prog(t,T.hookEnd-.35,T.hookEnd);
      ctx.save();ctx.globalAlpha=clamp(pin)*(1-pout);
      ctx.font=`${F.w} ${L.hook.size}px ${headFam}`;
      const ft=fitText(ctx,up(hk),{family:headFam,weight:F.w,maxW:L.hook.w*.92,maxLines:L.hook.lines,size:L.hook.size,min:40*u});
      ctx.font=`${F.w} ${ft.size}px ${headFam}`;
      const cx=L.hook.x+L.hook.w/2,cy=L.hook.y+ft.size;
      ctx.translate(cx,cy);ctx.scale(lerp(.85,1,pin),lerp(.85,1,pin));ctx.translate(-cx,-cy);
      drawText(ctx,ft.lines,ft.size,L.hook.x,L.hook.y,L.hook.w,L.o==='h'?'left':'center',tOpt);
      ctx.restore();
    }
    const nm=(S.product.name||'').trim();
    if(nm&&t>=T.hookEnd-.1){
      const a=prog(t,T.hookEnd-.1,T.hookEnd+.4)*(1-prog(t,T.endStart,T.endStart+.3));
      ctx.save();ctx.globalAlpha=a;
      const sz=(L.o==='h'?72:80)*u;
      const ft=fitText(ctx,up(nm),{family:headFam,weight:F.w,maxW:L.hook.w*.92,maxLines:2,size:sz,min:36*u});
      ctx.font=`${F.w} ${ft.size}px ${headFam}`;
      drawText(ctx,ft.lines,ft.size,L.hook.x,L.hook.y+(1-easeOutCubic(prog(t,T.hookEnd-.1,T.hookEnd+.4)))*30*u,L.hook.w,L.o==='h'?'left':'center',{color:'#FFFFFF',shadow:true});
      ctx.restore();
    }
  }

  // ---- features
  const feats=(S.product.features||[]).map(s=>String(s||'').trim()).filter(Boolean);
  if(feats.length&&inMain){
    const span=T.featEnd-T.featStart, slot=span/feats.length;
    if(st.preset==='callouts'){
      for(let i=0;i<feats.length;i++){
        const t0=T.featStart+i*slot; if(t<t0)continue;
        const a=easeOutCubic(prog(t,t0,t0+.45))*(1-prog(t,T.endStart,T.endStart+.3));
        const right=i%2===1; const py=pr.y+pr.h*(.18+.32*i);
        const dotX=pr.x+pr.w*(right?.72:.28);
        ctx.save();ctx.globalAlpha=a;
        const fs=(L.o==='h'?38:48)*u;
        const ft=fitText(ctx,feats[i],{family:BODY_FONT,weight:700,maxW:(L.o==='h'?L.prod.w*.8:L.safeW*.72),maxLines:2,size:fs,min:28*u});
        ctx.font=`700 ${ft.size}px ${BODY_FONT}`;
        const tw=Math.max(...ft.lines.map(l=>ctx.measureText(l).width)); const bw=tw+ft.size*1.1, bh=ft.lines.length*ft.size*1.2+ft.size*.7;
        let bx=right?Math.min(dotX+30*u,W-P.safe.r-bw):Math.max(P.safe.l,dotX-30*u-bw);
        bx=clamp(bx,P.safe.l,W-P.safe.r-bw); const by=py-bh/2+(1-a)*20*u;
        ctx.strokeStyle='#FFFFFF';ctx.lineWidth=4*u;ctx.beginPath();ctx.moveTo(dotX,py);ctx.lineTo(right?bx:bx+bw,py);ctx.stroke();
        ctx.fillStyle=st.accent;ctx.beginPath();ctx.arc(dotX,py,14*u,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=5*u;ctx.stroke();
        ctx.save();ctx.shadowColor='rgba(0,0,0,.3)';ctx.shadowBlur=24*u;ctx.shadowOffsetY=8*u;ctx.fillStyle='#FFFFFF';roundRect(ctx,bx,by,bw,bh,bh>ft.size*2?ft.size*.5:bh/2);ctx.fill();ctx.restore();
        ctx.fillStyle='#111318';ctx.textBaseline='middle';ctx.textAlign='left';
        ft.lines.forEach((l,j)=>ctx.fillText(l,bx+ft.size*.55,by+ft.size*.35+ft.size*1.2*(j+.5)));
        ctx.restore();
      }
    }else if(t>=T.featStart){
      const i=Math.min(feats.length-1,Math.floor((t-T.featStart)/slot)); const t0=T.featStart+i*slot;
      const a=easeOutCubic(prog(t,t0,t0+.35))*(1-prog(t,t0+slot-.25,t0+slot));
      ctx.save();ctx.globalAlpha=a;
      const fs=(L.o==='h'?46:L.o==='s'?50:56)*u;
      const ft=fitText(ctx,feats[i],{family:BODY_FONT,weight:700,maxW:L.feat.w-fs*1.7,maxLines:2,size:fs,min:28*u});
      ctx.font=`700 ${ft.size}px ${BODY_FONT}`;
      const tw=Math.max(...ft.lines.map(l=>ctx.measureText(l).width)); const ck=ft.size*1.05;
      const bw=tw+ck+ft.size*1.4, bh=ft.lines.length*ft.size*1.22+ft.size*.75;
      const bx=L.feat.align==='center'?L.feat.x+(L.feat.w-bw)/2:L.feat.x, by=L.feat.y-bh/2+(1-a)*28*u;
      ctx.save();ctx.shadowColor='rgba(0,0,0,.3)';ctx.shadowBlur=28*u;ctx.shadowOffsetY=10*u;ctx.fillStyle='#FFFFFF';roundRect(ctx,bx,by,bw,bh,Math.min(bh/2,ft.size*.9));ctx.fill();ctx.restore();
      const cx=bx+ft.size*.5+ck/2, cy=by+bh/2;
      ctx.fillStyle=st.accent;ctx.beginPath();ctx.arc(cx,cy,ck/2,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=onColor(st.accent);ctx.lineWidth=ck*.13;ctx.lineCap='round';ctx.lineJoin='round';
      ctx.beginPath();ctx.moveTo(cx-ck*.22,cy+ck*.01);ctx.lineTo(cx-ck*.05,cy+ck*.18);ctx.lineTo(cx+ck*.24,cy-ck*.16);ctx.stroke();
      ctx.fillStyle='#111318';ctx.textBaseline='middle';ctx.textAlign='left';
      ft.lines.forEach((l,j)=>ctx.fillText(l,bx+ft.size*.5+ck+ft.size*.4,by+ft.size*.375+ft.size*1.22*(j+.5)+ft.size*.03));
      ctx.restore();
    }
  }

  // ---- price badge
  const price=(S.product.price||'').trim();
  if(st.showPrice&&price&&inMain&&t>T.featStart-.2){
    const e=easeOutBack(prog(t,T.featStart-.2,T.featStart+.35)), a=1-prog(t,T.endStart,T.endStart+.3);
    const R=(L.o==='h'?92:112)*u;
    const bx=cover?(W-P.safe.r-R*1.05):(pr.x+pr.w-R*.55), by=cover?(L.top+L.U*(L.o==='h'?.62:.34)):(pr.y+R*.55);
    ctx.save();ctx.globalAlpha=clamp(a);ctx.translate(clamp(bx,P.safe.l+R,W-P.safe.r-R),by);ctx.rotate(-.14+.03*Math.sin(t*2));ctx.scale(Math.max(0,e),Math.max(0,e));
    ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=30*u;ctx.shadowOffsetY=12*u;
    ctx.fillStyle=st.accent;ctx.beginPath();
    for(let k=0;k<24;k++){const ang=k/24*Math.PI*2, rr=k%2?R*.9:R;ctx.lineTo(Math.cos(ang)*rr,Math.sin(ang)*rr);}ctx.closePath();ctx.fill();
    ctx.shadowColor='transparent';
    const ft=fitText(ctx,price,{family:headFam,weight:F.w,maxW:R*1.45,maxLines:1,size:R*.62,min:R*.3});
    ctx.font=`${F.w} ${ft.size}px ${headFam}`;ctx.fillStyle=onColor(st.accent);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(ft.lines[0]||price,0,ft.size*.04);
    ctx.restore();
  }

  // ---- end card
  if(t>=T.endStart){
    const e=easeOutCubic(prog(t,T.endStart,T.endStart+.5)), c=easeOutCubic(prog(t,T.endStart+.25,T.endStart+.75));
    ctx.save();ctx.translate(0,H*(1-e));
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,rgba(st.brand,.96));g.addColorStop(1,shade(st.brand,-.35));
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();
    if(c>0){
      ctx.save();ctx.globalAlpha=c;
      const tr=containRect(hero.w,hero.h,L.end.thumb.x,L.end.thumb.y,L.end.thumb.w,L.end.thumb.h);
      const s=lerp(.9,1,c);const tx=tr.x+tr.w*(1-s)/2,ty=tr.y+tr.h*(1-s)/2+(1-c)*30*u;
      productCard(ctx,hero,{x:tx,y:ty,w:tr.w*s,h:tr.h*s},28*u,u);
      const ink=onColor(st.brand); const tx0=L.end.text.x, tw=L.end.text.w;
      const nm=up((S.product.name||'').trim()||'Your product');
      const K=L.end.k||1;
      const nf=fitText(ctx,nm,{family:headFam,weight:F.w,maxW:tw*.9,maxLines:2,size:(L.o==='h'?78:88)*u*K,min:40*u});
      const pf=price&&st.showPrice?Math.round(54*u*K):0;
      const ctaTxt=((S.copy.cta||S.product.cta||'Shop now').trim()).toUpperCase();
      const cf=fitText(ctx,ctaTxt,{family:BODY_FONT,weight:800,maxW:tw*.75,maxLines:1,size:52*u*K,min:28*u});
      const link=(S.product.link||'').trim();
      const nameH=nf.lines.length*nf.size*1.08, btnH=cf.size*2.1, linkH=link?42*u*K*1.6:0;
      const total=nameH+(pf?pf*1.5:0)+28*u*K+btnH+linkH;
      let y=L.end.text.cy-total/2; const al=L.o==='h'?'left':'center';
      ctx.font=`${F.w} ${nf.size}px ${headFam}`;
      drawText(ctx,nf.lines,nf.size,tx0,y,tw,al,{color:ink,lh:1.08});y+=nameH;
      if(pf){ctx.font=`700 ${pf}px ${BODY_FONT}`;ctx.fillStyle=ink;ctx.globalAlpha=c*.92;ctx.textAlign=al==='center'?'center':'left';ctx.textBaseline='middle';ctx.fillText(price,al==='center'?tx0+tw/2:tx0+nf.size*.32,y+pf*.75);ctx.globalAlpha=c;y+=pf*1.5;}
      y+=28*u*K;
      ctx.font=`800 ${cf.size}px ${BODY_FONT}`;
      const bw=ctx.measureText(cf.lines[0]||ctaTxt).width+cf.size*2.2; const bx=al==='center'?tx0+(tw-bw)/2:tx0;
      const pulse=1+.035*Math.sin((t-T.endStart)*Math.PI*2*1.1)*prog(t,T.endStart+.8,T.endStart+1.1);
      ctx.save();ctx.translate(bx+bw/2,y+btnH/2);ctx.scale(pulse,pulse);
      ctx.shadowColor='rgba(0,0,0,.3)';ctx.shadowBlur=26*u;ctx.shadowOffsetY=10*u;ctx.fillStyle=st.accent;roundRect(ctx,-bw/2,-btnH/2,bw,btnH,btnH/2);ctx.fill();
      ctx.shadowColor='transparent';ctx.fillStyle=onColor(st.accent);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(cf.lines[0]||ctaTxt,0,cf.size*.05);ctx.restore();
      y+=btnH;
      if(link){const lf=fitText(ctx,link,{family:BODY_FONT,weight:500,maxW:tw*.95,maxLines:1,size:42*u*K,min:24*u});
        ctx.font=`500 ${lf.size}px ${BODY_FONT}`;ctx.fillStyle=ink;ctx.globalAlpha=c*.88;ctx.textAlign=al==='center'?'center':'left';ctx.textBaseline='middle';ctx.fillText(lf.lines[0],al==='center'?tx0+tw/2:tx0,y+linkH*.6);}
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawSafe(ctx,P){
  const W=P.w,H=P.h,s=P.safe,u=Math.min(W,H)/1080;
  ctx.save();ctx.fillStyle='rgba(255,70,60,.20)';
  ctx.fillRect(0,0,W,s.t);ctx.fillRect(0,H-s.b,W,s.b);ctx.fillRect(0,s.t,s.l,H-s.t-s.b);ctx.fillRect(W-s.r,s.t,s.r,H-s.t-s.b);
  ctx.setLineDash([16*u,12*u]);ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=3*u;ctx.strokeRect(s.l,s.t,W-s.l-s.r,H-s.t-s.b);
  ctx.setLineDash([]);ctx.font=`500 ${Math.round(24*u)}px "JetBrains Mono", monospace`;ctx.fillStyle='rgba(255,255,255,.9)';ctx.textBaseline='middle';
  const z=P.zones||{};
  if(z.t){ctx.textAlign='center';ctx.fillText(z.t.toUpperCase(),W/2,s.t/2);}
  if(z.b){ctx.textAlign='center';ctx.fillText(z.b.toUpperCase(),W/2,H-s.b/2);}
  if(z.r){ctx.save();ctx.translate(W-s.r/2,H/2);ctx.rotate(Math.PI/2);ctx.textAlign='center';ctx.fillText(z.r.toUpperCase(),0,0);ctx.restore();}
  ctx.restore();
}

/* ---------- copy templates ---------- */
const STOP=new Set('the a an and or for with your you our to of in on at by from this that is are be it its my as into over under up out more most best new every all any just can will has have make makes made than then so get gets one two oz ml'.split(' '));
function keywordsOf(p){
  const txt=[p.name,p.desc,...(p.features||[])].join(' ').toLowerCase();
  const words=txt.match(/[a-z][a-z0-9'-]{2,}/g)||[]; const m=new Map();
  words.forEach((w,i)=>{w=w.replace(/'s$/,'');if(STOP.has(w))return;m.set(w,(m.get(w)||0)+1+(i<6?.5:0))});
  return [...m.entries()].sort((a,b)=>b[1]-a[1]).map(e=>e[0]).slice(0,8);
}
function toTag(s){const w=String(s).replace(/[^a-z0-9 ]/gi,' ').split(/\s+/).filter(Boolean);return w.length?'#'+w.map(x=>x[0].toUpperCase()+x.slice(1).toLowerCase()).join(''):''}
function cap(s){s=String(s||'');return s?s[0].toUpperCase()+s.slice(1):s}
function clip(s,n){s=String(s);return s.length<=n?s:s.slice(0,n-1).replace(/\s+\S*$/,'')+'…'}
function uniqTags(a){const seen=new Set();return a.filter(x=>{if(!x)return false;const k=x.toLowerCase();if(seen.has(k))return false;seen.add(k);return true})}
function templateCopy(p){
  const name=(p.name||'').trim()||'This product', f=(p.features||[]).map(s=>String(s||'').trim()).filter(Boolean);
  const f1=f[0]||'Built to last', desc=(p.desc||'').trim().replace(/\.$/,''), link=(p.link||'').trim(), cta=(p.cta||'').trim()||'Shop now';
  const price=(p.price||'').trim(), priceBit=price?` for ${price}`:'';
  const kw=keywordsOf(p), nameTag=toTag(name), kwTags=kw.slice(0,4).map(toTag);
  const bullets=f.map(x=>'✓ '+x).join('\n');
  const where=link||'the link in bio';
  return {
    tiktok:{hook:clip(`POV: you finally found the ${name}`,60), cta:clip(cta,24),
      caption:clip(`${name}${priceBit}. ${f.slice(0,2).join('. ')}${f.length?'.':''} ${cta} at ${where}.`,300),
      hashtags:uniqTags([nameTag,kwTags[0],kwTags[1],'#TikTokMadeMeBuyIt','#FYP']).slice(0,5)},
    reels:{hook:clip(`${f1}. Seriously.`,60), cta:'Link in bio',
      caption:clip(`${f1}, and that's only the start.\n\n${desc?desc+'.\n\n':''}${bullets}${bullets?'\n\n':''}${cta}: tap the link in bio${link?' ('+link+')':''}.`,2200),
      hashtags:uniqTags([nameTag,...kwTags.slice(0,3),'#Reels']).slice(0,5)},
    shorts:{hook:clip(`${name} in ${f.length||3} reasons`,60), cta:clip(cta,24),
      title:clip(`${name}: ${f1} #Shorts`,100),
      description:clip(`${desc?desc+'. ':''}${f.join('. ')}${f.length?'.':''}\n\n${cta}: ${link||'see the link on my channel'}`,5000),
      hashtags:uniqTags(['#Shorts',nameTag,kwTags[0]]).slice(0,3)},
    pinterest:{hook:clip(`The ${name} everyone's saving`,60), cta:clip(cta,24),
      title:clip(`${name}${kw.length?' | '+kw.slice(0,3).map(cap).join(', '):''}`,100),
      description:clip(`${desc?desc+'. ':''}${f.join('. ')}${f.length?'. ':''}${kw.length?'Great pick for '+kw.slice(0,4).join(', ')+'. ':''}${cta} at ${link||'the link'}.`,500),
      keywords:kw.slice(0,6)},
    x:{hook:clip(`Meet the ${name}`,60), cta:clip(cta,24),
      post:clipX(`${name}${priceBit}\n\n${f.map(x=>'- '+x).join('\n')}${f.length?'\n\n':''}${cta}: ${link||'link below'}\n${nameTag}`)}
  };
}
function xLength(s){return String(s).replace(/https?:\/\/\S+/g,'x'.repeat(23)).length}
function clipX(s){while(xLength(s)>280)s=s.replace(/\s*\S+\s*$/,'');return s}

/* ---------- zip (store) ---------- */
const CRC_T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(u8){let c=0xFFFFFFFF;for(let i=0;i<u8.length;i++)c=CRC_T[(c^u8[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function makeZip(files){ // files: [{name, data:Uint8Array}]
  const enc=new TextEncoder(), parts=[], central=[]; let off=0;
  const d=new Date(), dt=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF, dd=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
  for(const f of files){
    const nm=enc.encode(f.name), crc=crc32(f.data), sz=f.data.length;
    const h=new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint16(10,dt,true);h.setUint16(12,dd,true);
    h.setUint32(14,crc,true);h.setUint32(18,sz,true);h.setUint32(22,sz,true);h.setUint16(26,nm.length,true);h.setUint16(28,0,true);
    parts.push(new Uint8Array(h.buffer),nm,f.data);
    const c=new DataView(new ArrayBuffer(46));
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,0,true);c.setUint16(12,dt,true);c.setUint16(14,dd,true);
    c.setUint32(16,crc,true);c.setUint32(20,sz,true);c.setUint32(24,sz,true);c.setUint16(28,nm.length,true);c.setUint16(30,0,true);c.setUint16(32,0,true);c.setUint16(34,0,true);c.setUint16(36,0,true);c.setUint32(38,0,true);c.setUint32(42,off,true);
    central.push(new Uint8Array(c.buffer),nm);
    off+=30+nm.length+sz;
  }
  const cdSize=central.reduce((a,b)=>a+b.length,0);
  const e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cdSize,true);e.setUint32(16,off,true);
  return [...parts,...central,new Uint8Array(e.buffer)];
}

/* ---------- overlays on a Higgsfield clip ----------
   A = {clip:{src,w,h}|null, hero:{src,w,h}}  clip is a <video> (or any drawable)
   S = {product, style, copy:{hook,cta}, overlay:{hook,name,features,price,endcard}, clipDur, endLen} */
function clipTimeline(S){
  const cd=Math.max(1,S.clipDur||8), endLen=S.overlay.endcard?(S.endLen||2.6):0;
  const D=cd+endLen, hookEnd=Math.min(3,Math.max(1.6,cd*.3));
  return {D,cd,endLen,endStart:S.overlay.endcard?cd:D+1,hookEnd,featStart:hookEnd+.2,featEnd:cd-.15};
}
function drawClipFrame(ctx,P,t,S,A){
  const W=P.w,H=P.h,st=S.style,F=FONTS[st.font]||FONTS.anton,T=clipTimeline(S),L=layoutFor(P),u=L.unit,ov=S.overlay;
  const hero=A.hero;
  ctx.save();ctx.setTransform.apply(ctx,A.baseTransform||[1,0,0,1,0,0]);
  ctx.globalAlpha=1;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  const src=A.clip||hero;
  if(src&&src.w&&src.h){
    if(A.clip){drawCover(ctx,src.src,src.w,src.h,0,0,W,H,1,0,0)}
    else{const k=clamp(t/T.D);drawCover(ctx,src.src,src.w,src.h,0,0,W,H,1.04+.08*k,0,0)}
  }
  const tOpt=textOpts(st), headFam=F.head, up=s=>F.upper?String(s).toUpperCase():String(s);
  const inMain=t<T.endStart+.35;
  // light scrims only where text sits
  if(inMain&&(ov.hook||ov.name||ov.features)){
    ctx.save();ctx.globalAlpha=.75;scrims(ctx,W,H);ctx.restore();
  }
  if(inMain&&ov.hook){
    const hk=(S.copy.hook||'').trim();
    if(hk&&t<T.hookEnd){
      const pin=easeOutBack(prog(t,.1,.45)), pout=prog(t,T.hookEnd-.35,T.hookEnd);
      ctx.save();ctx.globalAlpha=clamp(pin)*(1-pout);
      const ft=fitText(ctx,up(hk),{family:headFam,weight:F.w,maxW:L.hook.w*.92,maxLines:L.hook.lines,size:L.hook.size,min:40*u});
      ctx.font=`${F.w} ${ft.size}px ${headFam}`;
      const cx=L.hook.x+L.hook.w/2,cy=L.hook.y+ft.size;
      ctx.translate(cx,cy);ctx.scale(lerp(.85,1,pin),lerp(.85,1,pin));ctx.translate(-cx,-cy);
      drawText(ctx,ft.lines,ft.size,L.hook.x,L.hook.y,L.hook.w,L.o==='h'?'left':'center',tOpt);
      ctx.restore();
    }
  }
  if(inMain&&ov.name){
    const nm=(S.product.name||'').trim(), t0=ov.hook?T.hookEnd-.1:.2;
    if(nm&&t>=t0){
      const a=prog(t,t0,t0+.4)*(1-prog(t,T.endStart,T.endStart+.3));
      ctx.save();ctx.globalAlpha=a;
      const ft=fitText(ctx,up(nm),{family:headFam,weight:F.w,maxW:L.hook.w*.92,maxLines:2,size:(L.o==='h'?64:72)*u,min:34*u});
      ctx.font=`${F.w} ${ft.size}px ${headFam}`;
      drawText(ctx,ft.lines,ft.size,L.hook.x,L.hook.y,L.hook.w,L.o==='h'?'left':'center',{color:'#FFFFFF',shadow:true});
      ctx.restore();
    }
  }
  const feats=(S.product.features||[]).map(s=>String(s||'').trim()).filter(Boolean);
  if(ov.features&&feats.length&&inMain&&t>=T.featStart&&T.featEnd>T.featStart){
    const slot=(T.featEnd-T.featStart)/feats.length;
    const i=Math.min(feats.length-1,Math.floor((t-T.featStart)/slot)); const t0=T.featStart+i*slot;
    const a=easeOutCubic(prog(t,t0,t0+.35))*(1-prog(t,t0+slot-.25,t0+slot));
    ctx.save();ctx.globalAlpha=a;
    const fs=(L.o==='h'?42:L.o==='s'?46:52)*u;
    const ft=fitText(ctx,feats[i],{family:BODY_FONT,weight:700,maxW:L.feat.w-fs*1.7,maxLines:2,size:fs,min:28*u});
    ctx.font=`700 ${ft.size}px ${BODY_FONT}`;
    const tw=Math.max(...ft.lines.map(l=>ctx.measureText(l).width)); const ck=ft.size*1.05;
    const bw=tw+ck+ft.size*1.4, bh=ft.lines.length*ft.size*1.22+ft.size*.75;
    const bx=L.feat.align==='center'?L.feat.x+(L.feat.w-bw)/2:L.feat.x, by=L.feat.y-bh/2+(1-a)*28*u;
    ctx.save();ctx.shadowColor='rgba(0,0,0,.3)';ctx.shadowBlur=28*u;ctx.shadowOffsetY=10*u;ctx.fillStyle='#FFFFFF';roundRect(ctx,bx,by,bw,bh,Math.min(bh/2,ft.size*.9));ctx.fill();ctx.restore();
    const cx=bx+ft.size*.5+ck/2, cy=by+bh/2;
    ctx.fillStyle=st.accent;ctx.beginPath();ctx.arc(cx,cy,ck/2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=onColor(st.accent);ctx.lineWidth=ck*.13;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(cx-ck*.22,cy+ck*.01);ctx.lineTo(cx-ck*.05,cy+ck*.18);ctx.lineTo(cx+ck*.24,cy-ck*.16);ctx.stroke();
    ctx.fillStyle='#111318';ctx.textBaseline='middle';ctx.textAlign='left';
    ft.lines.forEach((l,j)=>ctx.fillText(l,bx+ft.size*.5+ck+ft.size*.4,by+ft.size*.375+ft.size*1.22*(j+.5)+ft.size*.03));
    ctx.restore();
  }
  const price=(S.product.price||'').trim();
  if(ov.price&&price&&inMain&&t>T.featStart-.2){
    const e=easeOutBack(prog(t,T.featStart-.2,T.featStart+.35)), a=1-prog(t,T.endStart,T.endStart+.3);
    const R=(L.o==='h'?84:100)*u, bx=W-P.safe.r-R*1.05, by=L.top+L.U*(L.o==='h'?.62:.36);
    ctx.save();ctx.globalAlpha=clamp(a);ctx.translate(bx,by);ctx.rotate(-.14+.03*Math.sin(t*2));ctx.scale(Math.max(0,e),Math.max(0,e));
    ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=30*u;ctx.shadowOffsetY=12*u;
    ctx.fillStyle=st.accent;ctx.beginPath();
    for(let k=0;k<24;k++){const ang=k/24*Math.PI*2, rr=k%2?R*.9:R;ctx.lineTo(Math.cos(ang)*rr,Math.sin(ang)*rr);}ctx.closePath();ctx.fill();
    ctx.shadowColor='transparent';
    const ft=fitText(ctx,price,{family:headFam,weight:F.w,maxW:R*1.45,maxLines:1,size:R*.62,min:R*.3});
    ctx.font=`${F.w} ${ft.size}px ${headFam}`;ctx.fillStyle=onColor(st.accent);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(ft.lines[0]||price,0,ft.size*.04);
    ctx.restore();
  }
  if(ov.endcard&&t>=T.endStart&&hero){
    // reuse the original end card: it reads S.product, S.copy, S.style and A.images[0]
    drawEndCard(ctx,P,t,T,S,hero,L,F,u,up,headFam,price);
  }
  ctx.restore();
}
function drawEndCard(ctx,P,t,T,S,hero,L,F,u,up,headFam,price){
  const W=P.w,H=P.h,st=S.style;
  const e=easeOutCubic(prog(t,T.endStart,T.endStart+.5)), c=easeOutCubic(prog(t,T.endStart+.25,T.endStart+.75));
  ctx.save();ctx.translate(0,H*(1-e));
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,st.brand);g.addColorStop(1,shade(st.brand,-.35));
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();
  if(c<=0)return;
  ctx.save();ctx.globalAlpha=c;
  const tr=containRect(hero.w,hero.h,L.end.thumb.x,L.end.thumb.y,L.end.thumb.w,L.end.thumb.h);
  const s=lerp(.9,1,c);const tx=tr.x+tr.w*(1-s)/2,ty=tr.y+tr.h*(1-s)/2+(1-c)*30*u;
  productCard(ctx,hero,{x:tx,y:ty,w:tr.w*s,h:tr.h*s},28*u,u);
  const ink=onColor(st.brand); const tx0=L.end.text.x, tw=L.end.text.w, K=L.end.k||1;
  const nm=up((S.product.name||'').trim()||'Your product');
  const nf=fitText(ctx,nm,{family:headFam,weight:F.w,maxW:tw*.9,maxLines:2,size:(L.o==='h'?78:88)*u*K,min:40*u});
  const pf=price&&S.overlay.price?Math.round(54*u*K):0;
  const ctaTxt=((S.copy.cta||S.product.cta||'Shop now').trim()).toUpperCase();
  const cf=fitText(ctx,ctaTxt,{family:BODY_FONT,weight:800,maxW:tw*.75,maxLines:1,size:52*u*K,min:28*u});
  const link=(S.product.link||'').trim();
  const nameH=nf.lines.length*nf.size*1.08, btnH=cf.size*2.1, linkH=link?42*u*K*1.6:0;
  const total=nameH+(pf?pf*1.5:0)+28*u*K+btnH+linkH;
  let y=L.end.text.cy-total/2; const al=L.o==='h'?'left':'center';
  ctx.font=`${F.w} ${nf.size}px ${headFam}`;
  drawText(ctx,nf.lines,nf.size,tx0,y,tw,al,{color:ink,lh:1.08});y+=nameH;
  if(pf){ctx.font=`700 ${pf}px ${BODY_FONT}`;ctx.fillStyle=ink;ctx.globalAlpha=c*.92;ctx.textAlign=al==='center'?'center':'left';ctx.textBaseline='middle';ctx.fillText(price,al==='center'?tx0+tw/2:tx0+nf.size*.32,y+pf*.75);ctx.globalAlpha=c;y+=pf*1.5;}
  y+=28*u*K;
  ctx.font=`800 ${cf.size}px ${BODY_FONT}`;
  const bw=ctx.measureText(cf.lines[0]||ctaTxt).width+cf.size*2.2; const bx=al==='center'?tx0+(tw-bw)/2:tx0;
  const pulse=1+.035*Math.sin((t-T.endStart)*Math.PI*2*1.1)*prog(t,T.endStart+.8,T.endStart+1.1);
  ctx.save();ctx.translate(bx+bw/2,y+btnH/2);ctx.scale(pulse,pulse);
  ctx.shadowColor='rgba(0,0,0,.3)';ctx.shadowBlur=26*u;ctx.shadowOffsetY=10*u;ctx.fillStyle=st.accent;roundRect(ctx,-bw/2,-btnH/2,bw,btnH,btnH/2);ctx.fill();
  ctx.shadowColor='transparent';ctx.fillStyle=onColor(st.accent);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(cf.lines[0]||ctaTxt,0,cf.size*.05);ctx.restore();
  y+=btnH;
  if(link){const lf=fitText(ctx,link,{family:BODY_FONT,weight:500,maxW:tw*.95,maxLines:1,size:42*u*K,min:24*u});
    ctx.font=`500 ${lf.size}px ${BODY_FONT}`;ctx.fillStyle=ink;ctx.globalAlpha=c*.88;ctx.textAlign=al==='center'?'center':'left';ctx.textBaseline='middle';ctx.fillText(lf.lines[0],al==='center'?tx0+tw/2:tx0,y+linkH*.6);}
  ctx.restore();
}
