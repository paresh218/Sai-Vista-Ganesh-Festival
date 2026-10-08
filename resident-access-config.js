// Use the Cloudflare Worker URL for verified IP capture, or the logging Apps Script
// URL without IP capture. Never put the Worker-to-Sheets secret in this file.
window.SaiVistaVisitConfig = { endpoint: '', capturesIp: false };
