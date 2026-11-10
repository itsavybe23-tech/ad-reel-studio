/* Ad Reel Studio front end. Needs core.js (drawing, copy, zip), catalog.js and mp4-muxer. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const KEY='ars-v1', PHOTO_KEY='ars-photo';
const FPS=30, END_LEN=2.6;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function uuid(){return (crypto.randomUUID?crypto.randomUUID():'k'+Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9-]/g,'')}

/* ---------------- state ---------------- */
const DEF={
  product:{name:'',desc:'',features:['','',''],price:'',link:'',cta:''},
  cat:'aluminum',fit:'fit',style:'pro',scene:'hero',camera:'dolly',line:'',multiShot:true,
  model:'seedance2',res:'1080p',audio:true,
  plats:{tiktok:true,reels:true,shorts:true,pinterest:true,x:true},
  pin:'reuse',x:'reuse',
  durations:{vertical:10,pinterest:8,wide:8,square:8},
  prompts:{},shots:{},edited:{},jobs:{},frames:{},
  copy:null,copyEdited:false,
  overlay:{hook:true,name:true,features:true,price:false,endcard:true},
  look:{brand:'#1d2a44',accent:'#ff5a36',font:'anton',textStyle:'box',clipVol:1,musicVol:.35},
  pvPlat:'tiktok',copyTab:'tiktok'
};
function merge(d,s){if(s==null)return JSON.parse(JSON.stringify(d));if(typeof s!=='object'||Array.isArray(d))return s;const o={};for(const k of new Set([...Object.keys(d),...Object.keys(s)]))o[k]=(k in d&&d[k]&&typeof d[k]==='object'&&!Array.isArray(d[k]))?merge(d[k],s[k]):(s[k]===undefined?d[k]:s[k]);return o}
let S;try{S=merge(DEF,JSON.parse(localStorage.getItem(KEY)||'null'))}catch(e){S=JSON.parse(JSON.stringify(DEF))}
if(!Array.isArray(S.product.features))S.product.features=['','',''];
let persistT=0;function persist(){clearTimeout(persistT);persistT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}},250)}
const getPath=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
function setPath(o,p,v){const ks=p.split('.');let a=o;for(let i=0;i<ks.length-1;i++){if(a[ks[i]]==null)a[ks[i]]={};a=a[ks[i]]}a[ks[ks.length-1]]=v}

let MODELS={}, HF_READY=false;
const A={hero:null,clip:null};       // hero: product photo {src,w,h,id}
const clips={};                        // shape -> {el,url,blob,w,h,dur,jobId}
const audioCache={};                   // shape -> AudioBuffer|null
let musicBuf=null;
function clearAudio(shape){for(const k of Object.keys(audioCache))if(!shape||k.startsWith(shape+'|'))delete audioCache[k]}

/* ---------------- helpers ---------------- */
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),3800)}
async function api(path,opts){
  opts=opts||{};const h=Object.assign({'X-Requested-With':'ars'},opts.headers||{});
  let body=opts.body;if(body&&!(body instanceof Blob)&&typeof body==='object'){body=JSON.stringify(body);h['Content-Type']='application/json'}
  const r=await fetch(path,{method:opts.method||(body?'POST':'GET'),headers:h,body,credentials:'same-origin'});
  if(r.status===401){location.href='/login';throw new Error('Please sign in again.')}
  const j=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(j.error||('Request failed ('+r.status+')'));e.status=r.status;e.retryAfter=j.retryAfter;throw e}
  return j;
}
const cat=()=>catById(S.cat);
const model=()=>MODELS[S.model]||MODELS.seedance2;
function shapeOf(pid){if(pid==='pinterest')return S.pin==='reuse'?'vertical':'pinterest';if(pid==='x')return S.x==='reuse'?'vertical':S.x;return 'vertical'}
function neededShapes(){const set=new Set();PLATFORM_ORDER.forEach(p=>{if(S.plats[p])set.add(shapeOf(p))});return ['vertical','pinterest','wide','square'].filter(s=>set.has(s))}
function outDims(pid){
  if(pid==='x'){
    if(S.x==='reuse')return Object.assign({},PLATFORMS.x,{w:1080,h:1920,ratio:'9:16',safe:{t:120,r:110,b:300,l:70},zones:{b:'Post text and actions'}});
    if(S.x==='square')return platformDims('x','1:1');
    return PLATFORMS.x;
  }
  return PLATFORMS[pid];
}
function effFeatures(){const f=(S.product.features||[]).map(s=>String(s||'').trim()).filter(Boolean);return f.length?f:cat().features.slice()}
function scene(pid,clipDur){
  const c=(S.copy&&S.copy[pid])||{};
  return {product:Object.assign({},S.product,{features:effFeatures(),cta:S.product.cta||SHOPS[cat().shop].cta}),
    style:{brand:S.look.brand,accent:S.look.accent,font:S.look.font,textStyle:S.look.textStyle},
    copy:{hook:c.hook||'',cta:c.cta||S.product.cta||SHOPS[cat().shop].cta},
    overlay:S.overlay,clipDur:clipDur,endLen:END_LEN};
}
function slug(s){return String(s||'product').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'product'}
function fmtBytes(n){return n>1e6?(n/1e6).toFixed(1)+' MB':Math.round(n/1e3)+' KB'}
function clampDurations(){const M=model();for(const k of Object.keys(S.durations)){S.durations[k]=Math.max(M.duration.min,Math.min(M.duration.max,Math.round(S.durations[k]||M.duration.def)))}}

/* ---------------- chips and bindings ---------------- */
function chipGroup(el,opts,get,set){
  el.textContent='';
  for(const [v,label] of opts){const b=document.createElement('button');b.type='button';b.className='chip';b.setAttribute('role','radio');b.textContent=label;b.setAttribute('aria-checked',String(get()===v));
    b.onclick=()=>{set(v);persist();[...el.children].forEach(c=>c.setAttribute('aria-checked',String(c===b)))};el.append(b)}
}
function bindAll(root){
  root.querySelectorAll('[data-bind]').forEach(el=>{
    const p=el.dataset.bind,v=getPath(S,p);
    if(el.type==='checkbox')el.checked=!!v;else if(v!=null)el.value=v;
    if(el._bound)return;el._bound=true;
    const ev=(el.tagName==='SELECT'||el.type==='checkbox'||el.type==='color')?'change':'input';
    el.addEventListener(ev,()=>{let val=el.type==='checkbox'?el.checked:el.value;if(el.type==='range')val=+val;setPath(S,p,val);persist();onChange(p)});
    if(el.type==='color')el.addEventListener('input',()=>{setPath(S,p,el.value);invalidate()});
  });
}
function onChange(p){
  if(p==='model'){clampDurations();renderVideoOpts();renderClips()}
  else if(p==='res'||p==='multiShot'||p==='audio'||p==='line'){renderClips()}
  else if(p.startsWith('product.')){refreshPrompts();autoCopy()}
  else if(p.startsWith('look.')){if(p==='look.font')ensureFonts().then(invalidate);if(p.endsWith('Vol'))clearAudio();markStale()}
  else if(p.startsWith('overlay.')){markStale()}
  invalidate();
}

