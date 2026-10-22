# Verified-email Navratri gallery

The gallery runs in its own **Sai Vista Private Photo Gallery** Apps Script project, owned and deployed by **saivistaculturalcommittee@gmail.com**. Registration forms retain their separate endpoint. The sender guard fails closed if someone deploys the gallery under another account.

## Visitor flow

The gallery reuses the flat remembered by the site's resident gate. The flat is self-reported; email verification does not prove residency. A correct email OTP grants access automatically, without committee approval. An address that cannot receive its OTP cannot enter. Codes expire after ten minutes, permit five guesses and become invalid when a newer code is requested. Resend becomes available after 30 seconds. Abuse limits: ten requests per hour and twenty per day per email, plus Google's actual account quota.

Verification stays in local browser storage for 90 days, bound to the entered flat. Sign-out, changing flat, forgetting the device, clearing browser data or expiry requires verification again. DENIED/REVOKED rows in the private **Gallery access** tab continue to block access for abuse handling; PENDING rows from the old version become approved after a new correct OTP.

## Photos and private records

The source folder and workbook IDs are private Script Properties: `GALLERY_FOLDER_ID` and `GALLERY_BOOK_ID`. Keep Drive sharing Restricted. **Gallery photos** is a private index. Run `setupProtectedGallery`, `indexProtectedGallery`, and `installGalleryCleanup` after configuring properties. Deploy `protected-gallery-service.gs` plus `protected-gallery.gs`, using `protected-gallery-appsscript.json` for read-only Drive scope, spreadsheet access, Gmail send-only access, external preview requests and cleanup triggers. Remove any temporary setup helper containing actual IDs before deployment.

**Gallery activity** records email, entered flat, requested photos/downloads, view mode, time and self-reported browser information for 90 days. Download requested/prepared does not prove a file was saved. Logs cannot identify screenshots or who physically used an email account.

Thumbnails fetch six at a time, with at most two client requests in flight. Drive metadata and images are fetched in parallel on the server. Compact index data and small thumbnails are cached server-side. Larger display copies and thumbnails use a separate private browser cache, scoped to email and flat, with a seven-day lifetime, 64 MB budget and 160-entry limit. Browser quota failures fall back to network. An access check is required before opening cached previews/downloads; album listing authenticates cached thumbnails. Signing out or forgetting the device clears this gallery's cache without touching saved music. Approved users can save previews or take screenshots; watermarking is not copy protection.

Downloads are generated up to 2560 pixels with **Sai Vista Navratri 2026** in the corner. Repeated downloads reuse cached image bytes but still record a server download request.

## Capacity and tests

Apps Script quotas apply per account, not per file/project. Extra script files cannot multiply email quota. MailApp normally allows 100 recipients/day. This gallery instead uses the direct Gmail API with send-only permission; personal Gmail normally permits up to 500 messages/day across the mailbox. The gallery reserves a maximum of 450 sends per rolling 24 hours, leaving headroom for other mail; Google can enforce lower or anti-abuse limits. Apps Script still limits simultaneous executions to 30 per account. Do not split scripts to bypass account limits. No paid service is enabled by this implementation. Bounded client requests and retries reduce bursts but do not promise 300 simultaneous users or unlimited throughput.

Run `npm run test:player` and `npm test` before publishing. Regression coverage must retain automatic approval, wrong/expired/replayed OTP rejection, 30-second resend, sender guard, flat-bound persistent sessions, revocation, isolated caches, blocked storage fallback and parallel image fetching. The 300-user simulation tests token isolation; it is not a real 300-user load test. Verify real committee sender, OTP delivery, automatic access, repeated browser access, cached rendering, watermarked download and private logs in a browser. Browser viewport checks do not establish physical-phone behavior.
