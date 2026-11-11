(() => {
  const grid=document.getElementById('marathonMyEntriesGrid'),status=document.getElementById('marathonMyEntriesStatus'),refresh=document.getElementById('marathonMyEntriesRefresh');
  if(!grid||!status||!refresh)return;
  let generation=0;
  function clear(){generation++;grid.replaceChildren();status.textContent='Sign in to see your entries.';refresh.disabled=false;}
  async function request(action,fields,identity){
    const response=await fetch(window.SaiVistaMarathonConfig.endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({payload:JSON.stringify({action,...fields,token:identity.token,flat:identity.flat})}),signal:AbortSignal.timeout(30000)});
    const result=await response.json();if(!result.ok)throw Error(result.error||'Could not load your entries. Please try again.');return result;
  }
  function render(entry,identity,version){
    const card=document.createElement('form');card.className='marathon-my-entry';
    const title=document.createElement('h3');title.textContent=entry.name;card.append(title);
    const details=document.createElement('p');details.textContent=entry.race+' · '+entry.status+(entry.bib?' · BIB '+entry.bib:'');card.append(details);
    const nameLabel=document.createElement('label');nameLabel.textContent='Name on the BIB';
    const name=document.createElement('input');name.value=entry.bibName;name.required=true;name.maxLength=30;name.autocomplete='off';nameLabel.append(name);card.append(nameLabel);
    const sizeLabel=document.createElement('label');sizeLabel.textContent='T-shirt size';const size=document.createElement('select');size.required=true;
    for(const value of SaiVistaMarathon.event.sizes){const option=document.createElement('option');option.value=value;option.textContent=value;size.append(option);}size.value=entry.shirt;sizeLabel.append(size);card.append(sizeLabel);
    const save=document.createElement('button');save.type='submit';save.className='btn btn-dark';save.textContent='Save changes';card.append(save);
    const note=document.createElement('p');note.setAttribute('role','status');card.append(note);
    card.addEventListener('submit',async event=>{
      event.preventDefault();if(save.disabled||version!==generation)return;
      save.disabled=true;name.disabled=true;size.disabled=true;card.setAttribute('aria-busy','true');note.textContent='Saving your changes…';
      try{const result=await request('marathon-edit-entry',{reference:entry.reference,revision:entry.revision,bibName:name.value,shirt:size.value},identity);if(version!==generation)return;entry=result.entry;name.value=entry.bibName;size.value=entry.shirt;note.textContent='T-shirt size and BIB name saved.';}
      catch(error){if(version===generation)note.textContent=error.message;}
      finally{if(version===generation){save.disabled=false;name.disabled=false;size.disabled=false;card.removeAttribute('aria-busy');}}
    });
    grid.append(card);
  }
  async function load(){
    clear();const identity=window.SaiVistaAuthSession;if(!identity||identity.expires<=Date.now())return;
    const version=generation;refresh.disabled=true;status.textContent='Loading your entries securely…';
    try{const result=await request('marathon-my-entries',{},identity);if(version!==generation)return;if(!Array.isArray(result.entries))throw Error('Could not load your entries.');for(const entry of result.entries)render(entry,identity,version);status.textContent=result.entries.length?'Showing entries registered with your signed-in email.':'No marathon entries were found for your signed-in email.';}
    catch(error){if(version===generation){grid.replaceChildren();status.textContent=error.message;}}
    finally{if(version===generation)refresh.disabled=false;}
  }
  refresh.addEventListener('click',load);window.addEventListener('sai-vista-auth-ready',load);window.addEventListener('sai-vista-auth-cleared',clear);window.addEventListener('sai-vista-private-signed-out',clear);load();
})();
