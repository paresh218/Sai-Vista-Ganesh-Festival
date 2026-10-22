// Private gallery helpers. Deploy with protected-gallery-service.gs as the committee account.
// Folder ID and audit workbook ID belong only in Script Properties, never public JS.
const GalleryPolicy = (() => {
  const email = value => String(value || '').trim().toLowerCase();
  function validateProfile(d) {
    if (!/^[^\s@]{1,64}@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email(d.email)) || email(d.email).length > 254) throw Error('Enter a valid email address.');
    if (typeof d.name !== 'string' || !d.name.trim() || d.name.trim().length > 80 || /[\r\n\t]/.test(d.name)) throw Error('Enter your name.');
    if (!/^[A-F]-(?:[1-9]|1[0-3])0[1-4]$/.test(d.flat || '')) throw Error('Enter a valid wing and flat, such as A-101.');
    if (d.consent !== true) throw Error('Please accept the private gallery and activity-record notice.');
  }
  function watermarkSize(width, height, maxEdge = 2560) {const ratio = Math.min(1, maxEdge / Math.max(width, height)); return {width:Math.round(width * ratio),height:Math.round(height * ratio)};}
  return {email,validateProfile,watermarkSize};
})();
if (typeof module !== 'undefined') module.exports = GalleryPolicy;
function galleryProps() { return PropertiesService.getScriptProperties(); }
function galleryBook() {
  const id = galleryProps().getProperty('GALLERY_BOOK_ID');
  if (!id) throw Error('The private gallery is not connected yet.');
  return SpreadsheetApp.openById(id);
}
function gallerySheet(name) {const sheet=galleryBook().getSheetByName(name);if(!sheet)throw Error('The private gallery is not ready yet.');return sheet;}
function galleryHash(value) {return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value)).map(b=>(b&255).toString(16).padStart(2,'0')).join('');}
function gallerySecret() {const value=galleryProps().getProperty('GALLERY_SECRET');if(!value)throw Error('The private gallery is not ready yet.');return value;}
function galleryId(value) {return galleryHash(gallerySecret()+'|'+value);}
function galleryRandom() {return Utilities.getUuid()+Utilities.getUuid();}
function gallerySafe(value) {const s=String(value==null?'':value);return /^[=+@\-\t\r\n]/.test(s)?"'"+s:s;}
function galleryRows(name) {const s=gallerySheet(name);return s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,s.getLastColumn()).getValues():[];}
function galleryAudit(event, email, photo, d) {
  const device=d && d.device || {};
  gallerySheet('Gallery activity').appendRow([new Date(),event,email||'',photo||'',String(d && d.mode || '').slice(0,20),String(device.userAgent||'').slice(0,300),String(device.language||'').slice(0,30),String(device.viewport||'').slice(0,30),String(device.timezone||'').slice(0,80),String(d && d.requestId || '').slice(0,80),String(d && d.flat || '').slice(0,8)].map(v=>v instanceof Date?v:gallerySafe(v)));
}
function galleryAccess(email) {return galleryRows('Gallery access').find(row=>String(row[0]).toLowerCase()===email);}
function galleryAuthFailure(message) {const error=Error(message);error.reauthenticate=true;throw error;}
function gallerySession(d, approved=true) {
  if(typeof d.token!=='string'||d.token.length>100)galleryAuthFailure('Sign in to the gallery again.');
  const key='gallery.session.'+galleryHash(d.token),raw=galleryProps().getProperty(key);
  if(!raw)galleryAuthFailure('Sign in to the gallery again.');
  const session=JSON.parse(raw);
  if(session.expires<=Date.now()){galleryProps().deleteProperty(key);galleryAuthFailure('Your gallery session expired. Sign in again.');}
  const row=galleryAccess(session.email),status=row?String(row[3]).trim().toUpperCase():'PENDING';
  if(session.flat!==d.flat)galleryAuthFailure('Sign in to verify this flat again.');
  if(status==='REVOKED'||status==='DENIED')galleryAuthFailure('Gallery access is not approved. Please contact the committee.');
  if(approved&&status!=='APPROVED')galleryAuthFailure('Verify your email to unlock the photos.');
  return {...session,status};
}
function setupProtectedGallery() {
  const props=galleryProps();if(!props.getProperty('GALLERY_SECRET'))props.setProperty('GALLERY_SECRET',galleryRandom());
  const book=galleryBook(),definitions={
    'Gallery access':['Email','Name','Flat (self-reported)','Status','Requested at','Approved by / notes'],
    'Gallery activity':['Time (IST)','Activity','Verified email / OTP recipient','Photo reference','View mode','Browser (self-reported)','Language','Viewport','Timezone (self-reported)','Request reference','Flat (self-reported)'],
    'Gallery photos':['Photo reference','Private Drive file ID','Name','MIME type','Enabled']
  };
  for(const [name,headers] of Object.entries(definitions)){
    const sheet=book.getSheetByName(name)||book.insertSheet(name);
    if(!sheet.getLastRow()){sheet.appendRow(headers);sheet.setFrozenRows(1);sheet.getRange(1,1,1,headers.length).setFontWeight('bold');}
    if(name==='Gallery activity'&&sheet.getRange(1,1,1,headers.length-1).getValues()[0].join('|')===headers.slice(0,-1).join('|'))sheet.getRange(1,headers.length).setValue(headers[headers.length-1]);
    if(sheet.getRange(1,1,1,headers.length).getValues()[0].join('|')!==headers.join('|'))throw Error('Unexpected gallery sheet headers.');
  }
  const access=book.getSheetByName('Gallery access');
  const rule=SpreadsheetApp.newDataValidation().requireValueInList(['PENDING','APPROVED','DENIED','REVOKED'],true).setAllowInvalid(false).build();
  access.getRange(2,4,Math.max(999,access.getMaxRows()-1),1).setDataValidation(rule);

}
function indexProtectedGallery() {
  const folderId=galleryProps().getProperty('GALLERY_FOLDER_ID');if(!folderId)throw Error('Set the private source folder in Script Properties.');
  const rows=[],walk=(folder,depth)=>{
    if(depth>5)throw Error('Too many nested photo folders.');
    const files=folder.getFiles();while(files.hasNext()){
      const file=files.next(),mime=file.getMimeType();
      if(['image/jpeg','image/png','image/webp'].includes(mime)){if(rows.length>=5000)throw Error('Gallery limit reached.');rows.push([galleryId(file.getId()),file.getId(),file.getName(),mime,'YES']);}
    }
    const folders=folder.getFolders();while(folders.hasNext())walk(folders.next(),depth+1);
  };
  walk(DriveApp.getFolderById(folderId),0);rows.sort((a,b)=>a[2].localeCompare(b[2]));
  const sheet=gallerySheet('Gallery photos');if(sheet.getLastRow()>1)sheet.getRange(2,1,sheet.getLastRow()-1,5).clearContent();
  if(rows.length)sheet.getRange(2,1,rows.length,5).setValues(rows.map(row=>row.map(gallerySafe)));
  CacheService.getScriptCache().remove('gallery.photos.v1');
  console.log('Indexed '+rows.length+' photos.');
}
function galleryPhotos() {
  const cache=CacheService.getScriptCache(),saved=cache.get('gallery.photos.v1');if(saved)return JSON.parse(saved);
  const rows=galleryRows('Gallery photos').filter(r=>r[4]==='YES').map(r=>r.slice(0,2));const json=JSON.stringify(rows);if(json.length<90000)cache.put('gallery.photos.v1',json,21600);return rows;
}
function galleryPrepareOtp(d) {
  GalleryPolicy.validateProfile(d);
  if(Session.getEffectiveUser().getEmail()!=='saivistaculturalcommittee@gmail.com')throw Error('Email verification is not connected to the committee sender yet.');
  const email=GalleryPolicy.email(d.email),props=galleryProps(),lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw Error('Please try again shortly.');
  try {
    const now=Date.now(),hour=Math.floor(now/3600000),day=Math.floor(now/86400000),key='gallery.rate.'+galleryId(email);
    const rate=JSON.parse(props.getProperty(key)||'{}');
    if(rate.last&&now-rate.last<30000)throw Error('Wait 30 seconds before requesting another code.');
    if((rate.hour===hour&&rate.hourCount>=10)||(rate.day===day&&rate.dayCount>=20))throw Error('Too many code requests. Please try again later.');
    const global=JSON.parse(props.getProperty('gallery.mailBudget')||'{}');
    if(global.started&&now-global.started<86400000&&global.count>=450)throw Error('Email verification is temporarily at its daily limit. Please try again tomorrow or contact the committee.');
    props.setProperty(key,JSON.stringify({last:now,hour,hourCount:rate.hour===hour?rate.hourCount+1:1,day,dayCount:rate.day===day?rate.dayCount+1:1}));
    props.setProperty('gallery.mailBudget',JSON.stringify({started:global.started&&now-global.started<86400000?global.started:now,count:global.started&&now-global.started<86400000?global.count+1:1}));
    const code=String(parseInt(galleryHash(galleryRandom()).slice(0,8),16)%1000000).padStart(6,'0'),challenge=galleryRandom();
    const latestKey='gallery.latest.'+galleryId(email),previous=props.getProperty(latestKey);if(previous)props.deleteProperty('gallery.otp.'+previous);props.setProperty(latestKey,galleryHash(challenge));
    props.setProperty('gallery.otp.'+galleryHash(challenge),JSON.stringify({email,name:d.name.trim(),flat:d.flat,hash:galleryId(challenge+'|'+code),expires:now+600000,attempts:0}));
    return {email,code,challenge};
  } finally {lock.releaseLock();}
}
function galleryOtp(d) {
  const {email,code,challenge}=galleryPrepareOtp(d);
  galleryAudit('otp_requested',email,'',d);
  const body='Your Sai Vista Navratri 2026 gallery verification code is '+code+'.\n\nIt expires in 10 minutes. Do not share it. Enter this code in the gallery to unlock the photos. If you did not request this code, ignore this email.';
  const mime='From: Sai Vista Cultural Committee <saivistaculturalcommittee@gmail.com>\r\nTo: '+email+'\r\nSubject: Sai Vista Navratri photos - your verification code\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n'+body;
  try{const sent=Gmail.Users.Messages.send({raw:Utilities.base64EncodeWebSafe(mime,Utilities.Charset.UTF_8)},'me');if(!sent.id)throw Error('No message reference');}
  catch(error){console.error('Gallery OTP send failed.');throw Error('Email verification could not send the code. Please retry after 30 seconds. Google may have reached its sending limit.');}
  return {ok:true,challenge,retryAfter:30,message:'Check your email for a six-digit code. It expires in 10 minutes.'};
}
function galleryVerify(d) {
  if(typeof d.challenge!=='string'||d.challenge.length>100||!/^\d{6}$/.test(d.code||''))throw Error('Enter the six-digit email code.');
  const props=galleryProps(),key='gallery.otp.'+galleryHash(d.challenge),lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw Error('Please try again shortly.');
  try {
    const raw=props.getProperty(key);if(!raw)throw Error('This code expired or was already used. Request a new code.');
    const otp=JSON.parse(raw);
    if(otp.expires<=Date.now()||otp.attempts>=5){props.deleteProperty(key);throw Error('This code expired or was already used. Request a new code.');}
    otp.attempts++;props.setProperty(key,JSON.stringify(otp));
    if(otp.hash!==galleryId(d.challenge+'|'+d.code)){galleryAudit('otp_failed',otp.email,'',d);throw Error('The code is incorrect. Please check your email.');}
    props.deleteProperty(key);
    let row=galleryAccess(otp.email);
    if(row&&['DENIED','REVOKED'].includes(String(row[3]).toUpperCase()))throw Error('Gallery access is blocked. Please contact the committee.');
    if(!row){gallerySheet('Gallery access').appendRow([otp.email,gallerySafe(otp.name),otp.flat,'APPROVED',new Date(),'Automatic: email OTP verified']);}
    else if(String(row[3]).toUpperCase()!=='APPROVED'){const rows=galleryRows('Gallery access'),index=rows.findIndex(r=>String(r[0]).toLowerCase()===otp.email);gallerySheet('Gallery access').getRange(index+2,4).setValue('APPROVED');}
    const token=galleryRandom(),expires=Date.now()+90*86400000;
    props.setProperty('gallery.session.'+galleryHash(token),JSON.stringify({email:otp.email,flat:otp.flat,expires}));
    galleryAudit('email_verified',otp.email,'',d);
    return {ok:true,token,email:otp.email,expires,flat:otp.flat,status:'APPROVED'};
  } finally {lock.releaseLock();}
}
function galleryImages(rows, size) {
  const cache=CacheService.getScriptCache(),auth={Authorization:'Bearer '+ScriptApp.getOAuthToken()};
  const images=new Map(),missing=[];
  for(const row of rows){const saved=cache.get('gallery.image.'+row[0]+'.'+size);if(saved)images.set(row[0],JSON.parse(saved));else missing.push(row);}
  if(missing.length){
    const metadata=UrlFetchApp.fetchAll(missing.map(row=>({url:'https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(row[1])+'?fields=thumbnailLink',headers:auth,muteHttpExceptions:true})));
    const requests=metadata.map(response=>{
      if(response.getResponseCode()!==200)throw Error('This photo is temporarily unavailable.');
      const meta=JSON.parse(response.getContentText());
      if(typeof meta.thumbnailLink!=='string'||!/^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//i.test(meta.thumbnailLink))throw Error('This photo does not have a preview yet.');
      // shortcut: Drive's size suffix is used for display copies; fail closed if Google changes the thumbnail URL format.
      if(!/=s\d+(?:-[a-z]+)?$/i.test(meta.thumbnailLink))throw Error('The photo preview format has changed. Please contact the committee.');
      return {url:meta.thumbnailLink.replace(/=s\d+(?:-[a-z]+)?$/i,'=s'+size),headers:auth,muteHttpExceptions:true};
    });
    const responses=UrlFetchApp.fetchAll(requests);
    responses.forEach((response,i)=>{
      const blob=response.getBlob(),bytes=blob.getBytes();
      if(response.getResponseCode()!==200||!/^image\/(jpeg|png|webp)$/.test(blob.getContentType())||bytes.length>6000000)throw Error('Could not load this photo. Please try again.');
      const image={mime:blob.getContentType(),base64:Utilities.base64Encode(bytes)},row=missing[i],json=JSON.stringify(image);
      images.set(row[0],image);if(json.length<90000)cache.put('gallery.image.'+row[0]+'.'+size,json,300);
    });
  }
  return rows.map(row=>images.get(row[0]));
}
function galleryImage(row, size) {return galleryImages([row],size)[0];}
function galleryHandle(d) {
  try {
    if(d.action==='gallery-otp')return galleryOtp(d);
    if(d.action==='gallery-verify')return galleryVerify(d);
    const session=gallerySession(d,d.action!=='gallery-status'&&d.action!=='gallery-logout');
    if(d.action==='gallery-status')return {ok:true,email:session.email,status:session.status,flat:session.flat,expires:session.expires};
    if(d.action==='gallery-logout'){galleryAudit('logout',session.email,'',d);galleryProps().deleteProperty('gallery.session.'+galleryHash(d.token));return {ok:true};}
    const photos=galleryPhotos();
    if(d.action==='gallery-page'){
      if(!Number.isInteger(d.page)||d.page<0||d.page>200)throw Error('Invalid gallery page.');
      const slice=photos.slice(d.page*24,(d.page+1)*24);galleryAudit('browse_page',session.email,'',d);
      return {ok:true,email:session.email,flat:session.flat,expires:session.expires,total:photos.length,page:d.page,photos:slice.map((r,i)=>({id:r[0],number:d.page*24+i+1}))};
    }
    if(d.action==='gallery-thumbs'){
      if(!Array.isArray(d.ids)||d.ids.length<1||d.ids.length>6||d.ids.some(id=>typeof id!=='string'||!photos.some(r=>r[0]===id)))throw Error('Invalid photo selection.');
      galleryAudit('thumbnails_served',session.email,d.ids.join(','),d);
      const images=galleryImages(d.ids.map(id=>photos.find(r=>r[0]===id)),320);
      return {ok:true,images:d.ids.map((id,i)=>({id,...images[i]}))};
    }
    const row=photos.find(r=>r[0]===d.photo);if(!row)throw Error('This photo is unavailable.');
    if(d.action==='gallery-cache'){galleryAudit(d.download?'download_requested':'cached_photo_requested',session.email,row[0],d);return {ok:true};}
    if(d.action==='gallery-image'||d.action==='gallery-download'){
      galleryAudit(d.action==='gallery-download'?'download_requested':'photo_open_requested',session.email,row[0],d);
      return {ok:true,id:row[0],...galleryImage(row,d.action==='gallery-download'?2560:1600)};
    }
    if(d.action==='gallery-event'&&['photo_displayed','download_prepared','download_failed','slideshow_started','slideshow_stopped','view_mode'].includes(d.event)){
      galleryAudit(d.event,session.email,row[0],d);return {ok:true};
    }
    throw Error('Unsupported gallery action.');
  }catch(error){console.error('Gallery request failed: '+String(error.message).slice(0,200));return {ok:false,reauthenticate:error.reauthenticate===true,error:/^(Enter |Please |Wait |Too many |Email verification |Your |Gallery access |Sign in |This code |The code |This photo |Could not |The private |The photo |Invalid |Unsupported)/.test(error.message)?error.message:'The private gallery is temporarily unavailable. Please try again.'};}
}
function cleanupProtectedGallery() {
  const props=galleryProps(),all=props.getProperties(),now=Date.now();
  for(const [key,value] of Object.entries(all)){
    if(/^gallery\.(session|otp)\./.test(key)){try{if(JSON.parse(value).expires<=now)props.deleteProperty(key);}catch(_){props.deleteProperty(key);}}
    if(key.startsWith('gallery.rate.')){try{if(now-JSON.parse(value).last>86400000)props.deleteProperty(key);}catch(_){props.deleteProperty(key);}}
  }
  const sheet=gallerySheet('Gallery activity'),rows=galleryRows('Gallery activity'),cutoff=now-90*86400000;
  let old=0;for(const row of rows){if(new Date(row[0]).getTime()<cutoff)old++;else break;}
  if(old)sheet.deleteRows(2,old);
}
function installGalleryCleanup() {
  if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='cleanupProtectedGallery'))ScriptApp.newTrigger('cleanupProtectedGallery').timeBased().everyDays(1).atHour(3).create();
}
