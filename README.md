# Sai Vista Ganesh Festival 2026 — V3

## Included
- Mobile-first festival homepage
- Festival schedule
- Five Google Forms integrated as website modal cards
- Existing custom Aarti nomination form integrated with the supplied Google Apps Script
- Live Aarti slot availability
- WhatsApp follow-up link
- Festival accounts placeholder, ready for Google Sheets / Apps Script
- Committee updates and a Today card managed from one local content file
- No server required for GitHub Pages

## Forms
1. All Event Registration: https://forms.gle/LZDdZCUgNTp34tar5
2. Satyanarayan Pooja: https://forms.gle/xkEiQqAmXVQ75Keb8
3. Bollywood Night: https://forms.gle/28994c4UexrtNWbXA
4. Satyanarayan Prasad Availability: https://forms.gle/KC1wqmx4xjHbMRtz7
5. Fun Fair Stall Entry: https://forms.gle/2YapGuBbkc962JuZ6

## GitHub Pages
Put `index.html`, `style.css`, and `script.js` in the repository root and enable:
Settings → Pages → Deploy from branch → main → / (root).

## Note about Google Forms
The current implementation opens the supplied Google Form URLs in a website modal. Google may prevent some forms from being embedded in iframes; the modal includes a direct-open fallback. Once the actual field structures are available, selected forms can be converted to native website forms backed by Apps Script and Google Sheets.


## V4 schedule update
The supplied Ganpati 2026 schedule artwork has been added to the homepage and can be opened in a full-screen viewer.
The written schedule section has also been expanded to 14–25 September 2026 to match the latest artwork.


## V5 T-shirt update
Added a Ganpati 2026 T-shirt nomination section:
- Interested: Yes / No
- Size: S, M, L, XL, XXL, XXXL
- Price: ₹300
- Deadline: 8 September 2026
- Deadline-aware UI that automatically closes after the deadline

The T-shirt UI is currently frontend-only because no Google Form or Apps Script endpoint for T-shirt nominations has been supplied. It is ready for a Google Sheets/Apps Script connection later.

## Committee-managed content

Use `site-data.js` to update the Today card and public committee updates. Do not add resident names, flat numbers, phone numbers or private details to that file.

`ADMIN_CHECKLIST.md` is a safe publishing template. Keep any real credentials and private committee records outside this website folder.

## Automatic website updates

The service worker now fetches current same-origin files online (HTTP cache revalidation), with cached responses as an offline fallback. It only deletes this festival site's old caches. Failed asset requests never fall back to HTML.

`site-updates.js` checks the page and its same-origin JavaScript/CSS content on startup, return to the tab, reconnection, and every five minutes while visible. Content hashes detect code changes without manually changing asset version numbers. It also requests service worker updates with `updateViaCache: none`. Offline or failed checks do not reload the page.

A changed version reloads automatically unless a form was edited or a dialog/payment modal is open. In those cases an update notice lets the visitor finish before choosing to reload. Edited forms are conservatively protected until the page reloads. Image-only replacements appear on the next page load; they do not trigger the code-content check.

Publish `service-worker.js`, `site-updates.js`, `script.js`, and `index.html` together with the rest of the website. Existing tabs running the old code must revisit/reopen the website to obtain this mechanism; code already loaded in a tab cannot be retroactively changed. The `file://` preview does not run this mechanism: verify on HTTPS hosting or localhost. Offline visitors retain cached content until connectivity returns. No cache clearing is required once the new worker is active.

Validation: `node site-updates.test.cjs` covers network freshness, offline fallback, missing-asset behavior, and uncached probes. JavaScript syntax checks also pass. Browser/device rollout remains to be verified after publishing.