/* ---------------- photo ---------------- */
function loadImg(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('Could not read that image.'));i.src=src})}
async function setPhotoFromFile(file){
  if(!file||!/^image\/(jpeg|png|webp)$/.test(file.type)){toast('Use a JPEG, PNG or WebP photo.');return}
  const url=URL.createObjectURL(file);
  try{
    const img=await loadImg(url);const max=2048,k=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
    const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*k);c.height=Math.round(img.naturalHeight*k);
    const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
    const data=c.toDataURL('image/jpeg',.9);
    await setPhoto(data,uuid());
    try{localStorage.setItem(PHOTO_KEY,JSON.stringify({id:A.hero.id,data}))}catch(e){toast('Photo loaded. It is too large to remember after a reload.')}
    S.frames={};persist();renderClips();
  }finally{URL.revokeObjectURL(url)}
}
async function setPhoto(data,id){
  const img=await loadImg(data);
  A.hero={src:img,w:img.naturalWidth,h:img.naturalHeight,id,data};
  $('photoPrev').src=data;$('photoPrev').hidden=false;$('dropText').hidden=true;invalidate();
}
(function(){const d=$('drop');$('photo').onchange=e=>setPhotoFromFile(e.target.files[0]);
  d.addEventListener('dragover',e=>{e.preventDefault();d.classList.add('over')});d.addEventListener('dragleave',()=>d.classList.remove('over'));
  d.addEventListener('drop',e=>{e.preventDefault();d.classList.remove('over');setPhotoFromFile(e.dataTransfer.files[0])});})();

/* start frame at the clip's shape */
function composeFrame(shape){
  const M=model(),[w,h]=frameSize(shape,M.resolutions?S.res:'1080p'),hero=A.hero;
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
  if(S.fit==='fill'){drawCover(x,hero.src,hero.w,hero.h,0,0,w,h,1,0,0)}
  else{
    const s=document.createElement('canvas');s.width=24;s.height=Math.max(8,Math.round(24*h/w));const sx=s.getContext('2d');
    drawCover(sx,hero.src,hero.w,hero.h,0,0,s.width,s.height,1.15,0,0);
    x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(s,0,0,w,h);x.fillStyle='rgba(0,0,0,.12)';x.fillRect(0,0,w,h);
    const r=containRect(hero.w,hero.h,w*.05,h*.05,w*.9,h*.9);x.drawImage(hero.src,r.x,r.y,r.w,r.h);
  }
  return c;
}
const canvasBlob=(c,q)=>new Promise(r=>c.toBlob(r,'image/jpeg',q||.92));
async function ensureStartUrl(shape){
  if(!A.hero)throw new Error('Upload a product photo first.');
  const M=model(), ref=M.framing==='aspect';
  const key=ref?`${A.hero.id}|orig`:`${A.hero.id}|${S.fit}|${frameSize(shape,M.resolutions?S.res:'1080p').join('x')}`;
  const f=S.frames[key];if(f&&f.url&&Date.now()-f.at<20*3600e3)return f.url;
  let blob;
  if(ref){const c=document.createElement('canvas');c.width=A.hero.w;c.height=A.hero.h;c.getContext('2d').drawImage(A.hero.src,0,0);blob=await canvasBlob(c,.92)}
  else blob=await canvasBlob(composeFrame(shape),.92);
  const r=await api('/api/upload',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:blob});
  S.frames[key]={url:r.url,at:Date.now()};persist();return r.url;
}

/* ---------------- section 1: product ---------------- */
function renderProduct(){
  chipGroup($('fitChips'),[['fit','Fit (soft edges)'],['fill','Fill (crop)']],()=>S.fit,v=>{S.fit=v;renderClips()});
  chipGroup($('shopChips'),Object.entries(SHOPS).map(([k,v])=>[k,v.label]),()=>cat().shop,v=>{if(cat().shop!==v){S.cat=CATEGORIES.find(c=>c.shop===v).id;fixScene();renderProduct();renderVideoOpts();refreshPrompts();autoCopy()}});
  chipGroup($('catChips'),CATEGORIES.filter(c=>c.shop===cat().shop).map(c=>[c.id,c.label]),()=>S.cat,v=>{S.cat=v;fixScene();renderVideoOpts();refreshPrompts();autoCopy();updatePlaceholders()});
  updatePlaceholders();
}
function fixScene(){if(!(S.scene in cat().pro))S.scene='hero'}
function updatePlaceholders(){
  const c=cat();document.querySelectorAll('[data-bind^="product.features."]').forEach((el,i)=>el.placeholder=c.features[i]||'');
  $('pCta').placeholder=SHOPS[c.shop].cta;$('bLine').placeholder=c.blogger.line;
}
$('useCatFeats').onclick=()=>{S.product.features=cat().features.slice();bindAll(document);persist();refreshPrompts();autoCopy();invalidate()};

/* ---------------- section 2: video ---------------- */
function renderVideoOpts(){
  const sc=$('styleCards');sc.textContent='';
  for(const [k,v] of Object.entries(STYLES)){const b=document.createElement('button');b.type='button';b.className='stylecard';b.setAttribute('role','radio');b.setAttribute('aria-checked',String(S.style===k));
    b.innerHTML=`<b>${esc(v.label)}</b><span>${esc(v.blurb)}</span>`;
    b.onclick=()=>{if(S.style===k)return;S.style=k;S.model=STYLES[k].models[0];clampDurations();persist();renderVideoOpts();renderClips()};sc.append(b)}
  $('proOpts').hidden=S.style!=='pro';$('blogOpts').hidden=S.style!=='blogger';
  chipGroup($('sceneChips'),Object.entries(scenesFor(cat())),()=>S.scene,v=>{S.scene=v;refreshPrompts()});
  chipGroup($('camChips'),Object.entries({dolly:'Dolly in',orbit:'Orbit',push:'Push and focus',gimbal:'Gimbal track',crane:'Crane down',macro:'Macro light sweep'}),()=>S.camera,v=>{S.camera=v;refreshPrompts()});
  const sel=$('model'),rec=STYLES[S.style].models;sel.textContent='';
  const order=[...rec,...Object.keys(MODELS).filter(k=>!rec.includes(k))];
  order.forEach((k,i)=>{if(!MODELS[k])return;const o=document.createElement('option');o.value=k;o.textContent=MODELS[k].label+(i===0?' (recommended)':'');sel.append(o)});
  if(!MODELS[S.model])S.model=rec[0];sel.value=S.model;
  const M=model();$('modelNote').textContent=M.blurb+(M.framing==='aspect'?' Makes each shape directly from your photo.':' Starts from your photo, framed to each shape.');
  const rs=$('res');rs.textContent='';$('resField').hidden=!M.resolutions;
  (M.resolutions||[]).forEach(r=>{const o=document.createElement('option');o.value=r;o.textContent=r;rs.append(o)});
  if(M.resolutions){if(!M.resolutions.includes(S.res))S.res=M.defRes||M.resolutions[M.resolutions.length-1];rs.value=S.res}
  const pl=$('plats');pl.textContent='';
  PLATFORM_ORDER.forEach(id=>{const P=outDims(id);const row=document.createElement('label');row.className='plat';
    row.innerHTML=`<span class="check"><input type="checkbox" ${S.plats[id]?'checked':''}> ${esc(P.name)}</span><span class="spec">${P.w}×${P.h}</span>`;
    row.querySelector('input').onchange=e=>{S.plats[id]=e.target.checked;persist();renderClips();renderExport();autoCopy()};pl.append(row)});
  chipGroup($('pinChips'),[['reuse','Crop the vertical clip'],['own','Its own 2:3 clip']],()=>S.pin,v=>{S.pin=v;renderClips();renderExport()});
  chipGroup($('xChips'),[['reuse','Vertical clip'],['wide','Own 16:9 clip'],['square','Own 1:1 clip']],()=>S.x,v=>{S.x=v;renderVideoOpts();renderClips();renderExport()});
  bindAll($('s-video'));
}

