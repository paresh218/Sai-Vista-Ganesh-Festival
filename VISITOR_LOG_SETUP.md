# Required flat entry and private visit records

The required gate is ready in the local website. Every page load requires a wing A–F, floor 1–13, unit 01–04 and acknowledgement. Examples: A-101, F-1304. It cannot be dismissed normally without completing those fields. No resident identity is stored between page loads.

This is a **self-reported flat entry gate, not authentication**. The static site files and existing public data endpoints remain accessible to someone bypassing JavaScript. Genuine resident-only protection would require authenticated hosting and protecting every data endpoint. An entered flat or IP cannot prove a person's identity.

## Private Google Sheet

1. Signed in as saivistaculturalcommittee@gmail.com, create a **separate** Apps Script project named Sai Vista Private Visit Logs. Do not replace the gallery/approval script.
2. Paste `visitor-logs.gs`, save, run `setupVisitLogs`, and authorize Sheets and trigger access. The execution log links to the new private spreadsheet. Its ID is also saved in `VISIT_SHEET_ID` Script properties.
3. Do not put this spreadsheet in the public media folder. Keep it Restricted; share only with committee members who need the records. The website never receives a spreadsheet link or a read-logs endpoint.
4. Deploy as Web app, Execute as Me, access Anyone. This endpoint accepts log writes but never returns the records.
5. Without IP collection, put its `/exec` URL into `resident-access-config.js` and leave `capturesIp: false`. Send the URL here if you want it connected.

## Accurate IP collection (optional additional server)

Apps Script's documented web request event does not expose the client IP. Do not substitute an Apps Script server IP or trust a browser-supplied IP.

1. Deploy `visitor-log-worker.mjs` as a Cloudflare Worker.
2. Set Worker `LOG_SCRIPT_URL` to the private logging script's `/exec` URL.
3. Create a long random secret (at least 32 random bytes). Save it as a **secret** named `LOG_INGRESS_SECRET` in Cloudflare and the same-named Script property in Apps Script. Never put it in website files or chat.
4. Set `ALLOWED_ORIGINS` to the site's exact HTTPS origins, comma separated. For development, explicitly add your localhost origin. Do not add the opaque `null` origin used by local file previews.
5. Put the Worker's HTTPS URL in `resident-access-config.js` and set `capturesIp: true`. The Worker obtains the connecting IP from Cloudflare's request metadata; Apps Script accepts only secret-authenticated records.
6. Redeploy and publish the website. Enter a test flat and view several sections, then confirm rows in the Sheet. Delete only your test rows when finished.

## What's recorded

- One visit ID per page load; entered flat; named sections visited and button/navigation identifiers; browser-reported event time and server receive time.
- Day tabs and receive times use **Asia/Kolkata**. Browser details include user agent (browser/OS as reported), language, viewport and reported timezone. No hardware serial numbers, persistent fingerprint, GPS, form contents, captions, payment information or external browsing history is collected.
- With the Worker connected: visitor network IP. VPNs, proxies and shared networks affect it; it is not proof of a resident's identity.
- A daily cleanup removes date tabs older than 90 days. The gate discloses collection before entry. With no endpoint configured it accurately states logging is not connected.
- Events are buffered in memory, sent in small batches, retried on failure and deduplicated against recent entries. Network shutdowns, blockers, offline use and tampering can cause missing or untrusted records. This is visit analytics, not a guaranteed audit trail.
- A valid flat unlocks the UI even if logging is temporarily unavailable. A missing/invalid flat never unlocks the normal UI. CORS and the collector secret do not authenticate the entered resident; public write endpoints can be abused. Apply hosting-side rate limits for a production deployment with significant traffic.

No logging infrastructure was deployed and no visitor records were transmitted during implementation. Publish the frontend and configure/deploy the private collector to activate recording.

Reference: https://developers.google.com/apps-script/guides/web#request_parameters
