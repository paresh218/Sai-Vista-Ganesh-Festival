(() => {
  const M = FestivalRegistration;
  const endpoint = window.SaiVistaRegistrationConfig?.endpoint || "";
  const config = {drawingMaxAge:18, fancyDeadline:"", musicUrl:""};
  const el = (tag, text, attrs={}) => {const n=document.createElement(tag); if(text)n.textContent=text; for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v); return n;};
  document.addEventListener("DOMContentLoaded", () => {
    const grid=document.getElementById("eventRegistrationGrid");
    const dialog=document.getElementById("eventRegistrationDialog");
    const form=document.getElementById("festivalEventForm");
    const fields=document.getElementById("festivalEventFields");
    const status=document.getElementById("festivalEventStatus");
    const success=document.getElementById("festivalEventSuccess");
    const submit=document.getElementById("festivalEventSubmit");
    let current, requestId, pending=false, ready=false;
    let loaded=false;
    let fundCheckVersion=0;
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
      wrap.append(input);fields.append(wrap);return input;
    }
    const addPlayer = i => {
      const legend=el("h3","Player "+i);fields.append(legend);
      field("player"+i+"First","First name");field("player"+i+"Last","Last name");field("player"+i+"Phone","Phone number",{type:"tel"});
    };
    async function loadConfig() {
      if(loaded)return;
      if(!endpoint){status.textContent="Registration setup is in progress. You can review the form; online saving will open when the committee connects the registration service.";return;}
      try {
        const response=await fetch(endpoint,{signal:AbortSignal.timeout(15000),cache:"no-store"});
        const data=await response.json();
        if(!response.ok||data.service!=="sai-vista-events-v1"||data.status!=="success")throw Error("service");
        Object.assign(config,data.config);loaded=true;
      }catch(_){status.textContent="Unable to connect to registration. Close and reopen the form to retry.";}
    }
    async function open(event) {
      fundCheckVersion++;
      current=event;requestId=crypto.randomUUID();form.reset();form.hidden=false;success.hidden=true;success.replaceChildren();fields.replaceChildren();status.textContent="";submit.disabled=true;ready=false;
      form.querySelector(".info-note").textContent="These details are saved for festival coordination. After saving, open WhatsApp and press Send to notify "+(event==="funfair"?"Neeraj Upadhyay":"Priyank")+".";
      const definition=M.events[event];document.getElementById("festivalEventTitle").textContent=definition.title+" · "+definition.date;
      const rules=document.getElementById("festivalEventRules");rules.replaceChildren();
      definition.rules.forEach(rule=>rules.append(el("li",rule)));
      if(event!=="prasad") field("firstName",event==="bollywood"?"Wing contact first name":"Participant first name");
      if(event!=="prasad") field("lastName",event==="bollywood"?"Wing contact last name":"Participant last name");
      field("wing","Wing",{options:["A","B","C","D","E","F"]});
      const flats=[];for(let floor=1;floor<=13;floor++)for(let flat=1;flat<=4;flat++)flats.push(String(floor*100+flat));
      field("flatNo","Flat number",{options:flats});if(event!=="prasad") field("phone","Phone number (parent/guardian for children)",{type:"tel"});
      if(["drawing","talent","treasure","rangoli","thali","fancy","cooking"].includes(event))field("age","Participant age (completed years)",{type:"number",min:event==="cooking"?18:1});
      if(event==="bollywood") {
        for(let i=1;i<=5;i++)addPlayer(i);
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
        payment.append(el("h3","Pay ₹500 to Neeraj Upadhyay"),el("p","UPI ID: neeraj18upadhyay1@ybl"),el("img",null,{src:"assets/neeraj-funfair-qr.jpeg",alt:"PhonePe payment QR for Neeraj Upadhyay",style:"display:block;width:100%;max-width:280px;height:auto;margin:16px auto"}),el("a","Pay ₹500 with UPI ↗",{href:"upi://pay?pa=neeraj18upadhyay1%40ybl&pn=Neeraj%20Upadhyay&am=500.00&cu=INR&tn=Sai%20Vista%20Fun%20Fair%20Stall",class:"btn btn-dark"}),el("p","When scanning the QR, enter ₹500 and verify the recipient before paying. Payment does not submit this form; complete your registration below. The stall fee is separate from the cultural fund and is non-refundable."));fields.append(payment);}
      if(event==="fancy")field("costume","Costume / character and introduction",{type:"textarea"});
      if(event==="cooking"){field("dishName","Creative dish name");field("ingredients","Ingredients for coordinator approval",{type:"textarea"});}
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
          const version=++fundCheckVersion;gate(false);retry.disabled=false;
          if(!wing.value||!flat.value){fundMessage.textContent="Select your wing and flat to verify your cultural fund payment.";return;}
          retry.disabled=true;fundMessage.textContent="Checking your cultural fund payment…";
          try {
            const response=await fetch(M.collectionUrl,{cache:"no-store",signal:AbortSignal.timeout(15000)});
            if(!response.ok)throw Error("Unavailable");
            const result=M.culturalFundStatus(await response.json(),wing.value,flat.value);
            if(version!==fundCheckVersion||current!=="funfair"||!dialog.open)return;
            fundMessage.textContent=result.message;gate(result.paid);
          }catch(_){if(version===fundCheckVersion){fundMessage.textContent="We could not verify the cultural fund payment right now. Please try again shortly.";gate(false);}}
          finally{if(version===fundCheckVersion)retry.disabled=false;}
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
      if(event==="fancy") {
        if(!config.fancyDeadline){status.textContent="Fancy Dress registration will open once the committee confirms the registration deadline.";return;}
        rules.append(el("li","Registration deadline: "+new Date(config.fancyDeadline).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})+" IST."));
        if(Date.now()>=Date.parse(config.fancyDeadline)){status.textContent="Fancy Dress registration is closed.";return;}
      }
      if(event==="funfair"){await verifyFund();return;}
      ready=loaded;submit.disabled=!ready;
    }
    for(const [id,event] of Object.entries(M.events)) {
      const card=el("article",null,{class:"form-card"});card.append(el("div",event.date,{class:"form-tag"}),el("h3",event.title));
      const button=el("button",id==="treasure"?"Register interest":"Open registration",{type:"button",class:"btn btn-outline"});button.addEventListener("click",()=>open(id));card.append(button);grid.append(card);
    }
    const close=()=>{if(!pending)dialog.close();};document.getElementById("closeFestivalEvent").addEventListener("click",close);
    dialog.addEventListener("cancel",event=>{if(pending)event.preventDefault();});
    form.addEventListener("submit",async event=>{
      event.preventDefault();if(pending||!ready)return;
      const data=Object.fromEntries(new FormData(form));data.event=current;data.requestId=requestId;data.agreed=form.elements.agreed.checked;
      if(current==="bollywood"){data.players=[];for(let i=1;i<=6;i++)if(data["player"+i+"First"]!==undefined){data.players.push({firstName:data["player"+i+"First"],lastName:data["player"+i+"Last"],phone:data["player"+i+"Phone"]});for(const suffix of ["First","Last","Phone"])delete data["player"+i+suffix];}}
      const error=M.validate(data,config);if(error){status.textContent=error;return;}
      pending=true;submit.disabled=true;status.textContent="Saving your registration…";
      for(const node of form.elements)node.disabled=true;
      try {
        const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({payload:JSON.stringify(data)}),signal:AbortSignal.timeout(30000)});
        const result=await response.json();
        if(!response.ok||result.status!=="success"||result.registrationId!==requestId)throw Error(result.message||"Registration could not be confirmed. Retry with the same details.");
        const recipient=current==="funfair"?"Neeraj Upadhyay":"Priyank";
        const recipientPhone=current==="funfair"?(window.SaiVistaRegistrationConfig.funfairWhatsApp||""):"917621940889";
        const summary=["Hi "+recipient+", I registered for "+M.events[current].title+" ("+M.events[current].date+").","Reference: "+requestId,...Object.entries(data).filter(([key])=>!["event","requestId","agreed"].includes(key)).map(([key,value])=>key+": "+(key==="players"?value.map(p=>p.firstName+" "+p.lastName+" — "+p.phone).join("; "):value))].join("\n");
        success.append(el("h3","Registration saved"),el("p","Reference: "+requestId));
        if(/^[1-9]\d{9,14}$/.test(recipientPhone))success.append(el("p","Open WhatsApp and press Send to notify "+recipient+"."),el("a","Send details to "+recipient+" on WhatsApp ↗",{href:"https://wa.me/"+recipientPhone+"?text="+encodeURIComponent(summary),target:"_blank",rel:"noopener",class:"btn btn-dark"}));
        else success.append(el("p","Your registration is saved. Neeraj Upadhyay’s WhatsApp contact is awaiting confirmation."));
        form.hidden=true;success.hidden=false;status.textContent="";
      }catch(error){status.textContent=error.name==="TimeoutError"?"Confirmation timed out. Retry with the same details; the same entry will not be saved twice.":error.message;}
      finally{pending=false;for(const node of form.elements)node.disabled=false;submit.disabled=!ready;}
    });
  });
})();