/* ---------------- section 3: clips ---------------- */
function autoPrompt(shape){return buildPrompt(S,shape,model())}
function promptFor(shape){
  const auto=autoPrompt(shape);
  const p=S.edited[shape]&&S.prompts[shape]?S.prompts[shape]:auto.prompt;
  const shots=S.edited[shape]&&S.shots[shape]&&S.shots[shape].length?S.shots[shape]:auto.shots;
  return {prompt:p,shots:(model().multiShot&&S.style==='blogger'&&S.multiShot)?shots:[]};
}
function refreshPrompts(){
  for(const shape of neededShapes()){
    const card=$('clip-'+shape);if(!card)continue;
    if(!S.edited[shape]){const pp=promptFor(shape);card.querySelector('.prompt').value=pp.prompt;renderShots(card,shape,pp.shots)}
  }
}
function renderShots(card,shape,shots){
  const box=card.querySelector('.shots');box.textContent='';box.hidden=!shots.length;
  if(!shots.length)return;
  const head=document.createElement('span');head.className='lbl';head.textContent='Shots (seconds add up to the clip length)';box.append(head);
  shots.forEach((s,i)=>{const r=document.createElement('div');r.className='shot';
    r.innerHTML=`<input aria-label="Shot ${i+1}" maxlength="500"><input type="number" min="1" max="15" aria-label="Shot ${i+1} seconds">`;
    const [tp,td]=r.querySelectorAll('input');tp.value=s.prompt;td.value=s.duration;
    const save=()=>{const cur=promptFor(shape);S.prompts[shape]=card.querySelector('.prompt').value;S.shots[shape]=cur.shots.map((x,j)=>j===i?{prompt:tp.value,duration:Math.max(1,Math.min(15,+td.value||1))}:x);S.edited[shape]=true;persist();updateDurLabel(card,shape)};
    tp.oninput=save;td.oninput=save;box.append(r)});
}
function shotTotal(shape){const s=promptFor(shape).shots;return s.length?s.reduce((a,b)=>a+(+b.duration||0),0):null}
function updateDurLabel(card,shape){const t=shotTotal(shape);const el=card.querySelector('.durnote');el.textContent=t!=null?`Shots add up to ${t} s`:''}
let clipsKey='';
function renderClips(){
  const box=$('clips'),shapes=neededShapes(),M=model();
  box.textContent='';
  if(!shapes.length){box.innerHTML='<p class="muted">Tick at least one platform in step 2.</p>';return}
  for(const shape of shapes){
    const sh=SHAPES[shape],aspect=M.framing==='aspect'?(shape==='pinterest'?'3:4':sh.aspect):sh.aspect;
    const card=document.createElement('div');card.className='clip';card.id='clip-'+shape;
    const durs=[];for(let d=M.duration.min;d<=M.duration.max;d++)durs.push(d);
    card.innerHTML=`<div class="thumb"></div><div>
      <h3>${esc(sh.label)} clip</h3><div class="muted">Used for ${esc(usesFor(shape))}</div>
      <div class="meta"><span class="tag">${esc(M.label)}</span><span class="tag">${esc(aspect)}</span>${M.resolutions?`<span class="tag">${esc(S.res)}</span>`:''}<span class="tag">${S.audio?'with sound':'silent'}</span></div>
      <div class="field"><span class="lbl">Prompt <button class="link reset" type="button">Reset to automatic</button></span><textarea class="prompt" maxlength="2500" aria-label="Prompt for the ${esc(sh.label)} clip"></textarea></div>
      <div class="shots"></div>
      <div class="row gap"><label class="lbl">Length <select class="dur">${durs.map(d=>`<option value="${d}">${d} s</option>`).join('')}</select></label><span class="hint durnote"></span></div>
      <p class="cost hint"></p>
      <div class="row gap"><button class="btn sm est" type="button">Check cost</button><button class="btn primary gen" type="button">Generate</button><button class="btn sm danger cancel" type="button" hidden>Cancel</button><a class="btn sm raw" hidden>Raw MP4</a></div>
      <p class="state" role="status"></p></div>`;
    const pp=promptFor(shape);
    card.querySelector('.prompt').value=pp.prompt;
    card.querySelector('.prompt').oninput=e=>{S.prompts[shape]=e.target.value;S.shots[shape]=promptFor(shape).shots;S.edited[shape]=true;persist()};
    card.querySelector('.reset').onclick=()=>{S.edited[shape]=false;delete S.prompts[shape];delete S.shots[shape];persist();renderClips()};
    renderShots(card,shape,pp.shots);
    const ds=card.querySelector('.dur');ds.value=S.durations[shape];ds.onchange=()=>{S.durations[shape]=+ds.value;persist();if(!S.edited[shape])refreshPrompts();card.querySelector('.cost').textContent=''};
    updateDurLabel(card,shape);
    card.querySelector('.est').onclick=()=>checkCost(shape,card);
    card.querySelector('.gen').onclick=()=>generate(shape,card);
    card.querySelector('.cancel').onclick=()=>cancelJob(shape,card);
    box.append(card);
    paintClip(shape);
  }
}
function usesFor(shape){return PLATFORM_ORDER.filter(p=>S.plats[p]&&shapeOf(p)===shape).map(p=>PLATFORMS[p].name).join(', ')}
const jobState={};   // shape -> job (public)
function paintClip(shape){
  const card=$('clip-'+shape);if(!card)return;
  const j=jobState[shape],c=clips[shape],th=card.querySelector('.thumb');
  th.style.aspectRatio=shape==='wide'?'16/9':shape==='square'?'1/1':shape==='pinterest'?'2/3':'9/16';
  th.textContent='';
  if(c){const v=document.createElement('video');v.src=c.url;v.controls=true;v.playsInline=true;v.muted=true;v.loop=true;th.append(v)}
  else if(A.hero){try{const f=composeFrame(shape);const img=new Image();img.alt='Start frame';img.src=f.toDataURL('image/jpeg',.7);th.append(img)}catch(e){}}
  else th.innerHTML='<span class="muted">Upload a photo</span>';
  const st=card.querySelector('.state'),gen=card.querySelector('.gen'),can=card.querySelector('.cancel'),raw=card.querySelector('.raw');
  st.className='state';can.hidden=true;raw.hidden=true;gen.disabled=!HF_READY;gen.textContent='Generate';card.querySelector('.est').disabled=!HF_READY;
  if(!j){st.textContent=HF_READY?'':'Generation is off in this preview. See the note at the top.';return}
  const s=j.status;
  if(s==='queued'||s==='in_progress'){st.classList.add('run');st.textContent=s==='queued'?'Waiting in Higgsfield\'s queue…':'Higgsfield is making this clip…';gen.disabled=true;can.hidden=s!=='queued'}
  else if(s==='completed'){st.classList.add('ok');st.textContent=c?'Ready. It\'s in the preview in step 5.':'Done. Loading the clip…';gen.textContent='Generate again';raw.hidden=false;raw.href=`/api/jobs/${j.id}/video?download=1`}
  else if(s==='failed'||s==='nsfw'){st.classList.add('bad');st.textContent=j.error||'Higgsfield could not make this clip.';gen.textContent='Try again'}
  else if(s==='canceled'||s==='cancelled'){st.textContent='Cancelled.';gen.textContent='Generate'}
  else{st.textContent=s}
}
function requestBody(shape){
  const M=model(),pp=promptFor(shape),sh=SHAPES[shape];
  const shots=pp.shots||[];
  return {model:S.model,prompt:pp.prompt,duration:shots.length?shotTotal(shape):S.durations[shape],audio:!!S.audio,
    resolution:M.resolutions?S.res:undefined,aspect:M.framing==='aspect'?(shape==='pinterest'?'3:4':sh.aspect):undefined,
    multiShot:shots.length>0,shots,shape,aspectLabel:sh.aspect,productName:S.product.name||cat().label};
}
function costText(e){
  if(!e)return 'Higgsfield gave no price for this one. Check your balance in Higgsfield before you generate.';
  const bits=[];if(e.credits!=null)bits.push(`${e.credits} credits`);if(e.usd!=null)bits.push(`about $${(+e.usd).toFixed(2)}`);
  return 'Higgsfield estimate: '+bits.join(', ')+'.';
}
async function prepare(shape,card){
  const st=card.querySelector('.state');st.className='state run';st.textContent='Getting the start frame ready…';
  const url=await ensureStartUrl(shape);const body=requestBody(shape);body.imageUrl=url;return body;
}
async function checkCost(shape,card){
  const btn=card.querySelector('.est');btn.disabled=true;
  try{const body=await prepare(shape,card);const r=await api('/api/estimate',{body});card._est=r.estimate;card.querySelector('.cost').textContent=costText(r.estimate);paintClip(shape)}
  catch(e){const st=card.querySelector('.state');st.className='state bad';st.textContent=e.message}
  finally{btn.disabled=!HF_READY}
}
function confirmDialog(title,body,yes){
  const d=$('confirm');$('cTitle').textContent=title;$('cBody').textContent=body;$('cYes').textContent=yes;
  return new Promise(res=>{d.onclose=()=>res(d.returnValue==='yes');d.returnValue='';d.showModal()});
}
async function generate(shape,card){
  const gen=card.querySelector('.gen');gen.disabled=true;
  try{
    const body=await prepare(shape,card);
    let est=card._est;
    try{est=(await api('/api/estimate',{body})).estimate}catch(e){est=null}
    card.querySelector('.cost').textContent=costText(est);
    const M=model(),sh=SHAPES[shape];
    const ok=await confirmDialog(`Generate the ${sh.label} clip?`,
      `Higgsfield will make a ${body.duration}-second clip with ${M.label}${M.resolutions?' at '+S.res:''}${S.audio?', with sound':''}. ${costText(est)} This spends credits from your Higgsfield account.`,'Generate');
    if(!ok){paintClip(shape);return}
    body.idempotencyKey=uuid();body.estimate=est;
    const r=await api('/api/generate',{body});
    jobState[shape]=r.job;S.jobs[shape]=r.job.id;persist();
    if(clips[shape]){URL.revokeObjectURL(clips[shape].url);delete clips[shape];clearAudio(shape)}
    paintClip(shape);poll(shape,r.job.id);
  }catch(e){
    const st=card.querySelector('.state');st.className='state bad';st.textContent=e.message+(e.retryAfter?` Try again in about ${e.retryAfter} seconds.`:'');
  }finally{gen.disabled=!HF_READY||(jobState[shape]&&/queued|in_progress/.test(jobState[shape].status))}
}
async function cancelJob(shape,card){
  const j=jobState[shape];if(!j)return;
  try{const r=await api(`/api/jobs/${j.id}/cancel`,{method:'POST'});jobState[shape]=r.job;paintClip(shape)}
  catch(e){toast(e.message.includes('409')?'It already started, so it can\'t be cancelled.':e.message)}
}
const polling={};
async function poll(shape,id){
  if(polling[id])return;polling[id]=true;let delay=3000;
  try{
    while(true){
      let j;try{j=(await api('/api/jobs/'+id)).job}catch(e){if(e.status===404){delete S.jobs[shape];persist();return}await sleep(delay);delay=Math.min(15000,delay*1.4);continue}
      if(S.jobs[shape]!==id)return;
      jobState[shape]=j;paintClip(shape);
      if(j.status==='completed'){await loadClip(shape,j);refreshLibrary();return}
      if(!/queued|in_progress/.test(j.status)){refreshLibrary();return}
      await sleep(delay);delay=Math.min(12000,delay*1.4);
    }
  }finally{delete polling[id]}
}
async function loadClip(shape,j){
  try{
    const r=await fetch(`/api/jobs/${j.id}/video`,{credentials:'same-origin'});
    if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error||'The clip could not be loaded.')}
    const blob=await r.blob(),url=URL.createObjectURL(blob);
    const el=document.createElement('video');el.muted=true;el.playsInline=true;el.preload='auto';el.src=url;
    await new Promise((res,rej)=>{el.onloadeddata=res;el.onerror=()=>rej(new Error('Your browser could not play this clip.'))});
    if(clips[shape])URL.revokeObjectURL(clips[shape].url);
    clips[shape]={el,url,blob,w:el.videoWidth,h:el.videoHeight,dur:el.duration,jobId:j.id};clearAudio(shape);
    paintClip(shape);markStale();invalidate();
  }catch(e){const card=$('clip-'+shape);if(card){const st=card.querySelector('.state');st.className='state bad';st.textContent=e.message}}
}

