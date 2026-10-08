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
