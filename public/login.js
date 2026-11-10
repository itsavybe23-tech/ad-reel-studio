(function(){
  const f=document.getElementById('f'),msg=document.getElementById('msg'),setup=document.getElementById('setup');
  fetch('/api/setup').then(r=>r.json()).then(s=>{
    const missing=[];if(!s.password)missing.push('APP_PASSWORD');if(!s.higgsfield)missing.push('HF_API_KEY');
    if(missing.length){setup.hidden=false;setup.textContent='Setup still needed: add '+missing.join(' and ')+' as environment variables in Hostinger, then restart the app.'}
  }).catch(()=>{});
  f.addEventListener('submit',async e=>{
    e.preventDefault();msg.textContent='';
    const btn=f.querySelector('button');btn.disabled=true;
    try{
      const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:f.password.value})});
      const j=await r.json().catch(()=>({}));
      if(r.ok){location.href='/';return}
      msg.textContent=j.error||'Could not sign in.';
    }catch(err){msg.textContent='Could not reach the app. Check your connection.'}
    btn.disabled=false;
  });
})();
