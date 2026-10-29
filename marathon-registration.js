(() => {
  const dialog=document.getElementById('marathonEntryDialog'),form=document.getElementById('marathonEntryForm');if(!dialog||!form)return;
  const config=window.SaiVistaMarathonConfig||{},status=document.getElementById('marathonEntryStatus'),submit=document.getElementById('marathonEntrySubmit'),close=document.getElementById('marathonEntryClose'),pay=document.getElementById('marathonPayLink'),success=document.getElementById('marathonEntrySuccess');
  let opener,ready=false,busy=false,requestId='',saved=false,checking=false;
  const closed=()=>Date.now()>=Date.parse(SaiVistaMarathon.event.deadline);
  function refresh(){
    const age=SaiVistaMarathon.age(form.elements.dob.value),minor=age>=0&&age<18;
    document.getElementById('marathonGuardian').hidden=!minor;form.elements.guardian.required=minor;form.elements.guardianConsent.required=minor;
    const medicalNoteRequired=form.elements.medical.value==='Yes';
    document.getElementById('marathonMedicalNote').hidden=!medicalNoteRequired;form.elements.medicalDetails.required=medicalNoteRequired;
    document.getElementById('marathonEntryFee').textContent=form.elements.race.value==='5K'?'5 km · ₹199':'3 km · ₹149';
    const canPay=ready&&!closed()&&!busy&&!saved;
    document.getElementById('marathonPaymentAvailability').textContent=closed()?'Registration closed. Please do not pay.':ready?'Payment evidence will be checked by the committee.':'Registration is being connected. Please wait to pay.';
    if(canPay){pay.href=SaiVistaMarathon.paymentLink(form.elements.race.value);pay.removeAttribute('aria-disabled');}else{pay.removeAttribute('href');pay.setAttribute('aria-disabled','true');}
    const proof=form.elements.paymentProof.files[0];submit.disabled=!canPay||!proof||!form.elements.paymentDeclared.checked;
    submit.textContent=busy?'Saving your entry…':closed()?'Registration closed':!ready?'Registration setup in progress':saved?'Entry submitted':'Submit for payment verification';
    if(closed())status.textContent='Registration closed on 10 November 2026.';
  }
  async function readiness(){
    if(ready||checking||!config.registrationEnabled||!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.endpoint||''))return;
    checking=true;status.textContent='Checking registration availability…';
    try{const response=await fetch(config.endpoint,{cache:'no-store',signal:AbortSignal.timeout(30000)}),data=await response.json();ready=data.ok===true&&data.service==='sai-vista-marathon-2026-manual-v1'&&data.acceptingEntries===true;status.textContent=ready?'Pay the correct fee, then attach your screenshot and transaction reference.':'Registration is unavailable. Please do not pay yet.';}
    catch(_){status.textContent='Cannot reach registration right now. Please do not pay yet. Reopen this form to retry.';}
    finally{checking=false;refresh();}
  }
  document.querySelectorAll('[data-marathon-open]').forEach(button=>button.addEventListener('click',()=>{
    opener=button;form.reset();saved=false;success.hidden=true;form.hidden=false;status.textContent='';requestId=crypto.randomUUID();
    form.elements.race.value=button.dataset.marathonOpen==='5K'?'5K':'3K';
    try{form.elements.flat.value=typeof ResidentAccess==='undefined'?'':ResidentAccess.remembered(localStorage)||'';}catch(_){}
    refresh();dialog.showModal();close.focus();readiness();
  }));
  close.addEventListener('click',()=>dialog.close());dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  dialog.addEventListener('close',()=>{if(!busy){form.reset();status.textContent='';opener?.focus();}});
  form.addEventListener('change',refresh);
  function readProof(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({type:file.type,base64:String(reader.result).split(',')[1]});reader.onerror=()=>reject(Error('Could not read the screenshot. Choose the file again.'));reader.readAsDataURL(file);});}
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||saved)return;
    if(!ready||closed()){status.textContent=closed()?'Registration closed on 10 November 2026.':'Registration setup is pending. No details have been submitted. Please do not pay yet.';refresh();return;}
    if(!form.reportValidity())return;
    const file=form.elements.paymentProof.files[0];if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3145728){status.textContent='Attach a JPG, PNG or WebP payment screenshot up to 3 MB.';return;}
    const data=Object.fromEntries(new FormData(form));delete data.paymentProof;data.flat=(typeof ResidentAccess==='undefined'?data.flat:ResidentAccess.parse(data.flat))||data.flat.trim().toUpperCase();data.agreed=form.elements.agreed.checked;data.guardianConsent=form.elements.guardianConsent.checked;data.paymentDeclared=form.elements.paymentDeclared.checked;
    const issue=SaiVistaMarathon.validate(data);if(issue){status.textContent=issue;return;}
    if(data.medical!=='Yes')data.medicalDetails='';
    if(SaiVistaMarathon.age(data.dob)>=18){data.guardian='';data.guardianConsent=false;}
    busy=true;close.disabled=true;dialog.setAttribute('aria-busy','true');refresh();status.textContent='Uploading payment evidence and saving your entry. Keep this window open…';
    try{
      data.proof=await readProof(file);const proofIssue=SaiVistaMarathon.proofIssue(data);if(proofIssue)throw Error(proofIssue);
      data.action='marathon-entry';data.requestId=requestId;
      const response=await fetch(config.endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({payload:JSON.stringify(data)}),signal:AbortSignal.timeout(90000)});
      const result=await response.json();if(!result.ok)throw Error(result.error||'Could not save your entry. Retry with the same details; do not pay again.');
      if(result.reference!==requestId||result.status!=='pending-verification')throw Error('Could not confirm the saved reference. Retry with the same details; do not pay again.');
      saved=true;form.hidden=true;success.hidden=false;document.getElementById('marathonEntryReference').textContent=requestId;
      const group=document.getElementById('marathonUpdatesGroup');group.href='https://chat.whatsapp.com/HhO4yXkBBb171GuQevJrmk';
      status.textContent='Entry received. The committee will verify the payment before sending your BIB confirmation email.';success.tabIndex=-1;success.focus();
    }catch(error){status.textContent=(error.name==='TimeoutError'||error.name==='TypeError')?'Connection interrupted. Your entry may have been saved. Retry with the same details and screenshot; do not pay again.':error.message;}
    finally{busy=false;close.disabled=false;dialog.removeAttribute('aria-busy');refresh();}
  });
  const rows=document.getElementById('marathonScheduleRows');if(rows)for(const item of SaiVistaMarathon.schedule){const tr=document.createElement('tr');item.forEach((value,index)=>{const cell=document.createElement(index===0?'th':'td');if(index===0)cell.scope='row';cell.textContent=value;tr.append(cell);});rows.append(tr);}
  const banner=document.getElementById('marathonInterest');
  if(window.Motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){window.Motion.animate(banner.querySelector('.marathon-visual img'),{scale:[1.035,1]},{duration:1.1,ease:'easeOut'});observer.disconnect();}},{threshold:.1});observer.observe(banner);}
})();