/* library of earlier jobs */
async function refreshLibrary(){
  let list=[];try{list=(await api('/api/jobs')).jobs}catch(e){return}
  const box=$('library');box.textContent='';
  if(!list.length){box.innerHTML='<p class="muted">None yet.</p>';return}
  for(const j of list.slice(0,60)){
    const row=document.createElement('div');row.className='lib';
    const when=new Date(j.created).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    row.innerHTML=`<div><b>${esc(j.product||'Untitled')}</b> <span class="tag">${esc(SHAPES[j.shape]?SHAPES[j.shape].label:j.shape)}</span> <span class="tag">${esc(j.modelLabel)}</span><br><span class="muted">${esc(when)} · ${esc(j.duration)} s · ${esc(j.status)}</span></div><div class="row gap"></div>`;
    const btns=row.lastElementChild;
    if(j.status==='completed'&&SHAPES[j.shape]){const u=document.createElement('button');u.className='btn sm';u.type='button';u.textContent='Use this clip';
      u.onclick=async()=>{S.jobs[j.shape]=j.id;jobState[j.shape]=j;persist();if(!neededShapes().includes(j.shape))toast('Turn on a platform that uses this shape to see it.');paintClip(j.shape);await loadClip(j.shape,j);toast('Clip loaded.')};btns.append(u);
      const a=document.createElement('a');a.className='btn sm';a.href=`/api/jobs/${j.id}/video?download=1`;a.textContent='Raw MP4';btns.append(a)}
    const del=document.createElement('button');del.className='btn sm danger';del.type='button';del.textContent='Remove';
    del.onclick=async()=>{if(!(await confirmDialog('Remove this video from the list?','This deletes the copy kept on your Hostinger site. It does not touch your Higgsfield account.','Remove')))return;
      try{await api('/api/jobs/'+j.id,{method:'DELETE'});for(const k in S.jobs)if(S.jobs[k]===j.id){delete S.jobs[k];delete jobState[k];if(clips[k]){URL.revokeObjectURL(clips[k].url);delete clips[k]}paintClip(k)}persist();refreshLibrary()}catch(e){toast(e.message)}};
    btns.append(del);box.append(row);
  }
}

