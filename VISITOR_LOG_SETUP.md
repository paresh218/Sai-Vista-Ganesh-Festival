# Verified resident visit records

## Current logging flow

The website sends named visit events to the resident/gallery service using the current resident session token. The service verifies the session and current email/flat/reference permissions, then derives the email and resident name on the server. Browser-supplied email/name fields are ignored. Guests are not assigned resident identities or recorded by this authenticated logger.

The private `SITE_VISIT_BOOK_ID` Script Property points to the existing visit-log workbook. New rows keep the original first 13 column positions, preserving history, 90-day cleanup and the existing daily report’s counts. Columns N:Q add Verified email, Resident name, Identity status and Site release. Historical flat-only rows remain unchanged with blank identity fields; never relabel them verified. Devices, action identifiers and client times remain browser-reported, not proof that the named person physically used a device.

No session tokens, OTPs, form contents, captions, payment details or arbitrary URLs are stored in the visit rows. IP addresses are not collected by this flow. Times and dated tabs use Asia/Kolkata. The logger validates batch size (20), UUIDs, named identifiers, release format and event times; all sheet text is protected from formula injection. The service caps request bodies at 32 KB.

The browser buffers at most 100 events in memory, retries failures using the same event IDs and removes only server-acknowledged IDs. The server deduplicates against 5,000 recent rows in the receive-day tab. Cross-day retries or retries beyond that window may duplicate entries; this is useful site analytics, not a guaranteed audit trail. Navigation shutdowns, blockers and offline use can lose records. Observer/timer cleanup stops recording after sign-out and prevents duplicated observers on re-entry.

## Existing email list

Continue using the user-linked workbook’s `Gallery access` tab (gid 735712086). Existing A:F values and email/flat bindings are preserved. Column G is the existing optional Resident approval override. H:J contain First resident verification (IST), Last resident activity (IST), Resident verification. Metadata is updated in place for the normalized existing email; a login does not append a duplicate email row. First verification is set only by a successful resident OTP; previously issued sessions can update Last activity without inventing a historical first-verification time. The list was checked before migration: 67 email rows, no duplicate normalized addresses.

`setupResidentContactColumns` adds only the G:J headers, rejecting conflicting headings. It does not change the private roster or approve residents. Updates are made under the gallery service’s script lock.

## Deploying updates

1. Build `node tools/build-resident-service.cjs`; this now includes resident-logging.gs.
2. Back up the existing project, then set private `SITE_VISIT_BOOK_ID` to the existing private visit-log workbook ID. Keep `GALLERY_BOOK_ID` and the resident reference unchanged. The committee account needs access to both workbooks.
3. Run `setupResidentContactColumns` once. Verify the header cells and unchanged email count. Update the existing gallery deployment version while retaining its URL.
4. Publish the versioned resident-access-config.js and resident-access.js with the release/cache marker. Do not send browser events to the old flat-only logging endpoint.
5. Check a real signed-in visit: N:Q in the private daily tab and H:J on the existing email row. Do not fabricate verification timestamps or send OTP mail merely to test logging. Unregistered requests must be rejected without writing rows.

The old visit-logger project and existing daily email/cleanup triggers remain available for historical records and reports. New rows use the same private log workbook and original column positions. The old endpoint can only write the legacy 13-column unverified format; it cannot populate verified identity columns. Keep the private sheet restricted. No new report recipients, bulk emails or additional paid services are introduced.

## Deployment verification — 1 November 2026

Backend version 15 is configured against the existing visit-log workbook and email source. Header migration preserved all 67 email rows. New G:J headers were verified by readback and native Sheets inspection; existing profile data and approvals were not changed. Automated checks: 186 site tests and 27 player checks passed. No OTP or report email was sent as part of these checks.

## Historical setup notes

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
