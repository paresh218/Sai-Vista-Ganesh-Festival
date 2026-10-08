// Separate Apps Script project, owned by the committee. Never add to the public photo folder.
function logJson(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function setupVisitLogs() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('VISIT_SHEET_ID')) {
    const sheet = SpreadsheetApp.create('Sai Vista — Private visit logs');
    props.setProperty('VISIT_SHEET_ID', sheet.getId());
    console.log('Private spreadsheet: ' + sheet.getUrl());
  }
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'purgeOldVisitLogs')) ScriptApp.newTrigger('purgeOldVisitLogs').timeBased().everyDays(1).create();
}
function doGet() { return logJson({ ok: true, service: 'Sai Vista visit logger', version: 1 }); }
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!e?.postData || e.postData.contents.length > 16000) throw Error('Invalid request size.');
    const data = JSON.parse(e.postData.contents);
    if (!/^[A-F]-(?:[1-9]|1[0-3])0[1-4]$/.test(data.flat) || !/^[a-f0-9-]{36}$/i.test(data.sessionId || '')) throw Error('Invalid flat or session.');
    if (!Array.isArray(data.events) || !data.events.length || data.events.length > 20) throw Error('Invalid events.');
    const props = PropertiesService.getScriptProperties();
    const secret = props.getProperty('LOG_INGRESS_SECRET');
    if (secret && data.ingressSecret !== secret) throw Error('Invalid collector.');
    // An IP is trusted only when supplied by the secret-authenticated Worker.
    const ip = secret && /^[0-9a-f:.]{3,45}$/i.test(data.trustedIp || '') ? data.trustedIp : 'Not collected';
    const safe = value => { const text = String(value || '').slice(0, 500); return /^[=+@\-\t\r]/.test(text) ? "'" + text : text; };
    const received = new Date(), date = Utilities.formatDate(received, 'Asia/Kolkata', 'yyyy-MM-dd');
    const time = Utilities.formatDate(received, 'Asia/Kolkata', 'HH:mm:ss');
    const events = data.events.map(event => {
      if (!/^[a-f0-9-]{36}$/i.test(event.id || '') || !['entry','section','action','navigation'].includes(event.type) || !/^[A-Za-z][A-Za-z0-9-]{0,79}$/.test(event.target || '')) throw Error('Invalid event.');
      const clientTime = Date.parse(event.clientTime);
      if (!Number.isFinite(clientTime) || Math.abs(received.getTime() - clientTime) > 86400000) throw Error('Invalid event time.');
      return [event.id, date, time, safe(data.flat), event.type, event.target, new Date(clientTime).toISOString(), data.sessionId, safe(data.device?.userAgent), safe(data.device?.language), safe(data.device?.viewport), safe(data.device?.timezone), ip];
    });
    lock.waitLock(10000);
    const book = SpreadsheetApp.openById(props.getProperty('VISIT_SHEET_ID'));
    let sheet = book.getSheetByName(date);
    if (!sheet) { sheet = book.insertSheet(date); sheet.appendRow(['Event ID','Date (India)','Received time (India)','Entered flat (unverified)','Event','Section / control','Event time (client UTC)','Visit ID','Browser / device user agent','Language','Viewport','Device timezone','IP address']); sheet.setFrozenRows(1); }
    const last = sheet.getLastRow(), start = Math.max(2, last - 4999);
    const seen = new Set(last >= 2 ? sheet.getRange(start, 1, last - start + 1, 1).getValues().map(row => row[0]) : []);
    const rows = events.filter(row => { if (seen.has(row[0])) return false; seen.add(row[0]); return true; });
    if (rows.length) sheet.getRange(last + 1, 1, rows.length, 13).setValues(rows);
    return logJson({ ok: true });
  } catch (_) { return logJson({ ok: false, error: 'Visit log could not be saved.' }); }
  finally { if (lock.hasLock()) lock.releaseLock(); }
}
function purgeOldVisitLogs() {
  const book = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('VISIT_SHEET_ID'));
  const cutoff = Utilities.formatDate(new Date(Date.now() - 90 * 86400000), 'Asia/Kolkata', 'yyyy-MM-dd');
  for (const sheet of book.getSheets()) if (/^\d{4}-\d{2}-\d{2}$/.test(sheet.getName()) && sheet.getName() < cutoff && book.getSheets().length > 1) book.deleteSheet(sheet);
}