/* ---------------- section 4: copy ---------------- */
const COPY_FIELDS={
  tiktok:[['hook','On-video hook',60],['cta','On-video CTA',24],['caption','Caption',2200],['hashtags','Hashtags',0]],
  reels:[['hook','On-video hook',60],['cta','On-video CTA',24],['caption','Caption',2200],['hashtags','Hashtags',0]],
  shorts:[['hook','On-video hook',60],['cta','On-video CTA',24],['title','Title',100],['description','Description',5000],['hashtags','Hashtags',0]],
  pinterest:[['hook','On-video hook',60],['cta','On-video CTA',24],['title','Pin title',100],['description','Pin description',500],['keywords','Keywords',0]],
  x:[['hook','On-video hook',60],['cta','On-video CTA',24],['post','Post',280]]
};
function autoCopy(force){if(force||!S.copyEdited||!S.copy){S.copy=categoryCopy(S);S.copyEdited=false;persist();renderCopy();markStale();invalidate()}}
function renderCopy(){
  const tabs=$('copyTabs');tabs.textContent='';
  PLATFORM_ORDER.forEach(id=>{const b=document.createElement('button');b.type='button';b.className='tab';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(S.copyTab===id));b.textContent=PLATFORMS[id].name;b.onclick=()=>{S.copyTab=id;persist();renderCopy()};tabs.append(b)});
  const id=S.copyTab,c=S.copy[id],panel=$('copyPanel');panel.textContent='';
  for(const [k,label,max] of COPY_FIELDS[id]){
    const f=document.createElement('div');f.className='copyf';
    const isList=k==='hashtags'||k==='keywords',val=isList?(c[k]||[]).join(k==='keywords'?', ':' '):(c[k]||'');
    const long=max>100||isList;
    f.innerHTML=`<span class="lbl"><span>${esc(label)}</span><span><span class="count"></span> <button class="link" type="button">Copy</button></span></span>${long?'<textarea></textarea>':'<input>'}`;
    const inp=f.querySelector(long?'textarea':'input'),cnt=f.querySelector('.count');inp.value=val;inp.setAttribute('aria-label',`${PLATFORMS[id].name} ${label}`);
    if(!long||k==='caption'||k==='post'||k==='description'||k==='title'){}
    const count=()=>{if(!max){cnt.textContent='';return}const n=id==='x'&&k==='post'?xLength(inp.value):inp.value.length;cnt.textContent=`${n}/${max}`;cnt.classList.toggle('over',n>max)};count();
    inp.oninput=()=>{c[k]=isList?inp.value.split(k==='keywords'?/\s*,\s*/:/\s+/).filter(Boolean):inp.value;S.copyEdited=true;persist();count();if(k==='hook'||k==='cta'){markStale();invalidate()}};
    f.querySelector('.link').onclick=()=>copyText(isList?inp.value:inp.value);
    panel.append(f);
  }
  const full=document.createElement('div');full.className='row gap';full.innerHTML='<button class="btn sm" type="button">Copy full caption</button>';
  full.firstChild.onclick=()=>copyText(fullCaption(id));panel.append(full);
}
function fullCaption(id){const c=S.copy[id];
  if(id==='tiktok'||id==='reels')return `${c.caption}\n\n${(c.hashtags||[]).join(' ')}`.trim();
  if(id==='shorts')return `${c.title}\n\n${c.description}\n\n${(c.hashtags||[]).join(' ')}`.trim();
  if(id==='pinterest')return `${c.title}\n\n${c.description}`;
  return c.post;}
async function copyText(t){try{await navigator.clipboard.writeText(t);toast('Copied.')}catch(e){toast('Copy did not work here. Select the text and copy it.')}}
$('rebuildCopy').onclick=()=>autoCopy(true);
function captionsText(){
  const c=S.copy,out=[],sec=(t,b)=>out.push(`===== ${t} =====\n${b}\n`);
  sec('TikTok',`On-video hook: ${c.tiktok.hook}\nOn-video CTA: ${c.tiktok.cta}\n\nCaption:\n${fullCaption('tiktok')}`);
  sec('Instagram Reels',`On-video hook: ${c.reels.hook}\nOn-video CTA: ${c.reels.cta}\n\nCaption:\n${fullCaption('reels')}`);
  sec('YouTube Shorts',`On-video hook: ${c.shorts.hook}\nOn-video CTA: ${c.shorts.cta}\n\nTitle:\n${c.shorts.title}\n\nDescription:\n${c.shorts.description}\n\n${(c.shorts.hashtags||[]).join(' ')}`);
  sec('Pinterest',`On-video hook: ${c.pinterest.hook}\nOn-video CTA: ${c.pinterest.cta}\n\nPin title:\n${c.pinterest.title}\n\nPin description:\n${c.pinterest.description}\n\nKeywords:\n${(c.pinterest.keywords||[]).join(', ')}\n\nDestination link:\n${S.product.link||''}`);
  sec('X',`On-video hook: ${c.x.hook}\nOn-video CTA: ${c.x.cta}\n\nPost:\n${c.x.post}`);
  return out.join('\n');
}

