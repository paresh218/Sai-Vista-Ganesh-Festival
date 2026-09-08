// Paste into the Apps Script project for the supplied web app deployment.
// Set Script Property SPREADSHEET_ID to the destination Google Sheet ID.
const FETA_CLOSE = new Date('2026-09-11T17:00:00+05:30').getTime();
function doGet() {
  return fetaJson({status: 'success', service: 'Sai Vista Feta registration', version: 1});
}
function fetaJson(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const p = e && e.parameter || {};
    const name = String(p.name || '').trim().replace(/\s+/g, ' ');
    const phone = String(p.whatsapp || '');
    const flat = String(p.flatNo || '');
    const wing = String(p.wing || '');
    const paid = String(p.paid || '');
    const id = String(p.requestId || '');
    if (!/^[\p{L}\p{M}][\p{L}\p{M} .’'-]{1,79}$/u.test(name) || !/^[6-9]\d{9}$/.test(phone) || !/^(?:[1-9]|1[0-3])0[1-4]$/.test(flat) || !/^[A-F]$/.test(wing) || !['Yes','No'].includes(paid) || !/^[a-f0-9-]{36}$/i.test(id)) return fetaJson({status:'error', message:'Please check all required fields.'});
    const sheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!sheetId) return fetaJson({status:'error', message:'Registration setup is incomplete: the coordinator must set the SPREADSHEET_ID Script Property.'});
    lock.waitLock(20000);
    const book = SpreadsheetApp.openById(sheetId);
    const sheet = book.getSheetByName('Feta Registrations') || book.insertSheet('Feta Registrations');
    if (!sheet.getLastRow()) sheet.appendRow(['Registration ID','Timestamp (IST)','Name','WhatsApp','Flat No','Wing','Paid (self-declared)','Quantity','Amount']);
    if (sheet.getLastRow() > 1) {
      const match = sheet.getRange(2,1,sheet.getLastRow()-1,1).createTextFinder(id).matchEntireCell(true).findNext();
      if (match) return fetaJson({status:'success', registrationId:id});
    }
    if (Date.now() >= FETA_CLOSE) return fetaJson({status:'error', message:'Registration closed on 11 September 2026 at 5 PM IST.'});
    sheet.appendRow([id, Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'), name, phone, flat, wing, paid, 1, 70]);
    SpreadsheetApp.flush();
    return fetaJson({status:'success', registrationId:id});
  } catch (error) {
    console.error(error);
    return fetaJson({status:'error', message:'Unable to save registration. Please retry or contact Kantilal Mahajan.'});
  } finally { if (lock.hasLock()) lock.releaseLock(); }
}