// Run once from the editor after updating this separate logging project.
function setupDailyVisitEmail() {
  setupVisitLogs();
  MailApp.getRemainingDailyQuota(); // Requests email permission during setup.
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'sendDailyVisitEmail')) {
    ScriptApp.newTrigger('sendDailyVisitEmail').timeBased().everyMinutes(5).create();
  }
}
function visitReportWindow(now) {
  const date = Utilities.formatDate(now, 'Asia/Kolkata', 'yyyy-MM-dd');
  let end = new Date(date + 'T23:00:00+05:30');
  if (now < end) end = new Date(end.getTime() - 86400000);
  return { start: new Date(end.getTime() - 86400000), end, key: Utilities.formatDate(end, 'Asia/Kolkata', 'yyyy-MM-dd') };
}
function sendDailyVisitEmail() {
  const now = new Date();
  // Late-night retries only: no surprise historical email on initial daytime setup.
  if (Number(Utilities.formatDate(now, 'Asia/Kolkata', 'HH')) !== 23) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    const props = PropertiesService.getScriptProperties(), period = visitReportWindow(now);
    if (props.getProperty('VISIT_REPORT_SENT') === period.key) return;
    const book = SpreadsheetApp.openById(props.getProperty('VISIT_SHEET_ID'));
    const rows = [];
    const dates = [...new Set([period.start, period.end].map(d => Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd')))];
    dates.forEach(date => {
      const sheet = book.getSheetByName(date);
      if (!sheet || sheet.getLastRow() < 2) return;
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getDisplayValues().forEach(row => {
        const received = new Date(row[1] + 'T' + row[2] + '+05:30');
        if (received >= period.start && received < period.end) rows.push(row);
      });
    });
    const visits = new Set(rows.map(r => r[7])), flats = new Set(rows.map(r => r[3]));
    const sections = new Map();
    rows.filter(r => r[4] === 'section').forEach(r => sections.set(r[5], (sections.get(r[5]) || 0) + 1));
    const top = [...sections].sort((a,b) => b[1]-a[1]).slice(0,10).map(([name,count]) => '- ' + name + ': ' + count).join('\n') || 'No section views recorded.';
    const format = d => Utilities.formatDate(d, 'Asia/Kolkata', 'dd MMM yyyy, HH:mm');
    const body = 'Sai Vista daily visit report\n\n' + format(period.start) + ' to ' + format(period.end) + ' IST (end exclusive)\n\n' +
      'Visits with recorded activity: ' + visits.size + '\nDistinct entered flats: ' + flats.size + '\nRecorded activities: ' + rows.length + '\n\nMost viewed sections\n' + top +
      '\n\nPrivate detailed records: ' + book.getUrl() + '\n\nFlat entries are self-reported, not verified identities. Records may be incomplete if visitors are offline or block logging. Activity after 23:00 appears in the next report. Sheet access remains restricted; this email does not grant access.';
    MailApp.sendEmail({to:'paresh218@gmail.com,freakypriyank@gmail.com',subject:'Sai Vista | Daily visit report | ' + period.key,body,name:'Sai Vista Cultural Committee'});
    props.setProperty('VISIT_REPORT_SENT', period.key);
  } finally { lock.releaseLock(); }
}

// Run once after the daily poster PNGs have been published on the website.
function setupMorningFestivalEmails() {
  MailApp.getRemainingDailyQuota();
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'sendMorningFestivalEmail')) {
    ScriptApp.newTrigger('sendMorningFestivalEmail').timeBased().everyMinutes(5).create();
  }
}
function morningFestivalDay(now) {
  const date = Utilities.formatDate(now, 'Asia/Kolkata', 'yyyy-MM-dd');
  const hour = Number(Utilities.formatDate(now, 'Asia/Kolkata', 'HH'));
  return date >= '2026-10-11' && date <= '2026-10-21' && hour === 6 ? date : null;
}
function sendMorningFestivalEmail() {
  const now = new Date(), date = morningFestivalDay(now);
  if (!date) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty('MORNING_POSTER_SENT') === date) return;
    const url = 'https://saivistaculturalcommittee.in/assets/daily-posters/' + date + '.png';
    const response = UrlFetchApp.fetch(url, {muteHttpExceptions:true});
    if (response.getResponseCode() !== 200) throw Error('Publish the daily poster first: ' + date);
    const blob = response.getBlob();
    if (!/^image\/png/i.test(blob.getContentType())) throw Error('Poster URL did not return a PNG image.');
    blob.setName('Sai-Vista-Raas-Rang-' + date + '.png');
    const weekend = ['2026-10-16','2026-10-17','2026-10-18'].includes(date);
    const text = 'Good morning! Your Sai Vista Raas Rang poster for ' + date + ' is attached, ready to share.\n\nDaily Aarti: 7:45 PM\nGarba: 8:00–10:30 PM\nSong requests: final 15 minutes only, 10:15–10:30 PM. All timings are IST.' + (weekend ? '\n\nDress up in your festive best today! A professional photographer and photo booth will help capture your moments.' : '') + '\n\nhttps://saivistaculturalcommittee.in';
    MailApp.sendEmail({to:'paresh218@gmail.com,freakypriyank@gmail.com',subject:'Sai Vista Raas Rang | Today’s poster | ' + date,body:text,htmlBody:'<p>'+text.replace(/\n/g,'<br>')+'</p><img src="cid:dailyPoster" alt="Today’s Sai Vista festival schedule" width="540" style="max-width:100%;height:auto">',inlineImages:{dailyPoster:blob},attachments:[blob],name:'Sai Vista Cultural Committee'});
    props.setProperty('MORNING_POSTER_SENT',date);
  } finally { lock.releaseLock(); }
}