/* ---------------- section 5: preview ---------------- */
function ensureFonts(){
  if(!document.fonts||!document.fonts.load)return Promise.resolve();
  const F=FONTS[S.look.font]||FONTS.anton,fam=F.head.split(',')[0];
  return Promise.all([document.fonts.load(`${F.w} 60px ${fam}`),document.fonts.load('700 40px "Poppins"'),document.fonts.load('800 40px "Poppins"'),document.fonts.load('500 40px "Poppins"'),document.fonts.load('500 20px "JetBrains Mono"')]).catch(()=>{});
}
const pv=$('pv'),pctx=pv.getContext('2d');
let playing=false,pt=0,last=performance.now(),dirty=true;
function invalidate(){dirty=true}
function pvClip(){return clips[shapeOf(S.pvPlat)]||null}
function pvScene(){const c=pvClip();return scene(S.pvPlat,c?c.dur:S.durations[shapeOf(S.pvPlat)])}
function renderExport(){
  const en=PLATFORM_ORDER.filter(p=>S.plats[p]);if(!en.includes(S.pvPlat))S.pvPlat=en[0]||'tiktok';
  const t=$('pvTabs');t.textContent='';
  en.forEach(id=>{const b=document.createElement('button');b.type='button';b.className='tab';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(S.pvPlat===id));b.textContent=PLATFORMS[id].name;
    b.onclick=()=>{pausePreview();S.pvPlat=id;pt=0;persist();renderExport();invalidate()};t.append(b)});
  renderQueue();sizePreview();
}
function sizePreview(){const P=outDims(S.pvPlat),k=Math.min(1,720/Math.max(P.w,P.h));pv.width=Math.round(P.w*k);pv.height=Math.round(P.h*k);pv._k=k;invalidate()}
function pausePreview(){playing=false;$('play').textContent='Play';for(const c of Object.values(clips))try{c.el.pause()}catch(e){}}
$('play').onclick=()=>{if(playing){pausePreview();return}playing=true;$('play').textContent='Pause';const c=pvClip();const sc=pvScene(),T=clipTimeline(sc);if(pt>=T.D-.05)pt=0;if(c){c.el.muted=!$('pvSound').checked;c.el.currentTime=Math.min(pt,c.dur-.05);if(pt<c.dur)c.el.play().catch(()=>{})}last=performance.now()};
$('pvSound').onchange=()=>{const c=pvClip();if(c)c.el.muted=!$('pvSound').checked};
$('scrub').oninput=e=>{const sc=pvScene(),T=clipTimeline(sc);pt=(+e.target.value/1000)*T.D;const c=pvClip();if(c){c.el.currentTime=Math.min(pt,c.dur-.05)}invalidate()};
$('showSafe').onchange=invalidate;
function frame(now){
  const dt=Math.min(.1,(now-last)/1000);last=now;
  const sc=pvScene(),T=clipTimeline(sc),c=pvClip();
  if(playing){
    if(c&&pt<c.dur&&!c.el.paused)pt=c.el.currentTime;else pt+=dt;
    if(c&&pt>=c.dur-.05&&!c.el.paused)c.el.pause();
    if(pt>=T.D){pt=0;if(c){c.el.currentTime=0;c.el.play().catch(()=>{})}}
    $('scrub').value=String(Math.round(pt/T.D*1000));dirty=true;
  }else if(c&&c.el.seeking)dirty=true;
  if(dirty){dirty=false;const P=outDims(S.pvPlat);
    if(A.hero||c){
      drawClipFrame(pctx,P,pt,sc,{hero:A.hero,clip:c?{src:c.el,w:c.w,h:c.h}:null,baseTransform:[pv._k,0,0,pv._k,0,0]});
      if($('showSafe').checked){pctx.save();pctx.setTransform(pv._k,0,0,pv._k,0,0);drawSafe(pctx,P);pctx.restore()}
    }else{pctx.fillStyle='#222';pctx.fillRect(0,0,pv.width,pv.height);pctx.fillStyle='#bbb';pctx.font='600 18px Poppins, sans-serif';pctx.textAlign='center';pctx.fillText('Upload a product photo to preview',pv.width/2,pv.height/2)}
    $('pvNote').textContent=c?`${PLATFORMS[S.pvPlat].name}: your Higgsfield clip with the text on top.`:'Showing your photo as a stand-in until the Higgsfield clip is ready.';
  }
  requestAnimationFrame(frame);
}
['brand','accent'].forEach(id=>$(id).addEventListener('input',invalidate));

/* ---------------- music ---------------- */
let actx=null;function audioCtx(){try{if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume()}catch(e){}return actx}
$('music').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const ab=await f.arrayBuffer();musicBuf=await audioCtx().decodeAudioData(ab);$('musicClear').hidden=false;clearAudio();markStale();toast('Music added.')}catch(err){toast('That audio file could not be read.')}};
$('musicClear').onclick=()=>{musicBuf=null;$('music').value='';$('musicClear').hidden=true;clearAudio();markStale()};
async function mixAudio(shape,D){
  const key=shape+'|'+D.toFixed(2);if(key in audioCache)return audioCache[key];
  const c=clips[shape];let clipAudio=null;
  if(c&&S.look.clipVol>0){try{clipAudio=await audioCtx().decodeAudioData(await c.blob.arrayBuffer())}catch(e){clipAudio=null}}
  if(!clipAudio&&!(musicBuf&&S.look.musicVol>0)){audioCache[key]=null;return null}
  const oc=new OfflineAudioContext(2,Math.ceil(D*48000),48000);
  if(clipAudio){const s=oc.createBufferSource();s.buffer=clipAudio;const g=oc.createGain();g.gain.value=S.look.clipVol;s.connect(g);g.connect(oc.destination);s.start(0)}
  if(musicBuf&&S.look.musicVol>0){const s=oc.createBufferSource();s.buffer=musicBuf;s.loop=true;const g=oc.createGain();const v=S.look.musicVol;
    g.gain.setValueAtTime(0,0);g.gain.linearRampToValueAtTime(v,.3);g.gain.setValueAtTime(v,Math.max(.4,D-1.2));g.gain.linearRampToValueAtTime(0,D);s.connect(g);g.connect(oc.destination);s.start(0)}
  const buf=await oc.startRendering();audioCache[key]=buf;return buf;
}

