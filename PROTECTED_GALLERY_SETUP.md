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

## Page navigation, favourites and loading

Go to page accepts whole page numbers within the current album. The last visited page and favourite photo references are saved per email/flat on this browser, and cleared by sign-out or Forget this device. Favourites still require authenticated access to open photos. If the album has been reordered, a saved favourite may no longer be on its original page and reports this safely.

Visible and nearby thumbnails load first using IntersectionObserver, in six-photo batches with at most two requests in flight. Browsers without IntersectionObserver retain the previous batched loading. The next photo preloads after a preview opens unless Save-Data or a 2G connection is reported; preload requests are labelled in the private log as preload mode, and only actual display records photo_displayed. Matching in-flight requests are shared. Background update scans pause while the gallery is open; active requests, downloads and edited forms prevent automatic refresh. The release keeps existing endpoints, sessions, cache names and older HTML compatible.

## Free Sharp preparation

Sharp runs locally with no subscription or always-on server. It cannot run inside GitHub Pages or Apps Script. Keep source files, private indexes and outputs under the ignored `tmp/` directory, never the public `assets/` folder. Originals remain unchanged. The existing email verification, flat-bound sessions, audit records and browser caches remain required.

Create a private JSON index containing `[{"id":"SOURCE_DRIVE_FILE_ID","file":"relative-source.jpg"}]`, then run `npm run gallery:prepare -- SOURCE_FOLDER OUTPUT_FOLDER PRIVATE_INDEX_JSON`. Use separate input/output folders. The builder uses two workers and creates 320px, 1600px and 2560px WebP copies, auto-rotates, strips EXIF/location metadata and avoids enlargement. Downloads retain the existing browser watermark. Only a completed build writes `manifest.json`; verify its hashes and byte counts before uploading. Failed builds must be rerun before publishing any changed files.

Upload generated `.webp` files to a Restricted folder owned by the committee account. Keep names unchanged. Set the private Apps Script property `GALLERY_PREPARED_FOLDER_ID` to that folder, then run `indexPreparedGallery`. This adds F:H to the private Gallery photos index; public responses still contain only opaque photo references. Missing sizes and failed media responses use the existing original-preview path. Small prepared copies cache for six hours, with cache keys including the prepared file ID. Replacing prepared copies requires reindexing. Prepared files must represent the matching source ID; never rename unrelated photos to reuse another photo's ID.

This removes one Drive metadata request per uncached prepared image, and prepares compression once. It does not remove Apps Script authentication/Drive latency or account quotas. No claim of an exact speedup or zero bugs is made without a live comparison. It is not a CDN and does not require imgproxy hosting. Test coverage includes real Sharp encoding/orientation/metadata stripping, unchanged originals, path validation, incomplete builds, private indexing, cache invalidation, fallback, existing OTP/revocation and player/site regression.

## Optional local photo packs

Save for faster browsing is an explicit opt-in. Residents choose this page or the whole album, review an approximate storage range sampled from up to three display copies, then choose Start saving. The dialog blocks other controls, reports photo-count completion and actual JSON storage bytes in MB, and always allows Cancel or Escape. Cancelling aborts queued/current client transfers and keeps completed copies for resume; it cannot undo work already running on Google servers. Storage failure never reports success.

The separate local-pack cache stores 1600-pixel viewing copies and locally generated 320-pixel thumbnails, with a 512 MB photo-data budget and seven-day lifetime. Size estimates are approximate; browser metadata and accounting can differ. This is not an original-file download or completely offline gallery. Normal server access checks and audit logging still apply when opening photos. High-quality 2560-pixel exports remain separate. Cache entries are scoped to email/flat, removed by sign-out or Forget this device, and may be evicted by the browser. No persistent-storage permission is requested. Whole-album preparation can take several minutes and uses normal data/server quota; saving the current page is the smaller option. Transfers stay bounded to two client requests. Web Locks serialize pack writes across tabs where supported, with a per-tab serial fallback. Existing normal caches and backend endpoints remain unchanged.
