(() => {
  const grid=document.getElementById('marathonMyEntriesGrid'),status=document.getElementById('marathonMyEntriesStatus'),refresh=document.getElementById('marathonMyEntriesRefresh'),blocker=document.getElementById('marathonAccountSaving');
  if(!grid||!status||!refresh||!blocker)return;
  const blockerTitle=document.getElementById('marathonAccountSavingTitle'),blockerHelp=document.getElementById('marathonAccountSavingHelp'),done=document.getElementById('marathonAccountSavingDone');
  let generation=0,entries=[],editing='',busy=false;
  const editClosed=()=>Date.now()>=Date.parse(SaiVistaMarathon.event.deadline);
  function showDeadline(){document.getElementById('marathonEditDeadline').textContent=editClosed()?'Editing closed on 14 November 2026 at 5:00 PM IST. Your entries are read-only.':'Editing closes on 14 November 2026 at 5:00 PM IST. After that, entries are read-only.';}
  function clear(){generation++;entries=[];editing='';grid.replaceChildren();grid.removeAttribute('aria-busy');status.textContent='Sign in to see your entries.';refresh.disabled=false;if(blocker.open)blocker.close();busy=false;}
  async function request(action,fields,identity){
    const response=await fetch(window.SaiVistaMarathonConfig.endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({payload:JSON.stringify({action,...fields,token:identity.token,flat:identity.flat})}),signal:AbortSignal.timeout(30000)});
    const result=await response.json();if(!result.ok)throw Error(result.error||'Could not load your entries. Please try again.');return result;
  }
  function button(text,action){const node=document.createElement('button');node.type='button';node.className='btn btn-outline';node.textContent=text;node.addEventListener('click',action);return node;}
  function registrationDetails(entry){
    const disclosure=document.createElement('details'),summary=document.createElement('summary');summary.textContent='View registration details';disclosure.append(summary);
    const list=document.createElement('dl'),d=entry.details||{};
    const fields=[['Registration reference',entry.reference],['Entry fee',d.fee==null?'—':'₹'+d.fee],['Date of birth',d.dob],['Registration email',d.email],['Mobile number',d.phone],['Flat / Visitor',d.flat],['Gender',d.gender],['Blood group',d.bloodGroup],['Emergency contact',d.emergencyName],['Emergency mobile',d.emergencyPhone],['Parent / guardian',d.guardian],['Guardian consent',d.guardianConsent?'Yes':'Not recorded / not applicable'],['Parent accompanying (12 and under)',d.parentAccompanied?'Yes':'Not recorded / not applicable'],['Medical response',d.medical],['Medical note',d.medicalDetails],['Payment reference',d.paymentReference],['Payment screenshot',d.screenshotReceived?'Received':'Not recorded']];
    for(const [label,value] of fields){const term=document.createElement('dt'),description=document.createElement('dd');term.textContent=label;description.textContent=value||'—';list.append(term,description);}disclosure.append(list);return disclosure;
  }
  function render(identity,version){
    showDeadline();if(editClosed())editing='';
    grid.replaceChildren();refresh.disabled=!!editing||busy;if(!entries.length)return;
    const table=document.createElement('table');table.className='marathon-entries-table';const caption=document.createElement('caption');caption.textContent=entries.length+' marathon '+(entries.length===1?'entry':'entries')+' registered with your signed-in email';table.append(caption);
    const head=document.createElement('thead'),headRow=document.createElement('tr'),labels=['Participant','Distance','BIB number','Name on the BIB','T-shirt size','Payment status','Actions'];
    for(const label of labels){const th=document.createElement('th');th.scope='col';th.textContent=label;headRow.append(th);}head.append(headRow);table.append(head);const body=document.createElement('tbody');table.append(body);
    entries.forEach((entry,index)=>{
      const row=document.createElement('tr');row.className='marathon-my-entry';row.dataset.reference=entry.reference;const cells=labels.map((label,i)=>{const cell=document.createElement(i===0?'th':'td');if(i===0)cell.scope='row';cell.dataset.label=label;row.append(cell);return cell;});
      cells[0].textContent=entry.name;cells[1].textContent=entry.race;cells[2].textContent=entry.bib||'Not assigned';cells[5].textContent=entry.status;
      if(editing===entry.reference){
        const form=document.createElement('form');form.id='marathonAccountEdit'+index;form.className='marathon-entry-actions';
        const name=document.createElement('input');name.value=entry.bibName;name.required=true;name.maxLength=30;name.autocomplete='off';name.setAttribute('aria-label','Name on the BIB for '+entry.name);name.setAttribute('form',form.id);cells[3].append(name);
        const size=document.createElement('select');size.required=true;size.setAttribute('aria-label','T-shirt size for '+entry.name);size.setAttribute('form',form.id);for(const value of SaiVistaMarathon.event.sizes){const option=document.createElement('option');option.value=value;option.textContent=value;size.append(option);}size.value=entry.shirt;cells[4].append(size);
        const save=document.createElement('button');save.type='submit';save.className='btn btn-dark';save.textContent='Save';form.append(save,button('Cancel',()=>{editing='';render(identity,version);}));
        form.addEventListener('submit',event=>{event.preventDefault();saveEntry(entry,name.value,size.value,identity,version);});cells[6].append(form);
      }else{cells[3].textContent=entry.bibName;cells[4].textContent=entry.shirt;if(editClosed())cells[6].textContent='Read-only';else{const edit=button('Edit',()=>{editing=entry.reference;render(identity,version);grid.querySelector('input')?.focus();});edit.disabled=!!editing;cells[6].append(edit);}}
      body.append(row);const detailRow=document.createElement('tr');detailRow.className='marathon-entry-details';const cell=document.createElement('td');cell.colSpan=7;cell.append(registrationDetails(entry));detailRow.append(cell);body.append(detailRow);
    });grid.append(table);
  }
  async function saveEntry(entry,bibName,shirt,identity,version){
    if(busy||version!==generation)return;if(editClosed()){editing='';render(identity,version);status.textContent='Editing is closed. Your entries are read-only.';return;}busy=true;refresh.disabled=true;grid.setAttribute('aria-busy','true');done.hidden=true;blocker.setAttribute('aria-busy','true');blockerTitle.textContent='Saving your changes…';blockerHelp.textContent='Please wait while we save your T-shirt size and BIB name. Keep this page open.';blocker.showModal();
    let message='';
    try{const result=await request('marathon-edit-entry',{reference:entry.reference,revision:entry.revision,bibName,shirt},identity);if(version!==generation)return;entries=entries.map(item=>item.reference===entry.reference?result.entry:item);blockerTitle.textContent='Changes saved';message='Your updated T-shirt size and BIB name are now shown in the grid.';}
    catch(error){if(version!==generation)return;blockerTitle.textContent='Could not confirm your changes';message=error.name==='TimeoutError'||error.name==='TypeError'?'The connection was interrupted.':error.message;try{const result=await request('marathon-my-entries',{},identity);if(version!==generation)return;entries=result.entries;message+=' The grid has been refreshed with your latest saved data.';}catch(_){if(version!==generation)return;entries=[];message+=' Your saved data could not be refreshed. Use Refresh my entries before trying again.';}}
    finally{if(version===generation){busy=false;editing='';grid.removeAttribute('aria-busy');render(identity,version);blockerHelp.textContent=message;blocker.setAttribute('aria-busy','false');done.hidden=false;done.focus();}}
  }
  async function load(){
    if(busy)return;clear();const identity=window.SaiVistaAuthSession;if(!identity||identity.expires<=Date.now())return;const version=generation;refresh.disabled=true;status.textContent='Loading your entries securely…';
    try{const result=await request('marathon-my-entries',{},identity);if(version!==generation)return;if(!Array.isArray(result.entries))throw Error('Could not load your entries.');entries=result.entries;render(identity,version);status.textContent=entries.length?(editClosed()?'Only your registered entries are shown. Editing is closed.':'Only your registered entries are shown. Select Edit to change T-shirt size and BIB name only.'):'No marathon entries were found for your signed-in email.';}
    catch(error){if(version===generation){grid.replaceChildren();status.textContent=error.message;}}finally{if(version===generation)refresh.disabled=false;}
  }
  blocker.addEventListener('cancel',event=>{if(busy)event.preventDefault();});done.addEventListener('click',()=>blocker.close());blocker.addEventListener('close',()=>{if(!busy)refresh.focus();});
  function checkDeadline(){showDeadline();if(editClosed()&&entries.length){editing='';render(window.SaiVistaAuthSession,generation);status.textContent='Only your registered entries are shown. Editing is closed.';}}
  showDeadline();setTimeout(checkDeadline,Math.max(0,Date.parse(SaiVistaMarathon.event.deadline)-Date.now()));document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkDeadline();});
  refresh.addEventListener('click',load);window.addEventListener('sai-vista-auth-ready',()=>{clear();load();});window.addEventListener('sai-vista-auth-cleared',clear);window.addEventListener('sai-vista-private-signed-out',clear);load();
})();
