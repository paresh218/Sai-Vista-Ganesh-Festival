// Shared with the resident/gallery service; never exposed as a public read endpoint.
function setupResidentContactColumns() {
  const sheet=gallerySheet('Gallery access');
  const headers=['Resident approval','First resident verification (IST)','Last resident activity (IST)','Resident verification'];
  const existing=sheet.getRange(1,7,1,4).getValues()[0];
  if(existing.some((value,i)=>value&&value!==headers[i]))throw Error('Please contact the committee to check resident email columns.');
  sheet.getRange(1,7,1,4).setValues([headers]);
}
function residentContactActivity(session,now,verified=false) {
  const sheet=gallerySheet('Gallery access'),rows=galleryRows('Gallery access');
  const index=rows.findIndex(row=>GalleryPolicy.email(row[0])===session.email);
  if(index<0)throw Error('Sign in to verify your resident email again.');
  setupResidentContactColumns();
  const headers=['First resident verification (IST)','Last resident activity (IST)','Resident verification'];
  const existing=sheet.getRange(1,8,1,3).getValues()[0];
  if(existing.some((value,i)=>value&&value!==headers[i]))throw Error('Please contact the committee to check resident email columns.');
  sheet.getRange(1,8,1,3).setValues([headers]);
  const previous=sheet.getRange(index+2,8,1,3).getValues()[0],stamp=Utilities.formatDate(now,'Asia/Kolkata','yyyy-MM-dd HH:mm:ss');
  sheet.getRange(index+2,8,1,3).setValues([[previous[0]||(verified?stamp:''),stamp,'VERIFIED RESIDENT']]);
}
function residentSiteEvents(session,d) {
  if(session.residentVerified!==true&&session.provider!=='clerk')galleryAuthFailure('Sign in to verify your resident email again.');
  if(!/^[a-f0-9-]{36}$/i.test(d.sessionId||'')||!Array.isArray(d.events)||!d.events.length||d.events.length>20)throw Error('Invalid visit events.');
  if(!/^[A-Za-z0-9._-]{1,100}$/.test(d.release||''))throw Error('Invalid site release.');
  const now=new Date(),date=Utilities.formatDate(now,'Asia/Kolkata','yyyy-MM-dd'),time=Utilities.formatDate(now,'Asia/Kolkata','HH:mm:ss');
  const device=d.device||{};
  const clean=(value,max=500)=>gallerySafe(String(value||'').slice(0,max));
  const profile=galleryAccess(session.email);
  const events=d.events.map(event=>{
    const clientTime=Date.parse(event.clientTime);
    if(!/^[a-f0-9-]{36}$/i.test(event.id||'')||!['entry','section','action','navigation'].includes(event.type)||!/^[A-Za-z][A-Za-z0-9-]{0,79}$/.test(event.target||'')||!Number.isFinite(clientTime)||Math.abs(now.getTime()-clientTime)>86400000)throw Error('Invalid visit event.');
    return [event.id,date,time,clean(session.flat,8),event.type,event.target,new Date(clientTime).toISOString(),d.sessionId,clean(device.userAgent),clean(device.language,30),clean(device.viewport,30),clean(device.timezone,80),'Not collected',clean(session.email,254),clean(profile[1],80),session.residentVerified?'VERIFIED RESIDENT':session.flat?'RESIDENT REVIEW PENDING':'VERIFIED SIGN-IN (NON-RESIDENT)',d.release];
  });
  const bookId=galleryProps().getProperty('SITE_VISIT_BOOK_ID');
  if(!bookId)throw Error('Please contact the committee to connect verified visit logs.');
  const lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw Error('Please try again shortly.');
  try {
    const book=SpreadsheetApp.openById(bookId);let sheet=book.getSheetByName(date);
    const headers=['Event ID','Date (India)','Received time (India)','Entered flat (unverified)','Event','Section / control','Event time (client UTC)','Visit ID','Browser / device user agent','Language','Viewport','Device timezone','IP address','Verified email','Resident name','Identity status','Site release'];
    if(!sheet){sheet=book.insertSheet(date);sheet.getRange(1,1,1,17).setValues([headers]);sheet.setFrozenRows(1);}
    else {const tail=sheet.getRange(1,14,1,4).getValues()[0];if(tail.some((value,i)=>value&&value!==headers[i+13]))throw Error('Please contact the committee to check visit log columns.');sheet.getRange(1,14,1,4).setValues([headers.slice(13)]);}
    sheet.getRange(1,4,1,1).setValues([['Flat (see identity status)']]);
    const last=sheet.getLastRow(),start=Math.max(2,last-4999);
    // shortcut: retries deduplicate against 5,000 recent rows in the receive-day tab; use a durable event index for larger daily volumes.
    const seen=new Set(last>=2?sheet.getRange(start,1,last-start+1,1).getValues().map(row=>row[0]):[]);
    const rows=events.filter(row=>{if(seen.has(row[0]))return false;seen.add(row[0]);return true;});
    const required=last+rows.length;if(required>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),Math.max(100,required-sheet.getMaxRows()));
    if(rows.length)sheet.getRange(last+1,1,rows.length,17).setValues(rows);
    if(session.residentVerified===true)residentContactActivity(session,now);
    return {ok:true,acknowledgedIds:events.map(row=>row[0]),saved:rows.length};
  } finally {lock.releaseLock();}
}
