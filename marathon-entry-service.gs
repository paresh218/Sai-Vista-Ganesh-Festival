// Standalone Apps Script web app. Paste marathon-model.js ABOVE this file.
// Leave MARATHON_PAYMENTS_ENABLED unset until the payment adapter is separately implemented and tested.
// No public action creates verified payments. Only a future trusted server adapter may write their properties.
function marathonJson(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
function doGet(){return marathonJson({ok:true,service:'sai-vista-marathon-2026',acceptingEntries:false,payment:'pending-setup'});}
function doPost(e){
  try{
    const raw=e&&e.parameter&&e.parameter.payload;
    if(!raw||raw.length>8000)throw Error('Invalid entry request.');
    const data=JSON.parse(raw);
    if(data.action!=='marathon-entry')throw Error('Unknown entry action.');
    return marathonJson(marathonSaveEntry(data));
  }catch(error){console.error('Marathon entry rejected.');return marathonJson({ok:false,error:error.message});}
}
function marathonProperties(){return PropertiesService.getScriptProperties();}
function marathonSender(){
  if(Session.getEffectiveUser().getEmail().toLowerCase()!=='saivistaculturalcommittee@gmail.com')throw Error('Committee email service is not configured.');
}
function marathonDigest(text){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function marathonSheet(){
  const id=marathonProperties().getProperty('MARATHON_SPREADSHEET_ID');
  if(!id)throw Error('Private entry storage is not configured.');
  const book=SpreadsheetApp.openById(id),sheet=book.getSheetByName('Marathon entries 2026')||book.insertSheet('Marathon entries 2026');
  if(!sheet.getLastRow()){sheet.appendRow(['Request ID','BIB','Created at','Distance','Fee INR','Name','DOB','Email','Mobile','Flat (self-reported)','T-shirt size','Blood group','Emergency name','Emergency mobile','Guardian','Guardian consent','Payment reference (private)','Payload digest','Email status','Email sent at']);sheet.setFrozenRows(1);}
  return sheet;
}
function marathonSafe(value){const s=String(value||'');return /^[=+@\-\t\r\n]/.test(s)?"'"+s:s;}
function marathonSaveEntry(d){
  const props=marathonProperties();
  if(props.getProperty('MARATHON_PAYMENTS_ENABLED')!=='true')throw Error('Payment setup is pending. Registration is not open.');
  marathonSender();
  const issue=SaiVistaMarathon.validate(d);if(issue)throw Error(issue);
  if(!/^[0-9a-f-]{36}$/i.test(d.requestId||''))throw Error('Invalid entry reference.');
  if(!/^[A-Za-z0-9_-]{40,100}$/.test(d.paymentToken||''))throw Error('A server-verified payment is required.');
  const lock=LockService.getScriptLock();if(!lock.tryLock(15000))throw Error('Entries are busy. Please retry using the same reference.');
  try{
    const key='MARATHON_VERIFIED_'+marathonDigest(d.paymentToken),payment=JSON.parse(props.getProperty(key)||'null');
    const email=d.email.trim().toLowerCase(),fee=SaiVistaMarathon.event.fees[d.race];
    if(!payment||payment.status!=='PAID'||payment.email!==email||payment.race!==d.race||payment.amountPaise!==fee*100||payment.currency!=='INR'||!payment.reference||!Number.isFinite(payment.expires)||payment.expires<=Date.now()||(payment.usedBy&&payment.usedBy!==d.requestId))throw Error('Payment is not verified for this entry.');
    const payload={race:d.race,name:d.name.trim(),dob:d.dob,email:email,phone:d.phone,flat:d.flat||'',shirt:d.shirt,bloodGroup:d.bloodGroup,emergencyName:d.emergencyName.trim(),emergencyPhone:d.emergencyPhone,guardian:SaiVistaMarathon.age(d.dob)<18?d.guardian.trim():'',guardianConsent:SaiVistaMarathon.age(d.dob)<18,agreed:true};
    const digest=marathonDigest(JSON.stringify(payload)),sheet=marathonSheet(),rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,20).getValues():[];
    const prior=rows.find(function(row){return row[0]===d.requestId;});
    if(prior){if(prior[17]!==digest||prior[16]!==payment.reference)throw Error('This reference belongs to a different entry.');payment.usedBy=d.requestId;props.setProperty(key,JSON.stringify(payment));return {ok:true,bib:prior[1],emailStatus:prior[18]==='SENT'?'sent':'queued'};}
    if(rows.some(function(row){return row[7]===email&&row[6]===d.dob&&row[5]===marathonSafe(payload.name);}))throw Error('This participant already has an entry. Contact the committee for changes.');
    if(rows.some(function(row){return row[16]===payment.reference;}))throw Error('This payment has already been used.');
    const next=rows.reduce(function(max,row){const match=String(row[1]).match(/-(\d+)$/);return Math.max(max,match?Number(match[1]):0);},0)+1;
    const bib='SV26-'+d.race+'-'+String(next).padStart(4,'0');
    sheet.appendRow([d.requestId,bib,new Date(),d.race,fee,marathonSafe(payload.name),d.dob,email,d.phone,payload.flat,d.shirt,d.bloodGroup,marathonSafe(payload.emergencyName),d.emergencyPhone,marathonSafe(payload.guardian),payload.guardianConsent,payment.reference,digest,'QUEUED','']);
    SpreadsheetApp.flush();payment.usedBy=d.requestId;props.setProperty(key,JSON.stringify(payment));
    return {ok:true,bib:bib,emailStatus:'queued'};
  }finally{lock.releaseLock();}
}
// Install a time-driven trigger only after activation. Retry queue preserves the saved BIB when email fails.
function sendMarathonConfirmationEmails(){
  if(marathonProperties().getProperty('MARATHON_PAYMENTS_ENABLED')!=='true')return;
  marathonSender();const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
  try{
    const sheet=marathonSheet(),rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,20).getValues():[];
    let quota=Math.min(MailApp.getRemainingDailyQuota(),20);
    for(let i=0;i<rows.length&&quota>0;i++){
      const row=rows[i];if(row[18]!=='QUEUED')continue;
      // Do not resend an ambiguous send after a process crash; committee must reconcile SENDING rows first.
      sheet.getRange(i+2,19).setValue('SENDING');SpreadsheetApp.flush();
      try{
        MailApp.sendEmail({to:row[7],subject:'You’re registered! Sai Vista Marathon · BIB '+row[1],name:'Sai Vista Cultural Committee',body:'Hello '+String(row[5]).replace(/^\'/,'')+',\n\nYour Sai Vista Marathon entry is confirmed.\n\nBIB: '+row[1]+'\nDistance: '+row[3]+'\nPaid: ₹'+row[4]+'\nDate: Sunday, 29 November 2026\nStart: 6 AM\nVenue: Sai Vista Multipurpose Court\nStart and finish: Sai Vista Society\nRoute: to be shared soon\n\nYour entry includes a T-shirt, medal, breakfast and e-certificate. Keep this email for your BIB reference. BIB collection details will follow.\n\nhttps://saivistaculturalcommittee.in/#marathonInterest\n\nSai Vista Cultural Committee'});
        sheet.getRange(i+2,19,1,2).setValues([['SENT',new Date()]]);SpreadsheetApp.flush();quota--;
      }catch(error){sheet.getRange(i+2,19).setValue('QUEUED');break;}
    }
  }finally{lock.releaseLock();}
}
