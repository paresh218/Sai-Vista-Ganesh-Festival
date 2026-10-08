# Required flat entry and private visit records

The required gate is ready in the local website. Every page load requires one flat-number entry (wing A–F, floor 1–13, unit 01–04). Continuing acknowledges the visible visit-record notice. A101, A-101 and A 101 are accepted. Examples: A-101, F-1304. It cannot be dismissed normally without completing those fields. No resident identity is stored between page loads.

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


## Daily email report — one-time activation

Recipients: paresh218@gmail.com and freakypriyank@gmail.com.

1. In the existing **private visit logs** Apps Script project, replace the code with the updated `visitor-logs.gs` and save. Do not change the gallery project.
2. Select **setupDailyVisitEmail** from the function menu, click **Run**, and approve the email permission for the committee account. This installs one trigger; repeating setup does not duplicate it.
3. The report sends once per day on the first successful trigger run at or after **23:00 India time**, normally within five minutes. Google scheduling and email delivery are not exact-time guarantees. Failed runs retry during the 23:00 hour; check Apps Script Executions for failures. No historical backlog is sent.
4. The report covers the previous 23:00 up to the current 23:00, including yesterday's late-night activity. It includes activity totals, distinct entered-flat count, top sections and the private Sheet link. No raw device/IP data is emailed. Share the Sheet privately with those two recipients if they need detailed records.

The trigger uses saved editor code, so a new web-app deployment URL is not needed for this email feature. The website still needs publishing for the UI improvements. No trigger or email is activated merely by editing these local files.

## Morning festival posters — 6 AM, 11–21 October 2026

All 11 ready-to-share PNG images are in `assets/daily-posters`. The nine Navratri days use the supplied day colour and existing goddess illustration. The final two dates use a general celebration design. Posters for 16–18 October include professional photography and photo-booth reminders.

1. Publish the updated website, including the daily-posters folder and setup video/photo.
2. Paste the updated `visitor-logs.gs` into the existing private logging project and save.
3. Run **setupMorningFestivalEmails** once and authorize email and external-request access. Keep the existing 11 PM report trigger. No new web-app URL is required.
4. Each date's poster is emailed inline and as a PNG attachment to paresh218@gmail.com and freakypriyank@gmail.com, on the first successful run at/after 06:00 IST (normally within five minutes). Retries run during the 6 AM hour only; no wrong-day catch-up emails are sent. Google does not guarantee exact delivery time. The public image must return HTTP 200 and image/png; missing files cause a visible failed execution and a later retry.
5. After 21 October, no more festival emails are sent. You may remove the sendMorningFestivalEmail trigger after the festival.

Scheduling code is prepared locally, not activated in your Google account. Local tests do not send emails.
