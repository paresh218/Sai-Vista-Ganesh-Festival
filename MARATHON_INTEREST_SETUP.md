# Marathon interest responses — 20 October 2026

The website now has a compact marathon banner and separate Running and Walking interest popups. These save responses directly; WhatsApp is no longer required.

## Where to check responses

Open the private [Marathon Interest 2026 response sheet](https://docs.google.com/spreadsheets/d/1RSS5k6ozgaUCKzGf8jveg6nXR4ZB4e905YNBdu6C5YY/edit).

- **Running**: running-interest responses.
- **Walking**: walking-interest responses.
- Each response includes submission time (India time), reference, name, wing and flat, participant count, activity and consent. The technical payload column is hidden.
- The committee account owns the file. Paresh's account has the specifically approved editor access needed by the registration service. General access remains Restricted. No sharing notification email was sent.
- Two live test rows remain, one in each tab, named **TEST RESPONSE - DO NOT COUNT**, flat F-1304. Exclude them from planning totals; they demonstrate the completed save flow.
- No public response-list endpoint exists. Residents see only their own save confirmation and reference.

## Save behaviour

The popup checks the registration service before enabling Save. A saved confirmation requires a matching server acknowledgement. The server validates activity, name, wing/flat, count (1–20) and consent. It escapes spreadsheet formulas, locks writes and rejects duplicate households within the same activity. A household may express interest in both activities.

Retries preserve the exact reference and data to prevent duplicate rows after a slow or uncertain response. For corrections, contact the committee rather than submitting another entry. Flat numbers are self-reported, not identity verification.

The event remains tentative: early to mid December 2026. No date, distance or route is confirmed.

## Deployment

The existing Apps Script web app was updated to **version 9 on 20 October 2026, 14:52 IST**, keeping its existing URL, execution identity and audience. Historical event code was preserved when adding marathon handling. The new handler saves only to the separate private marathon sheet.

Website changes remain local and have not been published to GitHub Pages. Local preview: http://127.0.0.1:8911/. Use HTTP for browser testing rather than opening index.html as a file.

For future backend changes, update the existing project's Code.gs using event-registration.gs (review historical event differences first), then Deploy → Manage deployments → Edit → New version. Keep the same endpoint. The new response file ID is in marathonBook(). Do not change the legacy eventBook() destination.

## Verification performed

- Real browser checks in Edge and the in-app Chromium browser.
- Responsive checks at 320, 390, 768, 1024 and 1432 CSS pixels.
- Home and banner spacing; image scaling; mobile menu; separate archive routing; archive switching and expanded Navratri content.
- Popup centring and scrolling; close button; Escape dismissal; focus returned to the launching button; inputs remain editable when reopening after a successful save.
- Real Running and Walking submissions, each verified in its private Google Sheets tab. Initial permission failure, preserved-reference retry and subsequent save were observed.
- Browser console inspected for errors on the preview.
- Automated regression tests cover archive routing, popup reopening, field validation, service gating, acknowledged save, failed save, server validation, duplicates, uncertain-save retries and spreadsheet formula escaping.
- Physical Android/iPhone testing, Safari, OS sleep, background audio and live YouTube playback were not performed. Player regression tests simulate their covered integrations.

The banner uses a generated illustration/photo asset, not a photograph of actual residents: assets/sai-vista-marathon-coming-soon.webp (1536 × 1024, approximately 238 KB).

## Image generation

Built-in image generator; no separate paid service configured.

Final prompt:

> Use case: ads-marketing. Create a polished wide landscape website banner for Sai Vista community marathon coming soon. Warm candid photorealistic scene in a leafy Indian residential community at sunrise: happy Indian children running alongside parents and elderly residents, all wearing matching plum purple athletic T-shirts with clear small gold text "SAI VISTA MARATHON". Natural inclusive family atmosphere, believable running poses and anatomy. Theme warm cream, deep plum purple and subtle gold, premium friendly community campaign. Large elegant clearly legible heading at top "SAI VISTA MARATHON" with subtitle "COMING SOON". Keep everyone and text inside generous safe margins for responsive display. No dates, no race distance, no sponsor logos, no watermarks. Landscape 3:2 or 16:9 composition.