/* ---------------- encoding ---------------- */
const engineCache={};
async function pickEngine(P,withAudio){
  const key=P.w+'x'+P.h+(withAudio?'a':'');if(engineCache[key])return engineCache[key];
  let res=null;
  if(window.VideoEncoder&&window.VideoFrame&&window.Mp4Muxer){
    for(const codec of ['avc1.640028','avc1.4d0028','avc1.42e028','avc1.640033','avc1.4d0033']){
      try{const cfg={codec,width:P.w,height:P.h,bitrate:P.w*P.h>1.5e6?10e6:7e6,framerate:FPS,avc:{format:'avc'}};
        const s=await VideoEncoder.isConfigSupported(cfg);if(s&&s.supported){res={kind:'webcodecs',cfg,ext:'mp4'};break}}catch(e){}
    }
    if(res&&withAudio){let ok=false;try{ok=!!(window.AudioEncoder&&(await AudioEncoder.isConfigSupported({codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:128000})).supported)}catch(e){}
      if(ok)res.audio=true;else if(recorderMime())res=null}
  }
  if(!res){const m=recorderMime();if(m)res={kind:'recorder',mime:m,ext:/mp4/.test(m)?'mp4':'webm'}}
  engineCache[key]=res;return res;
}
function recorderMime(){
  if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)return null;
  for(const m of ['video/mp4;codecs=avc1.640028,mp4a.40.2','video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'])
    try{if(MediaRecorder.isTypeSupported(m))return m}catch(e){}
  return null;
}
function seek(el,t){return new Promise(res=>{if(Math.abs(el.currentTime-t)<1e-4&&!el.seeking){res();return}
  let done=false;const fin=()=>{if(done)return;done=true;el.removeEventListener('seeked',fin);res()};el.addEventListener('seeked',fin);setTimeout(fin,3000);el.currentTime=t})}
function renderClipEl(shape){const c=clips[shape];if(!c)return null;const el=document.createElement('video');el.muted=true;el.playsInline=true;el.preload='auto';el.src=c.url;return new Promise((res,rej)=>{el.onloadeddata=()=>res({src:el,w:c.w,h:c.h,dur:c.dur,el});el.onerror=()=>rej(new Error('The clip could not be read for export.'))})}
async function encodeWebCodecs(eng,P,sc,clip,audioBuf,onP,signal){
  const T=clipTimeline(sc),D=T.D;
  const canvas=document.createElement('canvas');canvas.width=P.w;canvas.height=P.h;const ctx=canvas.getContext('2d');
  const useAudio=!!(audioBuf&&eng.audio);
  const muxer=new Mp4Muxer.Muxer({target:new Mp4Muxer.ArrayBufferTarget(),video:{codec:'avc',width:P.w,height:P.h,frameRate:FPS},
    audio:useAudio?{codec:'aac',numberOfChannels:2,sampleRate:48000}:undefined,fastStart:'in-memory',firstTimestampBehavior:'offset'});
  let err=null;const venc=new VideoEncoder({output:(c,m)=>muxer.addVideoChunk(c,m),error:e=>{err=e}});venc.configure(eng.cfg);
  const frames=Math.round(D*FPS);
  for(let i=0;i<frames;i++){
    if(err)throw err;if(signal.aborted)throw new Error('cancelled');
    const t=i/FPS;if(clip)await seek(clip.el,Math.min(t,clip.dur-1/FPS));
    drawClipFrame(ctx,P,t,sc,{hero:A.hero,clip});
    const vf=new VideoFrame(canvas,{timestamp:Math.round(i*1e6/FPS),duration:Math.round(1e6/FPS)});
    venc.encode(vf,{keyFrame:i%(FPS*2)===0});vf.close();
    while(venc.encodeQueueSize>6)await sleep(2);
    if(i%3===0)onP(i/frames*(useAudio?.93:.98));
  }
  await venc.flush();venc.close();if(err)throw err;
  if(useAudio){
    const aenc=new AudioEncoder({output:(c,m)=>muxer.addAudioChunk(c,m),error:e=>{err=e}});
    aenc.configure({codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:128000});
    const L=audioBuf.getChannelData(0),R=audioBuf.numberOfChannels>1?audioBuf.getChannelData(1):L,N=Math.min(audioBuf.length,Math.ceil(D*48000)),CH=1024;
    for(let off=0;off<N;off+=CH){const n=Math.min(CH,N-off);const data=new Float32Array(n*2);data.set(L.subarray(off,off+n),0);data.set(R.subarray(off,off+n),n);
      const ad=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:n,numberOfChannels:2,timestamp:Math.round(off/48000*1e6),data});aenc.encode(ad);ad.close();
      if(aenc.encodeQueueSize>20)await sleep(1)}
    await aenc.flush();aenc.close();if(err)throw err;
  }
  muxer.finalize();onP(1);return new Blob([muxer.target.buffer],{type:'video/mp4'});
}
async function recordRealtime(eng,P,sc,clip,audioBuf,onP,signal){
  const T=clipTimeline(sc),D=T.D;
  const canvas=document.createElement('canvas');canvas.width=P.w;canvas.height=P.h;const ctx=canvas.getContext('2d');
  if(clip){await seek(clip.el,0)}
  drawClipFrame(ctx,P,0,sc,{hero:A.hero,clip});
  const stream=canvas.captureStream(FPS);let src=null;const ac=audioCtx();
  if(audioBuf&&ac){const dest=ac.createMediaStreamDestination();src=ac.createBufferSource();src.buffer=audioBuf;src.connect(dest);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t))}
  const rec=new MediaRecorder(stream,{mimeType:eng.mime,videoBitsPerSecond:P.w*P.h>1.5e6?10e6:7e6,audioBitsPerSecond:128000});
  const chunks=[];rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};const stopped=new Promise(r=>rec.onstop=r);
  rec.start(250);if(src)src.start();if(clip)clip.el.play().catch(()=>{});
  const t0=performance.now();
  await new Promise((res,rej)=>{const step=()=>{if(signal.aborted){rej(new Error('cancelled'));return}
    const t=(performance.now()-t0)/1000;if(t>=D){res();return}
    if(clip&&t>=clip.dur-.05)clip.el.pause();
    drawClipFrame(ctx,P,t,sc,{hero:A.hero,clip});onP(t/D);
    if(document.hidden)setTimeout(step,1000/FPS);else requestAnimationFrame(step)};step()}).catch(e=>{try{rec.stop()}catch(_){};throw e});
  await sleep(150);rec.stop();await stopped;stream.getTracks().forEach(t=>t.stop());if(src)try{src.stop()}catch(e){}onP(1);
  return new Blob(chunks,{type:eng.mime.split(';')[0]});
}

