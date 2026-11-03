// Clerk credentials stay in Script Properties. Browser identity fields are never trusted.
function residentClerkConfig() {
  const issuer=galleryProps().getProperty('CLERK_ISSUER'),secret=galleryProps().getProperty('CLERK_SECRET_KEY');
  if(!/^https:\/\/[a-z0-9.-]+$/.test(issuer||'')||!/^sk_(live|test)_/.test(secret||''))throw Error('Google sign-in is not connected yet. Please try again shortly.');
  return {issuer,secret};
}
function residentClerkApi(path,method='get') {
  const response=UrlFetchApp.fetch('https://api.clerk.com/v1/'+path,{method,headers:{Authorization:'Bearer '+residentClerkConfig().secret},muteHttpExceptions:true});
  if(response.getResponseCode()!==200)galleryAuthFailure('Google sign-in could not be checked. Please sign in again.');
  return JSON.parse(response.getContentText());
}
function residentClerkClaims(token) {
  if(typeof token!=='string'||token.length>8192||!/^[-\w]+\.[-\w]+\.[-\w]+$/.test(token))galleryAuthFailure('Invalid sign-in. Please try again.');
  try {
    const config=residentClerkConfig(),parts=token.split('.');
    const parse=value=>JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(value)).getDataAsString());
    const header=parse(parts[0]),claims=parse(parts[1]),now=Math.floor(Date.now()/1000);
    if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>100||header.crit||claims.iss!==config.issuer||!['https://saivistaculturalcommittee.in','https://www.saivistaculturalcommittee.in'].includes(claims.azp))throw Error();
    if(!Number.isFinite(claims.exp)||claims.exp<=now||!Number.isFinite(claims.nbf)||claims.nbf>now+5||!Number.isFinite(claims.iat)||claims.iat>now+5||claims.exp-claims.iat>120||claims.sts==='pending'||!/^sess_[A-Za-z0-9]+$/.test(claims.sid||'')||!/^user_[A-Za-z0-9]+$/.test(claims.sub||''))throw Error();
    const cache=CacheService.getScriptCache(),key='clerk.jwks.'+galleryHash(config.issuer),saved=cache.get(key);
    let keys=saved?JSON.parse(saved):null;
    if(!keys?.keys?.some(k=>k.kid===header.kid)) {
      const response=UrlFetchApp.fetch(config.issuer+'/.well-known/jwks.json',{muteHttpExceptions:true});
      if(response.getResponseCode()!==200)throw Error();
      keys=JSON.parse(response.getContentText());
      if(!Array.isArray(keys.keys)||keys.keys.length>20)throw Error();
      cache.put(key,JSON.stringify(keys),300);
    }
    const jwk=keys.keys.find(k=>k.kid===header.kid);
    if(!jwk||!ClerkCrypto.verify(parts[0]+'.'+parts[1],parts[2],jwk))throw Error();
    return claims;
  } catch (_) {galleryAuthFailure('Your sign-in expired or could not be verified. Please sign in again.');}
}
function residentClerkSession(session) {
  const state=residentClerkApi('sessions/'+encodeURIComponent(session.clerkSession));
  if(state.id!==session.clerkSession||state.user_id!==session.clerkUser||state.status!=='active'||!Number.isFinite(state.expire_at)||state.expire_at<=Date.now()||!Number.isFinite(state.abandon_at)||state.abandon_at<=Date.now())galleryAuthFailure('Your sign-in expired. Please sign in again.');
  return state;
}
function residentClerkLogin(d) {
  if(d.consent!==true||typeof d.flat!=='string'||(d.flat&&!/^[A-F]-(?:[1-9]|1[0-3])0[1-4]$/.test(d.flat)))throw Error('Enter your own flat, or leave it blank if you are not a resident.');
  const claims=residentClerkClaims(d.clerkToken),identity={clerkSession:claims.sid,clerkUser:claims.sub};
  const state=residentClerkSession(identity),user=residentClerkApi('users/'+encodeURIComponent(claims.sub));
  const primary=user.email_addresses?.find(email=>email.id===user.primary_email_address_id&&email.verification?.status==='verified');
  if(user.id!==claims.sub||!primary)galleryAuthFailure('Use a sign-in account with a verified email registered for your flat.');
  const email=GalleryPolicy.email(primary.email_address);
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))galleryAuthFailure('Use an account with a valid verified email.');
  // Never turn a provider session into the legacy 90-day OTP session.
  const expires=Math.min(state.expire_at,state.abandon_at,Date.now()+7*86400000),props=galleryProps(),lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw Error('Please try again shortly.');
  try {
    const name=String(user.full_name||[user.first_name,user.last_name].filter(Boolean).join(' ')||'Signed-in visitor').replace(/[\r\n\t]/g,' ').slice(0,80);
    const profile=galleryAccess(email),savedFlat=String(profile?.[2]||'').trim().toUpperCase();
    const flat=/^[A-F]-(?:[1-9]|1[0-3])0[1-4]$/.test(savedFlat)?savedFlat:d.flat;
    if(!profile&&!flat&&d.publicVisitor!==true)return {ok:true,provider:'clerk',email,needsFlat:true};
    residentClerkContact(email,name,flat);
    const verified=!!flat&&residentClerkResident(email,flat,true);
    if(flat&&!verified)residentReviewRequest(email,name,flat);
    const token=galleryRandom(),session={...identity,provider:'clerk',email,flat,expires,residentVerified:verified};
    if(verified)residentContactActivity(session,new Date(),true);
    galleryAudit('social_email_verified',email,'',{...d,clerkToken:undefined},true);
    props.setProperty('gallery.session.'+galleryHash(token),JSON.stringify(session));
    return {ok:true,token,email,flat,expires,status:verified?'APPROVED':'PUBLIC',authenticated:true,residentVerified:verified,reviewPending:!!flat&&!verified,provider:'clerk'};
  } finally {lock.releaseLock();}
}
function residentClerkContact(email,name,flat) {
  const profile=galleryAccess(email);
  if(!profile)gallerySheet('Gallery access').appendRow([gallerySafe(email),gallerySafe(name),flat,'PENDING',new Date(),'Social sign-in; resident access requires directory match or committee approval.']);
  else if(flat&&!profile[2]){const index=galleryRows('Gallery access').findIndex(row=>GalleryPolicy.email(row[0])===email);if(index>=0)gallerySheet('Gallery access').getRange(index+2,3,1,1).setValues([[flat]]);}
}
function residentReviewSheet(create=false) {
  const book=galleryBook();let sheet=book.getSheetByName('Resident requests');
  if(!sheet&&create){sheet=book.insertSheet('Resident requests');sheet.appendRow(['Request reference','Verified email','Name','Requested flat','Status','Requested at (IST)','Notification sent at (IST)','Review notes']);sheet.setFrozenRows(1);sheet.getRange(2,5,Math.max(1,sheet.getMaxRows()-1),1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['PENDING','APPROVED','DENIED'],true).setAllowInvalid(false).build());}
  if(sheet&&sheet.getRange(1,1,1,5).getValues()[0].join('|')!=='Request reference|Verified email|Name|Requested flat|Status')throw Error('Please contact the committee to check the resident review sheet.');
  return sheet;
}
function residentClerkResident(email,flat,locked=false) {
  const profile=galleryAccess(email);
  if(!profile||['DENIED','REVOKED'].includes(String(profile[3]).trim().toUpperCase())||String(profile[6]||'').trim().toUpperCase()==='REVOKED')return false;
  try{residentDirectory(email,flat);return true;}catch(_){/* Unmatched accounts keep public access while reviewed. */}
  const sheet=residentReviewSheet(),rows=sheet&&sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,8).getValues():[];
  const matching=rows.filter(row=>GalleryPolicy.email(row[1])===email),latest=matching[matching.length-1];
  if(!latest||latest[3]!==flat||String(latest[4]).trim().toUpperCase()!=='APPROVED')return false;
  // A private sheet approval is the authority for a new email or family name, never a browser flag.
  const access=gallerySheet('Gallery access'),profiles=galleryRows('Gallery access'),index=profiles.findIndex(row=>GalleryPolicy.email(row[0])===email);
  if(index<0)return false;
  const before=profiles[index];
  if(before[2]!==flat||before[3]!=='APPROVED'||before[6]!=='APPROVED'){
    const lock=locked?null:LockService.getScriptLock();if(lock&&!lock.tryLock(10000))return false;
    try{access.getRange(index+2,3,1,2).setValues([[flat,'APPROVED']]);access.getRange(index+2,6,1,2).setValues([[gallerySafe('Committee approved resident request '+latest[0]),'APPROVED']]);}finally{lock?.releaseLock();}
  }
  try{residentDirectory(email,flat);return true;}catch(_){return false;}
}
function residentReviewRequest(email,name,flat) {
  const sheet=residentReviewSheet(true),rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,8).getValues():[];
  let index=rows.findIndex(row=>GalleryPolicy.email(row[1])===email&&row[3]===flat);
  if(index<0){sheet.appendRow([Utilities.getUuid(),gallerySafe(email),gallerySafe(name),flat,'PENDING',Utilities.formatDate(new Date(),'Asia/Kolkata','yyyy-MM-dd HH:mm:ss'),'','']);index=rows.length;}
  else if(rows[index][6]||String(rows[index][4]).toUpperCase()==='DENIED')return;
  const now=Date.now(),day=Math.floor(now/86400000),props=galleryProps(),budget=JSON.parse(props.getProperty('resident.reviewMailBudget')||'{}');
  if(budget.day===day&&budget.count>=50)return;
  props.setProperty('resident.reviewMailBudget',JSON.stringify({day,count:budget.day===day?budget.count+1:1}));
  const review='https://docs.google.com/spreadsheets/d/'+galleryBook().getId()+'/edit#gid='+sheet.getSheetId()+'&range=A'+(index+2)+':H'+(index+2);
  const body='A signed-in user requested Sai Vista resident access.\n\nVerified email: '+email+'\nName: '+name+'\nRequested flat: '+flat+'\n\nValidate the resident before granting private accounts, member payments, photo gallery and downloads. Review the request here:\n'+review+'\n\nSet Status to APPROVED only after checking the person and flat. Set DENIED if the request is not valid. The user has public access while waiting. No resident access has been granted by this email.';
  const mime='To: paresh218@gmail.com\r\nSubject: Sai Vista resident access review - '+flat+'\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n'+body;
  try{const sent=Gmail.Users.Messages.send({raw:Utilities.base64EncodeWebSafe(mime,Utilities.Charset.UTF_8)},'me');if(sent.id)sheet.getRange(index+2,7,1,1).setValues([[Utilities.formatDate(new Date(),'Asia/Kolkata','yyyy-MM-dd HH:mm:ss')]]);}catch(_){console.error('Resident review notification is pending; the request remains in the private review sheet.');}
}
