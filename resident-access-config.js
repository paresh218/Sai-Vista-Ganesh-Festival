// Use the Cloudflare Worker URL for verified IP capture, or the logging Apps Script
// URL without IP capture. Never put the Worker-to-Sheets secret in this file.
window.SaiVistaVisitConfig = {
  endpoint: 'https://script.google.com/macros/s/AKfycbwPYEg58HXbItU2zmROKSWUtSylNkUQh_52qjKkh49qyB6cXr38gfh28tekGrwSRPD5/exec',
  capturesIp: false
};
