(() => {
  const dialog=document.getElementById('marathonEntryDialog'),form=document.getElementById('marathonEntryForm');
  if(!dialog||!form)return;
  const status=document.getElementById('marathonEntryStatus'),submit=document.getElementById('marathonEntrySubmit'),close=document.getElementById('marathonEntryClose');
  let opener;
  function refresh(){
    const age=SaiVistaMarathon.age(form.elements.dob.value),minor=age>=0&&age<18;
    document.getElementById('marathonGuardian').hidden=!minor;
    form.elements.guardian.required=minor;form.elements.guardianConsent.required=minor;
    document.getElementById('marathonEntryFee').textContent=(form.elements.race.value==='5K'?'5 km · ₹199':'3 km · ₹149');
    const closed=Date.now()>=Date.parse(SaiVistaMarathon.event.deadline);
    submit.disabled=true;
    submit.textContent=closed?'Registration closed':'Registration opens after payment setup';
    if(closed)status.textContent='Registration closed on 26 November 2026.';
  }
  document.querySelectorAll('[data-marathon-open]').forEach(button=>button.addEventListener('click',()=>{
    opener=button;form.reset();status.textContent='';
    form.elements.race.value=button.dataset.marathonOpen==='5K'?'5K':'3K';
    try{form.elements.flat.value=typeof ResidentAccess==='undefined'?'':ResidentAccess.remembered(localStorage)||'';}catch(_){}
    refresh();dialog.showModal();close.focus();
  }));
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{form.reset();status.textContent='';opener?.focus();});
  form.addEventListener('change',refresh);
  // This preview never transmits personal or medical information, even if the disabled button is altered.
  form.addEventListener('submit',event=>{event.preventDefault();status.textContent='Payment setup is pending. No details have been submitted and no BIB has been reserved.';submit.disabled=true;});
  const banner=document.getElementById('marathonInterest');
  if(window.Motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){
      window.Motion.animate(banner.querySelector('.marathon-visual img'),{scale:[1.035,1]},{duration:1.1,ease:'easeOut'});
      window.Motion.animate(banner.querySelectorAll('.marathon-event-copy>*'),{opacity:[.5,1],transform:['translateY(10px)','translateY(0)']},{duration:.45,delay:window.Motion.stagger(.035)});
      observer.disconnect();
    }},{threshold:.1});observer.observe(banner);
  }
})();
