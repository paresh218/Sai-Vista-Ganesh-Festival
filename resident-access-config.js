// Use the Cloudflare Worker URL for verified IP capture, or the logging Apps Script
// URL without IP capture. Never put the Worker-to-Sheets secret in this file.
window.SaiVistaVisitConfig = {
  endpoint: 'https://script.google.com/macros/s/AKfycby0suUb2Hngx322EUp73iMGwNeeGKRGg4inYu17vh3SCaE-LfdJYElOxN1L0JiptKk_/exec',
  capturesIp: false
};
