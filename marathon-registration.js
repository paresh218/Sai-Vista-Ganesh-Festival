(() => {
  const dialog=document.getElementById('marathonEntryDialog'),form=document.getElementById('marathonEntryForm');if(!dialog||!form)return;
  const config=window.SaiVistaMarathonConfig||{},status=document.getElementById('marathonEntryStatus'),submit=document.getElementById('marathonEntrySubmit'),close=document.getElementById('marathonEntryClose'),pay=document.getElementById('marathonPayLink'),payBackup=document.getElementById('marathonPayBackupLink'),success=document.getElementById('marathonEntrySuccess');
  let opener,ready=false,busy=false,requestId='',saved=false,checking=false,capacityClosed=false;
  const saving=document.getElementById('marathonSaving');
  saving.addEventListener('cancel',event=>event.preventDefault());
  const closed=()=>capacityClosed||Date.now()>=Date.parse(SaiVistaMarathon.event.deadline);
  const closureMessage=()=>capacityClosed?'Registration closed: all 200 participant places are filled.':'Registration closed on 14 November 2026 at 5:00 PM IST.';
  function refresh(){
    document.querySelectorAll('[data-marathon-open]').forEach(button=>button.disabled=closed());
    const age=SaiVistaMarathon.age(form.elements.dob.value),minor=age>=0&&age<18;
    const size=form.elements.shirt,choices=SaiVistaMarathon.sizesFor(form.elements.dob.value),key=choices.join(',');
    if(size.dataset.choices!==key){const selected=size.value;size.replaceChildren(new Option('Choose size',''));for(const value of choices)size.add(new Option(/^\d+$/.test(value)?'Kids '+value:value,value));size.value=choices.includes(selected)?selected:'';size.dataset.choices=key;}
    document.getElementById('marathonShirtHelp').textContent=age>=0&&age<16?'Under 16: choose a kids numeric size (20–36) using the chart. Letter sizes remain available if needed.':'Choose an adult letter size. Enter date of birth to see kids numeric sizes for participants under 16.';
    document.getElementById('marathonGuardian').hidden=!minor;form.elements.guardian.required=minor;form.elements.guardianConsent.required=minor;
    const accompanied=age>=0&&age<=12;document.getElementById('marathonParentAccompanied').hidden=!accompanied;form.elements.parentAccompanied.required=accompanied;if(!accompanied)form.elements.parentAccompanied.checked=false;
    const medicalNoteRequired=form.elements.medical.value==='Yes';
    document.getElementById('marathonMedicalNote').hidden=!medicalNoteRequired;form.elements.medicalDetails.required=medicalNoteRequired;
    const feeLabel=form.elements.race.value==='5K'?'5 km · ₹199':'3 km · ₹149';
    document.getElementById('marathonEntryFee').textContent=feeLabel;document.getElementById('marathonBackupFee').textContent=feeLabel;
    const canPay=ready&&!closed()&&!busy&&!saved;
    document.getElementById('marathonPaymentAvailability').textContent=closed()?'Registration closed. Please do not pay.':ready?'Payment evidence will be checked by the committee.':'Registration is being connected. Please wait to pay.';
    for(const [link,option] of [[pay,1],[payBackup,2]]){if(canPay){link.href=SaiVistaMarathon.paymentLink(form.elements.race.value,option);link.removeAttribute('aria-disabled');}else{link.removeAttribute('href');link.setAttribute('aria-disabled','true');}}
    const proof=form.elements.paymentProof.files[0];submit.disabled=!canPay||!proof||!form.elements.paymentDeclared.checked;
    submit.textContent=busy?'Saving your entry…':closed()?'Registration closed':!ready?'Registration setup in progress':saved?'Entry submitted':'Submit for payment verification';
    if(closed()&&!saved)status.textContent=closureMessage();
  }
  async function readiness(preserveStatus=false){
    if(checking||busy||!config.registrationEnabled||!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.endpoint||''))return;
    checking=true;ready=false;refresh();if(dialog.open&&!saved&&!preserveStatus)status.textContent='Checking registration availability…';
    try{const response=await fetch(config.endpoint,{cache:'no-store',signal:AbortSignal.timeout(30000)}),data=await response.json();
      if(data.ok!==true||data.service!=='sai-vista-marathon-2026-manual-v1')throw Error('Invalid registration response.');
      const counts=data.counts;
      if(counts&&['3K','5K','total','limit'].every(key=>Number.isInteger(counts[key])&&counts[key]>=0)&&counts.total===counts['3K']+counts['5K']&&counts.limit===200){
        document.querySelectorAll('[data-marathon-count]').forEach(node=>node.textContent=String(counts[node.dataset.marathonCount]));
        document.getElementById('marathonCountStatus').textContent=counts.total+' of 200 places filled · Includes entries awaiting payment verification.';
      }else{document.getElementById('marathonCountStatus').textContent='Participant counts are temporarily unavailable.';}
      capacityClosed=data.closedReason==='capacity'||!!counts&&counts.total>=200;
      ready=data.acceptingEntries===true&&!capacityClosed;
      document.getElementById('marathonCapacityNotice').textContent=closed()?closureMessage():'Registration closes at 200 total participants or 14 November 2026, 5:00 PM IST, whichever comes first.';
      if(dialog.open&&!saved&&!preserveStatus)status.textContent=ready?'Pay the correct fee, then attach your screenshot.':'Registration is unavailable. Please do not pay yet.';
    }
    catch(_){document.getElementById('marathonCountStatus').textContent='Cannot refresh participant counts right now. Please try again shortly.';if(dialog.open&&!saved&&!preserveStatus)status.textContent='Cannot reach registration right now. Please do not pay yet. Reopen this form to retry.';}
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
    if(!ready||closed()){status.textContent=closed()?closureMessage():'Registration setup is pending. No details have been submitted. Please do not pay yet.';refresh();return;}
    if(!form.reportValidity())return;
    const file=form.elements.paymentProof.files[0];if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3145728){status.textContent='Attach a JPG, PNG or WebP payment screenshot up to 3 MB.';return;}
    const data=Object.fromEntries(new FormData(form));delete data.paymentProof;data.flat=(typeof ResidentAccess==='undefined'?data.flat:ResidentAccess.parse(data.flat))||data.flat.trim().toUpperCase();data.agreed=form.elements.agreed.checked;data.guardianConsent=form.elements.guardianConsent.checked;data.paymentDeclared=form.elements.paymentDeclared.checked;data.parentAccompanied=form.elements.parentAccompanied.checked;
    const issue=SaiVistaMarathon.validate(data);if(issue){status.textContent=issue;return;}
    if(data.medical!=='Yes')data.medicalDetails='';
    if(SaiVistaMarathon.age(data.dob)>=18){data.guardian='';data.guardianConsent=false;}
    busy=true;close.disabled=true;dialog.setAttribute('aria-busy','true');refresh();status.textContent='Uploading payment evidence and saving your entry. Keep this window open…';
    try{
      saving.showModal();
      data.proof=await readProof(file);const proofIssue=SaiVistaMarathon.proofIssue(data);if(proofIssue)throw Error(proofIssue);
      data.action='marathon-entry';data.requestId=requestId;
      const response=await fetch(config.endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({payload:JSON.stringify(data)}),signal:AbortSignal.timeout(90000)});
      const result=await response.json();if(!result.ok)throw Error(result.error||'Could not save your entry. Retry with the same details; do not pay again.');
      if(result.reference!==requestId||result.status!=='pending-verification')throw Error('Could not confirm the saved reference. Retry with the same details; do not pay again.');
      saved=true;form.hidden=true;success.hidden=false;document.getElementById('marathonEntryReference').textContent=requestId;
      const group=document.getElementById('marathonUpdatesGroup');group.href='https://chat.whatsapp.com/HhO4yXkBBb171GuQevJrmk';
      status.textContent='Entry received. The committee will verify the payment before sending your BIB confirmation email.';success.tabIndex=-1;
    }catch(error){status.textContent=(error.name==='TimeoutError'||error.name==='TypeError')?'Connection interrupted. Your entry may have been saved. Retry with the same details and screenshot; do not pay again.':error.message;}
    finally{if(saving.open)saving.close();busy=false;close.disabled=false;dialog.removeAttribute('aria-busy');refresh();if(saved)success.focus();readiness(true);}
  });
  const rows=document.getElementById('marathonScheduleRows');if(rows)for(const item of SaiVistaMarathon.schedule){const tr=document.createElement('tr');item.forEach((value,index)=>{const cell=document.createElement(index===0?'th':'td');if(index===0)cell.scope='row';cell.textContent=value;tr.append(cell);});rows.append(tr);}
  const banner=document.getElementById('marathonInterest');
  readiness();setInterval(()=>{if(!document.hidden)readiness();},60000);
  setTimeout(()=>{refresh();document.getElementById('marathonCapacityNotice').textContent=closureMessage();},Math.max(0,Date.parse(SaiVistaMarathon.event.deadline)-Date.now()));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)readiness();});
  if(window.Motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){window.Motion.animate(banner.querySelector('.marathon-visual img'),{scale:[1.035,1]},{duration:1.1,ease:'easeOut'});observer.disconnect();}},{threshold:.1});observer.observe(banner);}
})();
