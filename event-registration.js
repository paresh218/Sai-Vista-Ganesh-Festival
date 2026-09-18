(() => {
  const M = FestivalRegistration;
  const endpoint = window.SaiVistaRegistrationConfig?.endpoint || "";
  const config = {drawingMaxAge:18, fancyDeadline:M.deadline("fancy"), musicUrl:""};
  const el = (tag, text, attrs={}) => {const n=document.createElement(tag); if(text)n.textContent=text; for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v); return n;};
  document.addEventListener("DOMContentLoaded", () => {
    const grid=document.getElementById("eventRegistrationGrid");
    const dialog=document.getElementById("eventRegistrationDialog");
    const form=document.getElementById("festivalEventForm");
    const fields=document.getElementById("festivalEventFields");
    const status=document.getElementById("festivalEventStatus");
    const success=document.getElementById("festivalEventSuccess");
    const submit=document.getElementById("festivalEventSubmit");
    form.noValidate=true;
    const showFieldError=(input,message)=>{
      const id=input.id+'-error';let note=document.getElementById(id);
      if(!note){note=el('small','',{id,class:'field-error'});input.closest('.form-group, label')?.append(note);}
      note.textContent=message;note.hidden=!message;input.setAttribute('aria-invalid',String(Boolean(message)));
      if(message)input.setAttribute('aria-describedby',id);else input.removeAttribute('aria-describedby');
    };
    function checkField(input){
      if(!input.matches('input,select,textarea')||input.disabled||!input.willValidate)return true;
      let error='';
      if(input.validity.valueMissing)error=input.type==='checkbox'?'Please read and accept the event details.':'This field is required.';
      else if(input.value && input.type==='tel'&&!/^[6-9]\d{9}$/.test(M.phone(input.value)))error='Enter a valid Indian mobile number.';
      else if(input.validity.rangeUnderflow||input.validity.rangeOverflow||input.validity.stepMismatch||input.validity.badInput)error='Enter a whole number within the shown range.';
      else if(input.value && /firstName|lastName|player\d+(First|Last)/.test(input.name)&&!/^[\p{L}\p{M}][\p{L}\p{M} .’'-]{0,79}$/u.test(input.value.trim()))error='Use a name of up to 80 characters, without numbers.';
      showFieldError(input,error);return !error;
    }
    form.addEventListener('focusout',event=>{if(event.target.matches('input,select,textarea'))checkField(event.target);});
    form.addEventListener('input',event=>{if(event.target.getAttribute('aria-invalid')==='true')checkField(event.target);});
    let current, requestId, pending=false, ready=false;
    let loaded=false;
    let fundCheckVersion=0;
    let fundChecking=false;
    const fundDialog=el("dialog",null,{class:"fund-check-dialog","aria-labelledby":"fundCheckTitle","aria-describedby":"fundCheckDescription"});
    const fundTitle=el("h2","Checking cultural fund payment",{id:"fundCheckTitle"});
    const fundDescription=el("p","Please wait while we verify your household’s payment.",{id:"fundCheckDescription",role:"status","aria-live":"polite"});
    const fundSpinner=el("div",null,{class:"fund-check-spinner","aria-hidden":"true"});
    const fundDismiss=el("button","OK",{type:"button",class:"btn btn-dark"});
    fundDismiss.addEventListener("click",()=>fundDialog.close());
    fundDialog.addEventListener("cancel",event=>{if(fundChecking)event.preventDefault();});
    fundDialog.append(fundSpinner,fundTitle,fundDescription,fundDismiss);document.body.append(fundDialog);
    const showFundResult=message=>{
      fundSpinner.hidden=true;fundDismiss.hidden=false;
      fundTitle.textContent=message.startsWith("Please pay")?"Please pay the cultural fund first":"Payment verification unavailable";
      fundDescription.textContent=message;fundDialog.setAttribute("aria-busy","false");
      if(!fundDialog.open)fundDialog.showModal();fundDismiss.focus();
    };
    function field(name,label,{type="text",options,required=true,min,max,value}={}) {
      const wrap=el("div",null,{class:"form-group"});
      const id="event-"+name;wrap.append(el("label",label+(required?" *":""),{for:id}));
      const input=el(options?"select":type==="textarea"?"textarea":"input",null,{id,name});
      if(options){input.append(el("option","Select an option",{value:""}));options.forEach(v=>input.append(el("option",v,{value:v})));}
      else if(type!=="textarea")input.type=type;
      if(required)input.required=true;
      if(type==="number"){input.min=min??0;input.max=max??120;input.step=1;}
      else input.maxLength=type==="textarea"?1000:100;
      if(value!==undefined)input.value=value;
      if(type==='tel'){input.inputMode='tel';input.autocomplete='tel';input.placeholder='10-digit mobile number';}
      if(type==='number')input.inputMode='numeric';
      if(name==='firstName')input.autocomplete=current==='blood'?'name':'given-name';
      if(name==='lastName')input.autocomplete='family-name';
      if(type==='number')wrap.append(el('small',`${input.min}–${input.max}`,{class:'field-hint'}));
      wrap.append(input);fields.append(wrap);return input;
    }
    const addPlayer = i => {
      const legend=el("h3","Player "+i);fields.append(legend);
      field("player"+i+"First","First name");field("player"+i+"Last","Last name");field("player"+i+"Phone","Phone number",{type:"tel"});
    };
    async function loadConfig() {
      if(loaded)return;
      if(!endpoint){status.textContent="Registration setup is in progress. You can review the form; online saving will open when the committee connects the registration service.";return;}
      status.textContent="Connecting to registration…";
      try {
        const response=await fetch(endpoint,{signal:AbortSignal.timeout(45000),cache:"no-store"});
        const data=await response.json();
        if(!response.ok||data.service!=="sai-vista-events-v1"||data.status!=="success")throw Error("service");
        Object.assign(config,data.config,{fancyDeadline:M.deadline("fancy")});loaded=true;status.textContent="";
      }catch(_){status.textContent="Unable to connect to registration. Close and reopen the form to retry.";}
    }
    async function open(event) {
      if(M.registrationStatus(event).closed){refreshCards();return;}
      fundCheckVersion++;
      current=event;requestId=crypto.randomUUID();form.reset();form.hidden=false;success.hidden=true;success.replaceChildren();fields.replaceChildren();status.textContent="";submit.disabled=true;ready=false;
      dialog.querySelector('.event-guidelines').hidden=false;
      form.querySelectorAll('.field-error').forEach(node=>node.remove());
      form.elements.agreed.id='event-agreed';form.elements.agreed.removeAttribute('aria-invalid');form.elements.agreed.removeAttribute('aria-describedby');
      form.querySelector(".info-note").textContent="These details are saved for festival coordination. After saving, open WhatsApp and press Send to notify "+(event==="blood"?"Sameer Gandhi":event==="funfair"?"Neeraj Upadhyay":"Priyank")+".";
      form.elements.agreed.closest("label").querySelector("span").textContent=event==="cooking"
        ? "I have read the details and agree to it."
        : ["pooja","prasad"].includes(event) ? "I have read and agreed."
        : M.events[event].rules.includes(M.gift)
          ? "I have read and accept the event guidelines, including one participation gift per child across all competitions."
          : "I have read and accept the event guidelines.";
      const definition=M.events[event];document.getElementById("festivalEventTitle").textContent=definition.title+" · "+definition.date;
      const rules=document.getElementById("festivalEventRules");rules.replaceChildren();
      definition.rules.forEach(rule=>rules.append(el("li",rule)));
      fields.append(el('h3',event==='prasad'?'Household details':'Your details',{class:'field-section-title'}));
      if(!["prasad","funfair"].includes(event)) field("firstName",event==="blood"?"Name":event==="bollywood"?"Wing contact first name":"Participant first name");
      if(!["prasad","funfair","blood"].includes(event)) field("lastName",event==="bollywood"?"Wing contact last name":"Participant last name");
      field("wing","Wing",{options:["A","B","C","D","E","F"]});
      const flats=[];for(let floor=1;floor<=13;floor++)for(let flat=1;flat<=4;flat++)flats.push(String(floor*100+flat));
      field("flatNo","Flat number",{options:flats});
      if(event==="funfair"){field("firstName","Participant first name");field("lastName","Participant last name");}
      if(event!=="prasad") field("phone",event==="blood"?"Mobile number":event==="bollywood"?"Wing contact phone number":"Phone number (parent/guardian for children)",{type:"tel"});
      if(['drawing','talent','treasure','fancy','bollywood','funfair','prasad'].includes(event))fields.append(el('h3','Event details',{class:'field-section-title'}));
      if(["drawing","talent","treasure","fancy"].includes(event))field("age","Participant age (completed years)",{type:"number",min:1,max:event==='fancy'?17:120});
      if(event==="blood") {
        const label=el("label",null,{class:"checkbox-row"});
        label.append(el("input",null,{type:"checkbox",name:"donatedBefore"}),el("span","Have donated blood before?"));fields.append(label);
      }
      if(event==="bollywood") {
        for(let i=1;i<=5;i++)addPlayer(i);
        for(const [source,target] of [["firstName","player1First"],["lastName","player1Last"],["phone","player1Phone"]]) {
          const contact=form.elements[source], player=form.elements[target];
          player.readOnly=true;
          player.title="Automatically filled from the wing contact details. Edit the contact details above to change Player 1.";
          const sync=()=>{player.value=contact.value;};
          contact.addEventListener("input",sync);contact.addEventListener("change",sync);sync();
        }
        const add=el("button","Add sixth player",{type:"button",class:"btn btn-outline"});
        add.addEventListener("click",()=>{addPlayer(6);add.remove();});fields.append(add);
      }
      if(event==="talent") {
        const kind=field("performanceType","Performance category",{options:["Solo","Group"]});
        field("actType","Act type (dance, singing, instrumental, etc.)");field("performanceTitle","Performance / song title");
        const duration=field("durationSeconds","Duration in seconds",{type:"number",min:1,max:120});
        const group=field("groupName","Group name (same for every group member)",{required:false});group.parentElement.hidden=true;
        kind.addEventListener("change",()=>{const isGroup=kind.value==="Group";group.required=isGroup;group.parentElement.hidden=!isGroup;duration.max=isGroup?240:120;if(!isGroup)group.value="";});
      }
      if(event==="treasure")field("teamName","Team name / individual interest");
      if(event==="funfair"){field("stallName","Stall name");field("stallDetails","What will your stall offer?",{type:"textarea"});fields.append(el("p","One entry requests one table at ₹500, non-refundable."));
        const payment=el("div",null,{class:"funfair-payment"});
        payment.append(el("h3","Pay ₹500 to Neeraj Upadhyay"),el("p","UPI ID: neeraj18upadhyay1@ybl"),el("img",null,{src:"assets/neeraj-funfair-qr.jpeg",alt:"PhonePe payment QR for Neeraj Upadhyay",style:"display:block;width:100%;max-width:280px;height:auto;margin:16px auto"}),el("a","Pay ₹500 with UPI ↗",{href:"upi://pay?pa=neeraj18upadhyay1%40ybl&pn=Neeraj%20Upadhyay&am=500.00&cu=INR&tn=Sai%20Vista%20Fun%20Fair%20Stall",class:"btn btn-dark"}),el("p","When scanning the QR, enter ₹500 and verify the recipient before paying. Payment does not submit this form; complete your registration below. The stall fee is separate from the cultural fund and is non-refundable."));const copy=el("button","Copy UPI ID",{type:"button",class:"btn btn-outline"});
        const copyStatus=el("p","",{role:"status","aria-live":"polite"});
        copy.addEventListener("click",async()=>{
          try {await navigator.clipboard.writeText("neeraj18upadhyay1@ybl");copyStatus.textContent="UPI ID copied. Paste it into your UPI app to pay ₹500.";}
          catch(_){copyStatus.textContent="Copy is unavailable. Use UPI ID neeraj18upadhyay1@ybl in your UPI app.";}
        });
        payment.append(copy,copyStatus);fields.append(payment);}
      if(event==="fancy")field("costume","Costume / character and introduction",{type:"textarea"});
      if(event==="prasad"){field("adults","Adults attending",{type:"number",min:0,max:100,value:0});field("children","Children attending",{type:"number",min:0,max:100,value:0});}
      let verifyFund;
      if(event==="funfair") {
        const wing=form.elements.wing, flat=form.elements.flatNo;
        const gated=[...fields.children].filter(node=>!node.contains(wing)&&!node.contains(flat));
        const agreement=form.elements.agreed.closest("label");
        const fundMessage=el("p","Select your wing and flat to verify your cultural fund payment.",{role:"status","aria-live":"polite"});
        const retry=el("button","Check cultural fund payment",{type:"button",class:"btn btn-outline"});
        fields.prepend(fundMessage);fields.append(retry);
        const gate=paid=>{for(const node of gated){node.hidden=!paid;for(const input of node.querySelectorAll("input,textarea,select"))input.disabled=!paid;}agreement.hidden=!paid;form.elements.agreed.disabled=!paid;submit.hidden=!paid;ready=paid&&loaded;submit.disabled=!ready;};
        gate(false);
        verifyFund=async()=>{
          if(fundChecking)return;
          const version=++fundCheckVersion;gate(false);retry.disabled=false;
          if(!wing.value||!flat.value){fundMessage.textContent="Select your wing and flat to verify your cultural fund payment.";return;}
          retry.disabled=true;fundMessage.textContent="Checking your cultural fund payment…";
          fundChecking=true;wing.disabled=true;flat.disabled=true;
          fundSpinner.hidden=false;fundDismiss.hidden=true;fundTitle.textContent="Checking cultural fund payment";
          fundDescription.textContent="Please wait while we verify your household’s payment. This may take a few seconds.";
          fundDialog.setAttribute("aria-busy","true");fundDialog.showModal();
          try {
            const response=await fetch(M.collectionUrl,{cache:"no-store",signal:AbortSignal.timeout(45000)});
            if(!response.ok)throw Error("Unavailable");
            const result=M.culturalFundStatus(await response.json(),wing.value,flat.value);
            if(version!==fundCheckVersion||current!=="funfair"||!dialog.open)return;
            fundMessage.textContent=result.message;gate(result.paid);
            if(result.paid)fundDialog.close();else showFundResult(result.message);
          }catch(_){if(version===fundCheckVersion){fundMessage.textContent="We could not verify the cultural fund payment right now. Please try again shortly.";gate(false);showFundResult(fundMessage.textContent);}}
          finally{
            fundChecking=false;wing.disabled=false;flat.disabled=false;
            fundDialog.setAttribute("aria-busy","false");
            if(version===fundCheckVersion)retry.disabled=false;
          }
        };
        wing.addEventListener("change",verifyFund);flat.addEventListener("change",verifyFund);retry.addEventListener("click",verifyFund);
      }else{submit.hidden=false;form.elements.agreed.disabled=false;form.elements.agreed.closest("label").hidden=false;}
      dialog.showModal();await loadConfig();
      if(current!==event || !dialog.open)return;
      if(event==="drawing")rules.firstChild.textContent="Ages 3–6: Colouring; 7–12: Drawing & Colouring; 13–"+config.drawingMaxAge+": Drawing & Colouring.";
      if(event==="talent") {
        if(/^https:\/\//.test(config.musicUrl))rules.append(el("li")).append(el("a","Upload your audio file",{href:config.musicUrl,target:"_blank",rel:"noopener"}));
        else rules.append(el("li","The music submission link is awaiting committee confirmation. Contact Priyank for the link."));
      }
      rules.append(el("li",M.registrationStatus(event).label));
      if(M.registrationStatus(event).closed){status.textContent="Nominations are closed.";return;}
      if(event==="blood" && config.registrationRevision!=="2026-09-17"){
        status.textContent="Blood donation registration will open once the committee activates the updated registration service.";return;
      }
      if(event==="funfair"){await verifyFund();return;}
      ready=loaded;submit.disabled=!ready;
    }
    const cards=[];
    let cardOrder='';
    let activeFilter='upcoming';
    const programmeCards=[];
    function filterCards(){
      let count=0;const today=FestivalExperience.dayKey();
      for(const item of [...cards,...programmeCards]){
        const meta=item.meta||EventUX.metadata[item.id];const closed=item.meta?false:M.registrationStatus(item.id).closed;
        item.card.hidden=!EventUX.matches(meta,activeFilter,closed,today);if(!item.card.hidden)count++;
      }
      document.getElementById('eventResults').textContent=count+' events shown';document.getElementById('eventEmpty').hidden=count>0;
    }
    function refreshCards() {
      for(const {id,button,note,badge} of cards){const state=M.registrationStatus(id);const display=FestivalExperience.badge(id);badge.textContent=display.label;badge.className='registration-badge '+display.tone;button.hidden=state.closed;button.disabled=state.closed;button.textContent=state.closed?"Nominations closed":id==="blood"?"Interested in blood donation":id==="treasure"?"Register interest":"Open registration";note.textContent=state.label;}
      const sorted=[...cards,...programmeCards].sort((a,b)=>(a.meta?1:FestivalExperience.badge(a.id).rank)-(b.meta?1:FestivalExperience.badge(b.id).rank)||(a.meta||EventUX.metadata[a.id]).days[0]-(b.meta||EventUX.metadata[b.id]).days[0]);
      const nextOrder=sorted.map(item=>item.id||item.meta.id).join(',');
      if(cardOrder!==nextOrder){for(const item of sorted)grid.append(item.card);cardOrder=nextOrder;}
      filterCards();
      document.querySelectorAll('[data-register-event]').forEach(button=>{const state=M.registrationStatus(button.dataset.registerEvent);button.hidden=state.closed;button.disabled=state.closed;if(state.closed)button.textContent="Nominations closed";});
      document.querySelectorAll('[data-registration-link]').forEach(link=>{
        const event=link.dataset.registrationLink;
        link.hidden=event==='all'?Object.keys(M.events).every(id=>M.registrationStatus(id).closed):M.registrationStatus(event).closed;
      });
      if(current && dialog.open && M.registrationStatus(current).closed && !pending){ready=false;submit.disabled=true;form.hidden=true;status.textContent="Nominations are closed.";}
    }
    for(const [id,event] of Object.entries(M.events)) {
      const card=el("article",null,{class:"form-card"});const badge=el('span','',{class:'registration-badge'});card.append(badge,el("div",event.date,{class:"form-tag"}),el("h3",event.title));
      const meta=EventUX.metadata[id];const details=el('div',null,{class:'event-meta'});details.append(el('p',meta.time),el('p',meta.venue));card.append(details);
      if(id==="blood")card.append(el("p","Coordinators: Sameer Gandhi & Deepak Karade."));
      if(id==="cooking")card.append(el("img",null,{src:"assets/artisanal-sweets.jpeg",alt:"Artisanal Sweets — Homemade Delicacies",class:"sponsor-logo"}),el("p","Participation gift for all. Gifts worth ₹10,000 in total, sponsored by Artisanal Sweets."));
      const note=el("p");const button=el("button","",{type:"button",class:"btn btn-outline"});button.addEventListener("click",()=>open(id));card.append(note,button);
      const recipient=id==='blood'?['Sameer Gandhi','919326199515']:id==='funfair'?['Neeraj Upadhyay',window.SaiVistaRegistrationConfig?.funfairWhatsApp]:['committee (Priyank)','917621940889'];
      if(recipient[1])card.append(el('a','Contact '+recipient[0]+' ↗',{class:'event-contact',href:'https://wa.me/'+recipient[1]+'?text='+encodeURIComponent('Hi, I have a question about '+event.title+' at Sai Vista Ganesh Festival.'),target:'_blank',rel:'noopener noreferrer'}));
      grid.append(card);cards.push({id,card,button,note,badge});
    }
    for(const meta of EventUX.programme){
      const card=el('article',null,{class:'form-card programme-card'});
      const date=meta.id==='aarti'?'15–24 September 2026':meta.days[0]+' September 2026';
      card.append(el('span','Programme',{class:'registration-badge programme'}),el('div',date,{class:'form-tag'}),el('h3',meta.title));
      const details=el('div',null,{class:'event-meta'});details.append(el('p',meta.time||'Time to be announced'),el('p',meta.venue||'Sai Vista, Rahatani'));card.append(details);
      if(meta.href)card.append(el('a','Choose an Aarti slot',{href:meta.href,class:'btn btn-outline'}));
      else card.append(el('p','Contact the committee for participation details.'),el('a','Contact committee (Priyank) ↗',{class:'event-contact',href:'https://wa.me/917621940889?text='+encodeURIComponent('Hi, I have a question about '+meta.title+'.'),target:'_blank',rel:'noopener'}));
      programmeCards.push({card,meta});grid.append(card);
    }
    document.querySelectorAll('[data-event-filter]').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.eventFilter;document.querySelectorAll('[data-event-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));filterCards();}));
    refreshCards();setInterval(refreshCards,1000);
    window.addEventListener("focus",refreshCards);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshCards();});
    document.querySelectorAll('[data-register-event]').forEach(button=>button.addEventListener("click",()=>open(button.dataset.registerEvent)));
    const close=()=>{if(!pending)dialog.close();};document.getElementById("closeFestivalEvent").addEventListener("click",close);
    dialog.addEventListener("cancel",event=>{if(pending)event.preventDefault();});
    form.addEventListener("submit",async event=>{
      event.preventDefault();if(pending||!ready)return;
      let firstInvalid;for(const input of form.elements)if(!checkField(input)&&!firstInvalid)firstInvalid=input;
      if(firstInvalid){status.textContent='Please correct the highlighted fields.';firstInvalid.focus();return;}
      const data=Object.fromEntries(new FormData(form));data.event=current;data.requestId=requestId;data.agreed=form.elements.agreed.checked;
      if(current==="bollywood"){data.players=[];for(let i=1;i<=6;i++)if(data["player"+i+"First"]!==undefined){data.players.push({firstName:data["player"+i+"First"],lastName:data["player"+i+"Last"],phone:data["player"+i+"Phone"]});for(const suffix of ["First","Last","Phone"])delete data["player"+i+suffix];}}
      if(current==="blood"){data.donatedBefore=form.elements.donatedBefore.checked;data.lastName="";}
      if(M.registrationStatus(current).closed){status.textContent="Nominations are closed.";ready=false;submit.disabled=true;refreshCards();return;}
      const error=M.validate(data,config);if(error){status.textContent=error;if(current==='prasad' && /counts/.test(error)){showFieldError(form.elements.adults,error);form.elements.adults.focus();}return;}
      pending=true;submit.disabled=true;status.textContent="Saving your registration…";
      for(const node of form.elements)node.disabled=true;
      try {
        const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({payload:JSON.stringify(data)}),signal:AbortSignal.timeout(60000)});
        const result=await response.json();
        if(!response.ok||result.status!=="success"||result.registrationId!==requestId)throw Error(result.message||"Registration could not be confirmed. Retry with the same details.");
        const recipient=current==="blood"?"Sameer Gandhi":current==="funfair"?"Neeraj Upadhyay":"Priyank";
        const recipientPhone=current==="blood"?"919326199515":current==="funfair"?(window.SaiVistaRegistrationConfig.funfairWhatsApp||""):"917621940889";
        const summary=EventUX.whatsapp(data,M.events[current].title,M.events[current].date,recipient);
        success.append(el('span','Step 1 complete',{class:'registration-badge open'}),el("h3","Registration saved"),el('p',M.events[current].title),el("p","Reference: "+requestId));
        const details=el('dl',null,{class:'registration-summary'});
        for(const [label,value] of EventUX.summary(data)){details.append(el('dt',label),el('dd',value,label==='Have donated blood before?'?{}:{'data-no-translate':'true'}));}
        success.append(details,el('h4','Step 2: notify your coordinator'),el('p','Your registration is saved. No WhatsApp message has been sent yet.'));
        if(/^[1-9]\d{9,14}$/.test(recipientPhone)){
          const notify=el("a","Notify "+recipient+" on WhatsApp ↗",{href:"https://wa.me/"+recipientPhone+"?text="+encodeURIComponent(summary),target:"_blank",rel:"noopener",class:"btn btn-dark"});
          const hint=el('p','Open WhatsApp, review your details and press Send.');
          notify.addEventListener('click',()=>{hint.textContent='WhatsApp opened. Press Send there to notify your coordinator. We cannot confirm message delivery.';});
          success.append(notify,hint);
        }
        else success.append(el("p","Your registration is saved. Neeraj Upadhyay’s WhatsApp contact is awaiting confirmation."));
        form.hidden=true;dialog.querySelector('.event-guidelines').hidden=true;success.hidden=false;status.textContent="";success.tabIndex=-1;success.focus();
      }catch(error){status.textContent=error.name==="TimeoutError"?"Confirmation timed out. Retry with the same details; the same entry will not be saved twice.":error.message;}
      finally{pending=false;for(const node of form.elements)node.disabled=false;submit.disabled=!ready;}
    });
  });
})();
