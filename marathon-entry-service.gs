// Standalone Apps Script. Paste marathon-model.js ABOVE this file. Run setupMarathonRegistration as the committee account.
// Keep MARATHON_REGISTRATION_ENABLED unset until the reviewed release is approved and the end-to-end test passes.
const MARATHON_COLUMNS=['Request ID','Created at','Distance','Fee INR','Name','DOB','Email','Mobile','Flat (self-reported)','Gender','T-shirt size','Blood group','Emergency name','Emergency mobile','Guardian','Guardian consent','Medical discomfort','Medical note (private)','Payment reference (UTR)','Payment screenshot (private)','Payment verified?','BIB','Email status','Email sent at','Payload digest','Verification recorded at','Name on the BIB'];
const MARATHON_GROUP='https://chat.whatsapp.com/HhO4yXkBBb171GuQevJrmk';
function marathonProperties(){return PropertiesService.getScriptProperties();}
function marathonSender(){if(Session.getEffectiveUser().getEmail().toLowerCase()!=='saivistaculturalcommittee@gmail.com')throw Error('Committee email service is not configured.');}
function marathonJson(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
function doGet(){
  let ready=false;
  try{if(marathonProperties().getProperty('MARATHON_REGISTRATION_ENABLED')==='true'){marathonSender();marathonSheet();ready=DriveApp.getFolderById(marathonProperties().getProperty('MARATHON_PROOF_FOLDER_ID')).getSharingAccess()===DriveApp.Access.PRIVATE;}}catch(_){ready=false;}
  return marathonJson({ok:true,service:'sai-vista-marathon-2026-manual-v1',acceptingEntries:ready&&Date.now()<Date.parse(SaiVistaMarathon.event.deadline),payment:'committee-verification',deadline:SaiVistaMarathon.event.deadline});
}
function doPost(e){
  try{
    const raw=e&&e.parameter&&e.parameter.payload;
    if(!raw||raw.length>4210000)throw Error('Invalid entry request.');
    const data=JSON.parse(raw);if(data.action!=='marathon-entry')throw Error('Unknown entry action.');
    return marathonJson(marathonSaveEntry(data));
  }catch(error){console.error('Marathon entry rejected.');return marathonJson({ok:false,error:error.message});}
}
function marathonDigest(text){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function marathonSafe(value){const s=String(value==null?'':value);return /^[=+@\-\t\r\n]/.test(s)?"'"+s:s;}
function marathonSheet(){
  const id=marathonProperties().getProperty('MARATHON_SPREADSHEET_ID');if(!id)throw Error('Private registration storage is not configured.');
  const sheet=SpreadsheetApp.openById(id).getSheetByName('Marathon registrations 2026');
  if(!sheet||sheet.getLastRow()<1)throw Error('Registration sheet needs committee setup.');
  const header=sheet.getRange(1,1,1,Math.min(sheet.getMaxColumns(),MARATHON_COLUMNS.length)).getValues()[0];
  if(JSON.stringify(header)!==JSON.stringify(MARATHON_COLUMNS)&&!(header.length<=27&&!header[26]&&JSON.stringify(header.slice(0,26))===JSON.stringify(MARATHON_COLUMNS.slice(0,26))))throw Error('Registration sheet needs committee setup.');
  return sheet;
}
function marathonText(value){return String(value==null?'':value).replace(/^'/,'');}
function marathonDob(value){return value&&typeof value.getTime==='function'?Utilities.formatDate(value,'Asia/Kolkata','yyyy-MM-dd'):marathonText(value);}
function marathonRows(sheet){return sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,Math.min(sheet.getMaxColumns(),MARATHON_COLUMNS.length)).getValues():[];}
function marathonProofBytes(proof){
  const bytes=Utilities.base64Decode(proof.base64),b=bytes.map(function(n){return (n+256)%256;});
  const matches=proof.type==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:proof.type==='image/png'?b.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':b.slice(0,4).join(',')==='82,73,70,70'&&b.slice(8,12).join(',')==='87,69,66,80';
  if(!matches||bytes.length>3145728||bytes.length<16)throw Error('The payment screenshot is not a supported image.');return bytes;
}
function marathonSaveEntry(d){
  const props=marathonProperties();if(props.getProperty('MARATHON_REGISTRATION_ENABLED')!=='true')throw Error('Registration is not open yet. Please do not pay until it opens.');
  // Previously cached forms have no print-name field; preserve their ability to submit.
  if(d.bibName===undefined&&typeof d.name==='string')d.bibName=d.name.trim().slice(0,30);
  marathonSender();const issue=SaiVistaMarathon.validate(d)||SaiVistaMarathon.proofIssue(d);if(issue)throw Error(issue);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d.requestId||''))throw Error('Invalid entry reference.');
  const bytes=marathonProofBytes(d.proof),email=d.email.trim().toLowerCase();
  const payload={race:d.race,name:d.name.trim(),bibName:d.bibName.trim(),dob:d.dob,email:email,phone:d.phone,flat:d.flat||'',gender:d.gender,shirt:d.shirt,bloodGroup:d.bloodGroup,emergencyName:d.emergencyName.trim(),emergencyPhone:d.emergencyPhone,guardian:SaiVistaMarathon.age(d.dob)<18?d.guardian.trim():'',guardianConsent:SaiVistaMarathon.age(d.dob)<18,medical:d.medical,medicalDetails:d.medical==='Yes'?(d.medicalDetails||'').trim():'',paymentReference:d.paymentReference,proofDigest:marathonDigest(d.proof.base64)};
  const digest=marathonDigest(JSON.stringify(payload)),lock=LockService.getScriptLock();if(!lock.tryLock(15000))throw Error('Registrations are busy. Retry with the same details; do not pay again.');
  try{
    const sheet=marathonSheet(),rows=marathonRows(sheet),prior=rows.find(function(r){return r[0]===d.requestId;});
    if(prior){const legacyPayload=Object.assign({},payload);delete legacyPayload.bibName;if(prior[24]!==digest&&(prior[26]||prior[24]!==marathonDigest(JSON.stringify(legacyPayload))))throw Error('This reference belongs to different details. Restore the original details or contact the committee.');return {ok:true,reference:d.requestId,status:'pending-verification',groupUrl:MARATHON_GROUP};}
    if(rows.some(function(r){return marathonText(r[18])===d.paymentReference;}))throw Error('This transaction reference has already been submitted. Contact the committee; do not pay again.');
    if(rows.some(function(r){return r[6]===email&&marathonDob(r[5])===d.dob&&r[4]===marathonSafe(payload.name);}))throw Error('This participant already has an entry. Contact the committee; do not pay again.');
    if(rows.length>=1000)throw Error('Online entry capacity is reached. Contact the committee before paying.');
    const cache=CacheService.getScriptCache(),rateKey='entry-'+marathonDigest(email);if(cache.get(rateKey))throw Error('Please wait one minute before registering another participant with this email.');
    const folderId=props.getProperty('MARATHON_PROOF_FOLDER_ID');if(!folderId)throw Error('Private payment storage is not configured.');
    const folder=DriveApp.getFolderById(folderId);if(folder.getSharingAccess()!==DriveApp.Access.PRIVATE)throw Error('Private payment storage needs committee attention.');
    const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[d.proof.type];
    const file=folder.createFile(Utilities.newBlob(bytes,d.proof.type,d.requestId+'.'+extension));
    try{
      marathonUpgradeBibNameColumn(sheet);
      sheet.appendRow([d.requestId,new Date(),d.race,SaiVistaMarathon.event.fees[d.race],marathonSafe(payload.name),"'"+d.dob,email,d.phone,payload.flat,d.gender,d.shirt,d.bloodGroup,marathonSafe(payload.emergencyName),d.emergencyPhone,marathonSafe(payload.guardian),payload.guardianConsent,d.medical,marathonSafe(payload.medicalDetails),"'"+d.paymentReference,file.getUrl(),'','','','',digest,'',marathonSafe(payload.bibName)]);
      SpreadsheetApp.flush();
    }catch(error){
      // An ambiguous sheet write may have succeeded; never destroy its attached proof.
      if(!marathonRows(sheet).some(function(r){return r[0]===d.requestId;}))file.setTrashed(true);
      throw Error('Saving was interrupted. Retry with the same details; do not pay again.');
    }
    cache.put(rateKey,'1',60);return {ok:true,reference:d.requestId,status:'pending-verification',groupUrl:MARATHON_GROUP};
  }finally{lock.releaseLock();}
}
function marathonEmail(row){
  return 'Hello '+String(row[4]).replace(/^\'/,'')+',\n\nYour payment has been verified and your Sai Vista Marathon entry is confirmed.\n\nBIB: '+row[21]+'\nName on the BIB: '+marathonText(row[26]||row[4])+'\nDistance: '+row[2]+'\nPaid: ₹'+row[3]+'\nDate: Sunday, 29 November 2026\nVenue: Sai Vista Multipurpose Court\nStart and finish: Sai Vista Society\nRoute: to be shared soon\n\nEVENT SCHEDULE (IST)\n'+SaiVistaMarathon.schedule.map(function(s){return s[0]+' — '+s[1]+' | '+(row[2]==='5K'?s[2]:s[3]);}).join('\n')+'\n\nYour entry includes a T-shirt, medal, breakfast and e-certificate. Keep this email for BIB check-in.\n\nJoin the updates group: '+MARATHON_GROUP+'\nhttps://saivistaculturalcommittee.in/#marathonSchedule\n\nSai Vista Cultural Committee';
}
function marathonEmailHtml(row){
  const esc=function(value){return marathonText(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  const site='https://saivistaculturalcommittee.in/',committee='saivistaculturalcommittee@gmail.com';
  const mailto=function(subject,body){return 'mailto:'+committee+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);};
  const button=function(url,label){return '<a href="'+esc(url)+'" style="display:inline-block;margin:5px 4px;padding:13px 18px;background:#693d59;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">'+label+'</a>';};
  const acknowledge=mailto('Marathon confirmation acknowledged — BIB '+marathonText(row[21]),'Hello Sai Vista Cultural Committee,\n\nI acknowledge my confirmed entry and race-day schedule for BIB '+marathonText(row[21])+'.\n\nThank you.');
  const invite='https://wa.me/?text='+encodeURIComponent('Join me at the Sai Vista Marathon on Sunday, 29 November 2026! Reporting 5:45 AM at Sai Vista Multipurpose Court. 3 km ₹149 / 5 km ₹199. Ages 12+. Friends and relatives welcome. Register by 10 November: '+site+'#marathonInterest');
  const schedule=SaiVistaMarathon.schedule.map(function(s){return '<tr><th scope="row" style="padding:10px;border-bottom:1px solid #e5dde1;text-align:left;vertical-align:top">'+esc(s[0])+'</th><td style="padding:10px;border-bottom:1px solid #e5dde1">'+esc(s[1])+'<br><span style="color:#625b60">'+esc(row[2]==='5K'?s[2]:s[3])+'</span></td></tr>';}).join('');
  return '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f8f5f1;color:#302635;font-family:Arial,sans-serif;line-height:1.6"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e5dde1;border-radius:14px"><tr><td style="padding:24px"><p style="font-size:12px;letter-spacing:2px;color:#693d59">SAI VISTA CULTURAL COMMITTEE</p><h1 style="font-size:30px;line-height:1.2">You’re on the starting line!</h1><p>Hello '+esc(row[4])+',</p><p>Your payment has been verified. Your <strong>Sai Vista Marathon 2026 entry is confirmed.</strong> We look forward to a memorable morning together!</p><div style="padding:20px;background:#f0e9ed;border-radius:10px"><p style="margin:0">YOUR BIB NUMBER</p><strong style="font-size:42px;color:#693d59">'+esc(row[21])+'</strong><p style="margin:4px 0"><strong>Name on the BIB:</strong> '+esc(row[26]||row[4])+'<br><strong>Distance:</strong> '+esc(row[2])+' · <strong>Paid:</strong> ₹'+esc(row[3])+'</p></div><p>Keep this email for BIB check-in.</p><img src="'+site+'assets/marathon-2026-poster-v2.webp" alt="Sai Vista Marathon 2026 · 29 November · Reporting 5:45 AM" width="550" style="display:block;width:100%;height:auto;border:0;border-radius:10px"><h2 style="font-size:21px">Your race-day plan</h2><p><strong>Sunday, 29 November 2026</strong><br>Sai Vista Multipurpose Court<br>Start and finish: Sai Vista Society<br>Route: to be shared soon</p><table data-schedule="true" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px"><caption style="text-align:left;font-weight:bold;padding:8px 0">'+esc(row[2])+' schedule · all times IST</caption><thead><tr style="background:#f0e9ed"><th scope="col" style="padding:10px;text-align:left">Time</th><th scope="col" style="padding:10px;text-align:left">Activity</th></tr></thead><tbody>'+schedule+'</tbody></table><p>Your entry includes a <strong>T-shirt, medal, breakfast and e-certificate.</strong></p><div>'+button(site+'assets/sai-vista-marathon-2026.ics','Add to calendar')+button(MARATHON_GROUP,'Join WhatsApp updates ↗')+'</div><h2 style="font-size:21px">See you there?</h2><p>You can acknowledge this confirmation below. Your email app opens a reply; press <strong>Send</strong> to deliver it to the committee. Your entry is already confirmed and does not depend on this acknowledgement.</p>'+button(acknowledge,'Acknowledge confirmation')+'<h2 style="font-size:21px">Bring your people along</h2><p>Friends and relatives aged 12+ are welcome to register by 10 November.</p>'+button(invite,'Invite on WhatsApp ↗')+'<p>See you at the starting line!<br><strong>Sai Vista Cultural Committee</strong><br><a href="'+site+'">saivistaculturalcommittee.in</a></p><hr style="border:0;border-top:1px solid #e5dde1"><p style="font-size:12px;color:#625b60">Note: You have received this email with reference to your marathon registration on the saivistaculturalcommittee website.</p></td></tr></table></td></tr></table></body></html>';
}
// Installed edit trigger plus timed sweep cover single-cell edits, pasted Yes ranges and quota deferral.
function marathonPaymentEdited(e){
  if(!e||!e.range||e.range.getSheet().getName()!=='Marathon registrations 2026'||e.source.getId()!==marathonProperties().getProperty('MARATHON_SPREADSHEET_ID')||e.range.getColumn()>21||e.range.getLastColumn()<21)return;
  sendMarathonConfirmationEmails();
}
function sendMarathonConfirmationEmails(){
  if(marathonProperties().getProperty('MARATHON_REGISTRATION_ENABLED')!=='true')return;
  marathonSender();const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
  try{
    const sheet=marathonSheet(),rows=marathonRows(sheet);let quota=Math.min(MailApp.getRemainingDailyQuota(),20);
    for(let i=0;i<rows.length&&quota>0;i++){
      const row=rows[i];if(String(row[20]).trim().toLowerCase()!=='yes'||!['','QUEUED'].includes(row[22]))continue;
      if(!row[0]||!row[19]||!/^\d{12}$/.test(marathonText(row[18]))||!['3K','5K'].includes(row[2])||Number(row[3])!==SaiVistaMarathon.event.fees[row[2]]||!/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(row[6])){sheet.getRange(i+2,23).setValue('REVIEW');continue;}
      // Re-read the approval immediately before sending; a No/blank row never gets confirmation.
      if(String(sheet.getRange(i+2,21).getValues()[0][0]).trim().toLowerCase()!=='yes')continue;
      if(!row[21]){
        const base=row[2]==='3K'?3000:5000,key='MARATHON_BIB_SEQUENCE_'+row[2];
        const next=Math.max(base,Number(marathonProperties().getProperty(key)||base),...rows.map(function(r){const value=Number(r[21]);return Number.isInteger(value)&&value>base&&value<=base+999?value:base;}))+1;
        if(!Number.isInteger(next)||next>base+999){sheet.getRange(i+2,23).setValue('REVIEW');continue;}
        marathonProperties().setProperty(key,String(next));row[21]=String(next);
        sheet.getRange(i+2,22).setValue(row[21]);sheet.getRange(i+2,26).setValue(new Date());
      }
      sheet.getRange(i+2,23).setValue('SENDING');SpreadsheetApp.flush();
      try{MailApp.sendEmail({to:row[6],subject:'Sai Vista Marathon confirmed · BIB '+row[21],name:'Sai Vista Cultural Committee',body:marathonEmail(row),htmlBody:marathonEmailHtml(row)});sheet.getRange(i+2,23,1,2).setValues([['SENT',new Date()]]);SpreadsheetApp.flush();quota--;}
      catch(error){sheet.getRange(i+2,23).setValue('REVIEW');break;}
      // SENDING/REVIEW require checking Sent mail before a manual retry; never blindly resend after a crash.
    }
  }finally{lock.releaseLock();}
}
// Append only: existing approval, BIB and email columns must never move.
function marathonUpgradeBibNameColumn(sheet){
  if(JSON.stringify(sheet.getRange(1,1,1,26).getValues()[0])!==JSON.stringify(MARATHON_COLUMNS.slice(0,26)))throw Error('Registration sheet headers need committee review.');
  if(sheet.getMaxColumns()<27)sheet.insertColumnsAfter(sheet.getMaxColumns(),27-sheet.getMaxColumns());
  const header=sheet.getRange(1,1,1,MARATHON_COLUMNS.length).getValues()[0];
  if(JSON.stringify(header)===JSON.stringify(MARATHON_COLUMNS))return;
  if(header[26]!==''||JSON.stringify(header.slice(0,26))!==JSON.stringify(MARATHON_COLUMNS.slice(0,26)))throw Error('Registration sheet headers need committee review.');
  sheet.getRange(1,27).setValue(MARATHON_COLUMNS[26]);
}
function setupMarathonRegistration(){
  marathonSender();const props=marathonProperties(),lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    let id=props.getProperty('MARATHON_SPREADSHEET_ID');if(!id){id=SpreadsheetApp.create('Sai Vista Marathon 2026 — Private Registrations').getId();props.setProperty('MARATHON_SPREADSHEET_ID',id);}
    const book=SpreadsheetApp.openById(id);let sheet=book.getSheetByName('Marathon registrations 2026');if(!sheet){sheet=book.insertSheet('Marathon registrations 2026');if(sheet.getMaxColumns()<27)sheet.insertColumnsAfter(sheet.getMaxColumns(),27-sheet.getMaxColumns());sheet.appendRow(MARATHON_COLUMNS);sheet.setFrozenRows(1);}
    marathonUpgradeBibNameColumn(sheet);marathonSheet();sheet.getRange('S:S').setNumberFormat('@');sheet.getRange('U2:U1001').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Yes','No'],true).setAllowInvalid(false).build());
    sheet.getRange(1,21).setNote('Leave blank initially. Mark Yes ONLY after checking the actual bank/UPI credit, amount and unused UTR. A screenshot is not payment confirmation. Yes queues a BIB confirmation email once.');
    sheet.getRange(1,23).setNote('SENT: delivered to mail service. SENDING or REVIEW: inspect committee Sent mail before clearing this cell to retry; keep the same BIB. Do not edit saved participant data while sending.');
    if(!props.getProperty('MARATHON_PROOF_FOLDER_ID')){const folder=DriveApp.createFolder('Sai Vista Marathon 2026 — Private Payment Proofs');folder.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.VIEW);props.setProperty('MARATHON_PROOF_FOLDER_ID',folder.getId());}
    const handlers=ScriptApp.getProjectTriggers().map(function(t){return t.getHandlerFunction();});
    if(!handlers.includes('marathonPaymentEdited'))ScriptApp.newTrigger('marathonPaymentEdited').forSpreadsheet(id).onEdit().create();
    if(!handlers.includes('sendMarathonConfirmationEmails'))ScriptApp.newTrigger('sendMarathonConfirmationEmails').timeBased().everyMinutes(5).create();
    return {sheetUrl:book.getUrl(),proofFolderId:props.getProperty('MARATHON_PROOF_FOLDER_ID'),enabled:props.getProperty('MARATHON_REGISTRATION_ENABLED')==='true'};
  }finally{lock.releaseLock();}
}