/* ---------------- export queue ---------------- */
const results={};let busy=false,abortCtl=null;
function markStale(){for(const k of Object.keys(results))if(results[k]&&results[k].blob)results[k].stale=true;paintQueue()}
function renderQueue(){
  const q=$('queue');q.textContent='';
  PLATFORM_ORDER.filter(p=>S.plats[p]).forEach(id=>{const P=outDims(id);const row=document.createElement('div');row.className='qrow';row.id='q-'+id;
    row.innerHTML=`<div><b>${esc(P.name)}</b> <small>${P.w}×${P.h}</small><br><small class="qmsg"></small></div><div class="row gap"><button class="btn sm qr" type="button">Make</button><a class="btn sm qs" hidden>Save</a></div><div class="bar"><i></i></div>`;
    row.querySelector('.qr').onclick=()=>runQueue([id]);q.append(row)});
  paintQueue();
}
function paintQueue(){
  let any=false;
  PLATFORM_ORDER.forEach(id=>{const row=$('q-'+id);if(!row)return;const r=results[id],msg=row.querySelector('.qmsg'),save=row.querySelector('.qs'),bar=row.querySelector('.bar i');
    const shape=shapeOf(id);
    if(!r){msg.textContent=clips[shape]?'Ready to make':'Waiting for the '+SHAPES[shape].label+' clip';save.hidden=true;bar.style.width='0'}
    else if(r.state==='run'){msg.textContent='Making… '+Math.round(r.p*100)+'%';bar.style.width=(r.p*100)+'%';save.hidden=true}
    else if(r.state==='done'){any=true;msg.textContent=(r.stale?'Settings changed since. Make again to update. ':'')+`${r.filename} · ${fmtBytes(r.blob.size)}`;bar.style.width='100%';save.hidden=false;
      if(save._url!==r.url){save.href=r.url;save.download=r.filename;save._url=r.url}}
    else if(r.state==='err'){msg.textContent=r.msg;bar.style.width='0';save.hidden=true}
    row.querySelector('.qr').disabled=busy||!clips[shape];
  });
  $('renderAll').disabled=busy;$('renderAll').textContent=busy?'Stop':'Make all videos';
  if(busy){$('renderAll').disabled=false}
  $('zipAll').disabled=!any||busy;
}
$('renderAll').onclick=()=>{if(busy){if(abortCtl)abortCtl.abort();return}
  const ids=PLATFORM_ORDER.filter(p=>S.plats[p]&&clips[shapeOf(p)]);
  if(!ids.length){toast('Generate a clip in step 3 first.');return}runQueue(ids)};
async function runQueue(ids){
  if(busy)return;busy=true;abortCtl=new AbortController();pausePreview();audioCtx();await ensureFonts();
  for(const id of ids){
    const shape=shapeOf(id),c=clips[shape];if(!c){results[id]={state:'err',msg:'Generate the '+SHAPES[shape].label+' clip first.'};continue}
    const P=outDims(id),sc=scene(id,c.dur),D=clipTimeline(sc).D;
    results[id]={state:'run',p:0};paintQueue();
    try{
      const audio=await mixAudio(shape,D);
      const eng=await pickEngine(P,!!audio);if(!eng)throw new Error('This browser cannot make videos. Use Chrome or Edge on a computer.');
      const clip=await renderClipEl(shape);
      const onP=p=>{results[id].p=p;paintQueue()};
      const blob=eng.kind==='webcodecs'?await encodeWebCodecs(eng,P,sc,clip,audio,onP,abortCtl.signal):await recordRealtime(eng,P,sc,clip,audio,onP,abortCtl.signal);
      clip.el.removeAttribute('src');clip.el.load();
      if(results[id]&&results[id].url)URL.revokeObjectURL(results[id].url);
      results[id]={state:'done',blob,url:URL.createObjectURL(blob),filename:`${slug(S.product.name||cat().label)}-${id}.${eng.ext}`};
    }catch(e){results[id]={state:'err',msg:e.message==='cancelled'?'Stopped.':('Could not make it: '+e.message)};if(e.message==='cancelled')break}
    paintQueue();
  }
  busy=false;abortCtl=null;paintQueue();updateEngineNote();
}
$('zipAll').onclick=async()=>{
  const files=[],enc=new TextEncoder();
  for(const id of PLATFORM_ORDER){const r=results[id];if(r&&r.state==='done')files.push({name:r.filename,data:new Uint8Array(await r.blob.arrayBuffer())})}
  files.push({name:'captions.txt',data:enc.encode(captionsText())});
  const blob=new Blob(makeZip(files),{type:'application/zip'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`${slug(S.product.name||cat().label)}-videos.zip`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
};
async function updateEngineNote(){
  const e=await pickEngine({w:1080,h:1920},true);
  $('engineNote').textContent=!e?'This browser cannot make videos. Use Chrome or Edge on a computer.':e.kind==='webcodecs'?'Videos are made in your browser as MP4, faster than real time.':`This browser records each video in real time as ${e.ext.toUpperCase()}. Keep this tab open while it runs.`;
}

/* ---------------- boot ---------------- */
$('logout').onclick=async()=>{try{await api('/api/logout',{method:'POST'})}catch(e){}location.href='/login'};
const fs=$('font');Object.entries(FONTS).forEach(([k,v])=>{const o=document.createElement('option');o.value=k;o.textContent=v.label;fs.append(o)});
async function boot(){
  let OPEN=false,KEYSET=false;
  try{const cfg=await api('/api/config');MODELS=cfg.models;HF_READY=!!cfg.higgsfield;OPEN=!!cfg.open;KEYSET=!!cfg.keySet}catch(e){toast(e.message)}
  const pill=$('hfState');pill.textContent=HF_READY?'Higgsfield connected':OPEN?'Preview only':'Higgsfield key missing';pill.className='pill '+(HF_READY?'ok':'bad');
  if(OPEN)$('logout').hidden=true;
  if(!HF_READY){$('setupBanner').hidden=false;$('setupBanner').textContent=OPEN
    ?(KEYSET?'Preview only: generation stays off because this page is open to anyone. Add APP_PASSWORD in Hostinger\'s environment variables and restart the app to turn it on.'
            :'Preview only: generation is off. To make videos, add APP_PASSWORD and then HF_API_KEY in Hostinger\'s environment variables and restart the app. Everything else works.')
    :'Generation is off: the Higgsfield API key is not set yet. Add HF_API_KEY in Hostinger\'s environment variables and restart the app. Everything else works.'}
  if(!CATEGORIES.some(c=>c.id===S.cat))S.cat=CATEGORIES[0].id;fixScene();
  if(!MODELS[S.model])S.model=STYLES[S.style].models[0];clampDurations();
  try{const ph=JSON.parse(localStorage.getItem(PHOTO_KEY)||'null');if(ph&&ph.data)await setPhoto(ph.data,ph.id)}catch(e){}
  if(!S.copy)S.copy=categoryCopy(S);
  bindAll(document);renderProduct();renderVideoOpts();renderClips();renderCopy();renderExport();
  ensureFonts().then(invalidate);requestAnimationFrame(frame);updateEngineNote();refreshLibrary();
  for(const [shape,id] of Object.entries(S.jobs||{})){
    api('/api/jobs/'+id).then(r=>{jobState[shape]=r.job;paintClip(shape);if(r.job.status==='completed')loadClip(shape,r.job);else if(/queued|in_progress/.test(r.job.status))poll(shape,id)}).catch(e=>{if(e.status===404){delete S.jobs[shape];persist()}});
  }
}
boot();
})();
