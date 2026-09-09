// Paste this ENTIRE file into a new Apps Script project.
/* Shared validation: also included in the paste-ready Apps Script. */
const FestivalRegistration = (() => {
  const gift = "Children receive only ONE participation gift across all competitions, regardless of the number of entries.";
  const judging = "Judging is confidential. The judges’ decision is final and binding. Please do not approach Event SPOCs or the Cultural Team about judging or results; they are not involved in judging.";
  const events = {
    bollywood: {title:"Bollywood Night", date:"18 September 2026", sheet:"Bollywood Night", rules:["One entry per wing (A–F), with 5–6 players. Provide each player’s first name, last name and phone number."]},
    drawing: {title:"Drawing & Colouring", date:"19 September 2026", sheet:"Drawing", rules:["Ages 3–6: Colouring; 7–12: Drawing & Colouring; oldest group: awaiting confirmation (13–16 or 13–18).", "Drawing sheets are provided. Bring your own colours, pencils, erasers and only necessary stationery.", "One winner per age group.", gift, judging]},
    talent: {title:"Talent Show", date:"19 & 21 September 2026", sheet:"Talent Show", rules:["Each participant may enter at most once for solo and once for group: maximum two performances. Each group member must register individually using the same group name.", "Solo: maximum 2 minutes. Group: maximum 4 minutes. Dance, singing, act, mime, instrumental and other suitable performances are welcome.", "Performance day and sequence are allotted by draw. No changes after allotment; be ready for your turn.", "Submit actual audio files by 15 September 2026 using the designated music link. YouTube and other song/video links are not accepted. File name: Participant Name_Song Name (example: Priyanka_Meri_Moti_Veerana).", "Select respectful songs and acts suitable for the Ganpati festival. Gifts are distributed on the last Talent Show day (21 September).", gift]},
    treasure: {title:"Treasure Hunt", date:"20 September 2026", sheet:"Treasure Hunt", rules:["Last year’s team format and rules are awaiting committee confirmation. Register your interest; the coordinator will share the details.",gift]},
    rangoli: {title:"Rangoli Competition", date:"20 September 2026", sheet:"Rangoli", rules:["Venue: Clubhouse. Start time: to be announced. Duration: 1.5 hours. Theme: Ganpati Bappa Morya.", "Create the entire design at the venue within the allotted time. Bring all materials.", "Judging: concept and theme, originality and design, colour harmony, finishing and overall presentation. One winner; participation gifts apply subject to the children’s shared gift policy.", gift, judging]},
    thali: {title:"Pooja Thali Decoration", date:"20 September 2026", sheet:"Pooja Thali", rules:["Theme: Eco-Friendly Green. Use natural, biodegradable materials available at home; reuse creatively. Avoid plastic, thermocol and non-biodegradable materials.", "Decorate at home and bring the completed thali to the Clubhouse by 6:00 PM, ready for display.", "Three prizes: first, second and third. Participation gifts apply subject to the children’s shared gift policy.",gift,judging]},
    funfair: {title:"Fun n Fair", date:"20 September 2026", sheet:"Fun n Fair", rules:["₹500 per entry/table. No refund. This form records a table request; pay Neeraj Upadhyay using UPI ID neeraj18upadhyay1@ybl or the supplied QR. Submission is not proof of payment."]},
    fancy: {title:"Fancy Dress", date:"22 September 2026", sheet:"Fancy Dress", rules:["Maximum performance: 1 minute. Share your child’s costume/character in advance for the introduction.", "Report 10 minutes before the event. Sequence by draw; no changes. Parents must ensure children are ready when called.", "No entries after the registration deadline. The committee will announce the deadline.",gift]},
    cooking: {title:"No Stove Cooking", date:"23 September 2026", sheet:"No Stove Cooking", rules:["Adults aged 18+ only. One participant per team. Prizes worth ₹10,000.", "Purely vegetarian dishes. No stove, fire, preservatives or food colours. Bring all ingredients, equipment and water; only a working table is provided.", "Do not bring cut, chopped or grated raw materials. Prepare them on the spot. Non-electric mixers, choppers, juicers and graters are allowed.", "Use hygienic ingredients approved in advance. Judging: taste, presentation, originality, creativity and hygiene. Give your dish a creative name.", "Maintain respect and good sportsmanship. The final cooking duration and ingredient approval process will be confirmed by the committee."]},
    pooja: {title:"Satyanarayan Pooja", date:"24 September 2026", sheet:"Satyanarayan Pooja", rules:["Register your household for Satyanarayan Pooja. Further arrangements will be shared by the coordinator."]},
    prasad: {title:"Mahaprasad Count", date:"24 September 2026 · 7–10 PM", sheet:"Mahaprasad", rules:["Enter the number of adults and children attending from your household. Submit once per household so the catering count stays accurate."]}
  };
  const text = value => String(value ?? "").trim();
  const phone = value => text(value).replace(/[\s()+-]/g, "").replace(/^(?:0091|91)(?=\d{10}$)/, "");
  const identity = d => [d.firstName,d.lastName,d.wing,d.flatNo].map(v=>text(v).toLowerCase().replace(/\s+/g," ")).join("|");
  const integer = (v,min,max) => /^\d+$/.test(text(v)) && Number(v)>=min && Number(v)<=max;
  function validate(d, config={}) {
    if (!events[d.event]) return "Choose a valid event.";
    if (!/^[a-f0-9-]{36}$/i.test(text(d.requestId))) return "Invalid registration reference. Reopen the form.";
    for (const key of (d.event === "prasad" ? [] : ["firstName","lastName"])) if (!/^[\p{L}\p{M}][\p{L}\p{M} .’'-]{0,79}$/u.test(text(d[key]))) return "Enter a valid first and last name.";
    if (!/^[A-F]$/.test(d.wing) || !/^(?:[1-9]|1[0-3])0[1-4]$/.test(d.flatNo)) return "Select a valid wing and flat number.";
    if (d.event !== "prasad" && !/^[6-9]\d{9}$/.test(phone(d.phone))) return "Enter a valid Indian mobile number.";
    if (d.agreed !== true) return "Please read and accept the event details.";
    if (JSON.stringify(d).length>18000) return "Entry is too long.";
    if (["drawing","talent","treasure","rangoli","thali","fancy"].includes(d.event) && !integer(d.age,1,120)) return "Enter the participant’s age in completed years.";
    if (d.event === "drawing") {
      if (![16,18].includes(Number(config.drawingMaxAge))) return "Drawing registration awaits confirmation of the oldest age group.";
      if (!integer(d.age,3,Number(config.drawingMaxAge))) return "Age is outside the drawing competition groups.";
    }
    if (d.event === "fancy" && !integer(d.age,1,17)) return "Fancy Dress is for children under 18.";
    if (d.event === "bollywood") {
      if (!Array.isArray(d.players) || d.players.length<5 || d.players.length>6) return "Provide 5–6 players.";
      const first=d.players[0];
      if(text(first.firstName)!==text(d.firstName)||text(first.lastName)!==text(d.lastName)||phone(first.phone)!==phone(d.phone)) return "Player 1 must match the wing contact details.";
      const names = new Set();
      for (const p of d.players) {
        if (![p.firstName,p.lastName].every(n=>/^[\p{L}\p{M}][\p{L}\p{M} .’'-]{0,79}$/u.test(text(n))) || !/^[6-9]\d{9}$/.test(phone(p.phone))) return "Enter each player’s first name, last name and valid phone.";
        const key = (text(p.firstName)+" "+text(p.lastName)).toLowerCase();
        if (names.has(key)) return "Each Bollywood player must be listed only once.";
        names.add(key);
      }
    }
    const required = {talent:["performanceType","actType","performanceTitle"],treasure:["teamName"],funfair:["stallName","stallDetails"],fancy:["costume"]}[d.event] || [];
    for (const key of required) if (!text(d[key]) || text(d[key]).length>1000) return "Complete all event details (maximum 1,000 characters each).";
    if (d.event === "talent") {
      if (!["Solo","Group"].includes(d.performanceType)) return "Choose solo or group.";
      if (!integer(d.durationSeconds,1,d.performanceType==="Solo"?120:240)) return "Solo must be at most 120 seconds; group at most 240 seconds.";
      if (d.performanceType==="Group" && (!text(d.groupName) || text(d.groupName).length>100)) return "Enter your group name (up to 100 characters).";
    }
    if (d.event === "prasad" && (!integer(d.adults,0,100) || !integer(d.children,0,100) || Number(d.adults)+Number(d.children)<1)) return "Enter valid adult and child counts, with at least one attendee.";
    return "";
  }
  const collectionUrl = "https://script.google.com/macros/s/AKfycbyYbNoSxhBIT2sSVfMSFY06YXAWGN99E_HunGAA2UMLA8vlJMn-_qdGCiQ1a8s6PsW3/exec?action=payments";
  function culturalFundStatus(payload, wing, flat) {
    if(payload?.status!=="success" || !Array.isArray(payload.payments)) return {paid:false,message:"We could not verify the cultural fund payment right now. Please try again shortly."};
    const rows=payload.payments.filter(row=>text(row.wing).toUpperCase()===wing && text(row.flat)===flat);
    if(rows.length!==1)return {paid:false,message:"We could not confirm your household’s payment record. Please contact the cultural committee or try again after the collection sheet is updated."};
    if(text(rows[0].paid).toLowerCase()!=="yes")return {paid:false,message:"Please pay the cultural fund first to register your Fun n Fair stall. Thank you for supporting our festival! If you have already paid, please ask the committee to update the collection sheet, then try again."};
    return {paid:true,message:"Cultural fund payment verified. You can now complete your stall registration. The separate ₹500 table fee still applies."};
  }
  return {events,gift,text,phone,identity,validate,collectionUrl,culturalFundStatus};
})();
if (typeof module !== "undefined") module.exports = FestivalRegistration;

// SETTINGS: use a NEW Apps Script project for event registrations.
// Set SPREADSHEET_ID in Project Settings > Script Properties.
// Optional: DRAWING_MAX_AGE (16 or 18; default 18), TALENT_MUSIC_URL (https URL).
// Required to open Fancy Dress: FANCY_DRESS_DEADLINE (ISO timestamp with +05:30).
const EVENT_COLUMNS = ["Saved at", "Registration ID", "Participant key", "First name", "Last name", "Wing", "Flat", "Phone", "Age", "Event", "Details JSON", "Guidelines accepted", "Gift policy", "Performance category", "Group name", "Adults", "Children", "Tables", "Fee INR", "Payment status", "Drawing category", "Act type", "Performance title", "Duration seconds", "Treasure Hunt team / interest", "Stall name", "Stall details", "Costume / introduction", "Dish name", "Ingredients", ...Array.from({length:6},(_,i)=>["Player "+(i+1)+" first name","Player "+(i+1)+" last name","Player "+(i+1)+" phone"]).flat()];
function eventJson(value) {return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
function eventSettings() {
  const p=PropertiesService.getScriptProperties();
  return {drawingMaxAge:Number(p.getProperty("DRAWING_MAX_AGE")||18), musicUrl:p.getProperty("TALENT_MUSIC_URL")||"", fancyDeadline:p.getProperty("FANCY_DRESS_DEADLINE")||""};
}
function eventBook() {
  const id=PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if(!id)throw Error("The committee has not connected the registration spreadsheet yet.");
  return SpreadsheetApp.openById(id);
}
function eventSheet(book,name) {
  const sheet=book.getSheetByName(name)||book.insertSheet(name);
  if(sheet.getLastRow()===0){sheet.appendRow(EVENT_COLUMNS);sheet.setFrozenRows(1);sheet.getRange(1,1,1,EVENT_COLUMNS.length).setFontWeight("bold");}
  const headers=sheet.getRange(1,1,1,EVENT_COLUMNS.length).getValues()[0];
  if(headers.join("|")!==EVENT_COLUMNS.join("|"))throw Error("Registration tab headers have changed. Please contact the committee.");
  return sheet;
}
function setupEventRegistration() {
  const book=eventBook();
  Object.values(FestivalRegistration.events).forEach(event=>eventSheet(book,event.sheet));
  const gift=book.getSheetByName("Children Gifts")||book.insertSheet("Children Gifts");
  if(!gift.getLastRow()){gift.appendRow(["Participant key","First name","Last name","Wing","Flat","Events","Gift issued?","Issued on / notes"]);gift.setFrozenRows(1);}
}
function doGet() {
  try {eventBook();return eventJson({status:"success",service:"sai-vista-events-v1",config:eventSettings()});}
  catch(error){return eventJson({status:"error",message:error.message});}
}
function cellSafe(value) {const s=String(value??"");return /^[=+@\-\t\r\n]/.test(s)?"'"+s:s;}
function verifyCulturalFund(wing,flat) {
  try {
    const response=UrlFetchApp.fetch(FestivalRegistration.collectionUrl, {muteHttpExceptions:true,headers:{"Cache-Control":"no-cache"}});
    if(response.getResponseCode()!==200)throw Error("Collection unavailable");
    return FestivalRegistration.culturalFundStatus(JSON.parse(response.getContentText()),wing,flat);
  }catch(_){return {paid:false,message:"We could not verify the cultural fund payment right now. Please try again shortly."};}
}
function doPost(e) {
  let lock;
  try {
    const raw=e && e.parameter && e.parameter.payload;
    if(!raw||raw.length>20000)throw Error("Invalid registration payload.");
    const d=JSON.parse(raw), config=eventSettings();
    const error=FestivalRegistration.validate(d,config);if(error)throw Error(error);
    lock=LockService.getScriptLock();if(!lock.tryLock(15000))throw Error("Registrations are busy. Please retry shortly.");
    const book=eventBook(), definition=FestivalRegistration.events[d.event];
    const sheet=eventSheet(book,definition.sheet);
    const rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,EVENT_COLUMNS.length).getValues():[];
    const previous=rows.find(row=>row[1]===d.requestId);
    if(previous) {
      if(previous[10]!==JSON.stringify(d))throw Error("This reference was already saved with different details. Reopen the form for a new entry.");
      return eventJson({status:"success",registrationId:d.requestId});
    }
    if(d.event==="funfair") {const fund=verifyCulturalFund(d.wing,d.flatNo);if(!fund.paid)throw Error(fund.message);}
    if(d.event==="fancy") {
      if(!config.fancyDeadline || !Number.isFinite(Date.parse(config.fancyDeadline)))throw Error("Fancy Dress registration awaits the committee’s deadline.");
      if(Date.now()>=Date.parse(config.fancyDeadline))throw Error("Fancy Dress registration is closed.");
    }
    const key=FestivalRegistration.identity(d);
    if(d.event==="bollywood" && rows.some(row=>row[5]===d.wing))throw Error("This wing already has a Bollywood Night entry. Contact Priyank to update it.");
    if(["prasad","pooja"].includes(d.event)&&rows.some(row=>String(row[5])===d.wing&&String(row[6])===d.flatNo))throw Error("This household is already registered. Contact Priyank to update its entry.");
    if(rows.some(row=>row[2]===key&&(d.event!=="talent"||row[13]===d.performanceType)))throw Error(d.event==="talent"?"This participant already has an entry in this performance category. Only one solo and one group are allowed.":"This participant is already registered. Contact Priyank to update the entry.");
    const age=Number(d.age);
    const category=d.event==="drawing"?(age<=6?"3–6: Colouring":age<=12?"7–12: Drawing & Colouring":"13–"+config.drawingMaxAge+": Drawing & Colouring"):"";
    const values=[new Date(),d.requestId,key,FestivalRegistration.text(d.firstName),FestivalRegistration.text(d.lastName),d.wing,d.flatNo,FestivalRegistration.phone(d.phone),d.age||"",definition.title,JSON.stringify(d),"Yes",FestivalRegistration.gift,d.performanceType||"",d.groupName||"",d.adults||"",d.children||"",d.event==="funfair"?1:"",d.event==="funfair"?500:"",d.event==="funfair"?"Not verified":"",category,d.actType||"",d.performanceTitle||"",d.durationSeconds||"",d.teamName||"",d.stallName||"",d.stallDetails||"",d.costume||"",d.dishName||"",d.ingredients||"",...Array.from({length:6},(_,i)=>{const p=(d.players||[])[i]||{};return [p.firstName||"",p.lastName||"",p.phone?FestivalRegistration.phone(p.phone):""];}).flat()];
    // One locked row append is the authoritative save. Retry checks the same ID.
    sheet.appendRow(values.map(value=>value instanceof Date||typeof value==="number"?value:cellSafe(value)));
    SpreadsheetApp.flush();
    return eventJson({status:"success",registrationId:d.requestId});
  }catch(error){return eventJson({status:"error",message:error.message||"Unable to save. Please retry."});}
  finally{if(lock&&lock.hasLock())lock.releaseLock();}
}
// Run before gift distribution. Keeps existing gift-issued flags and notes.
// Names + wing + flat identify a child; coordinators should reconcile spelling variants.
function refreshChildrenGifts() {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    setupEventRegistration();const book=eventBook(), children=new Map();
    for(const id of ["drawing","talent","treasure","rangoli","thali","fancy"]) {
      const sheet=book.getSheetByName(FestivalRegistration.events[id].sheet);
      if(sheet.getLastRow()<2)continue;
      for(const row of sheet.getRange(2,1,sheet.getLastRow()-1,EVENT_COLUMNS.length).getValues()) {
        if(Number(row[8])<1||Number(row[8])>=18)continue;
        if(!children.has(row[2]))children.set(row[2],{row:[row[2],row[3],row[4],row[5],row[6]],events:new Set()});
        children.get(row[2]).events.add(row[9]);
      }
    }
    const gifts=book.getSheetByName("Children Gifts");
    const existing=gifts.getLastRow()>1?gifts.getRange(2,1,gifts.getLastRow()-1,8).getValues():[];
    for(const [key,child] of children) {
      const index=existing.findIndex(row=>row[0]===key);
      if(index>=0)gifts.getRange(index+2,6).setValue(cellSafe([...child.events].join(", ")));
      else gifts.appendRow([...child.row, [...child.events].join(", "),"No", ""].map(cellSafe));
    }
  }finally{lock.releaseLock();}
}
