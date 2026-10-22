# Private Navratri gallery

The gallery uses the existing registration Apps Script deployment. Keep the source folder and workbook IDs in Script Properties only: `GALLERY_FOLDER_ID` and `GALLERY_BOOK_ID`. Never put them in public JavaScript.

## Committee workflow

Open the private registrations workbook. In **Gallery access**, check the verified email and self-reported name/flat, then change Status from `PENDING` to `APPROVED`. Use `DENIED` or `REVOKED` to block access. Visitors choose **Check approval** after approval. Verification alone never grants photo access.

**Gallery activity** records server requests and browser-reported events. Download requested/prepared means a download was requested/generated; it does not prove the file was saved. Browser details and flat are self-reported. Logs cannot identify screenshots, activity outside this gallery, or the person physically using an email account. Audit rows expire after 90 days.

**Gallery photos** is a private index. Keep that tab and the workbook restricted. The source Drive folder must also remain Restricted; inspect independently shared descendants with the source owner if needed.

## Backend maintenance

Keep the existing registration code, add `protected-gallery.gs` to the same project, and retain the gallery dispatch in `event-registration.gs`. Run `setupProtectedGallery`, `indexProtectedGallery`, and `installGalleryCleanup` after configuring the private properties. Update the existing web-app deployment, executing as the service account, with the same endpoint. Never publish temporary setup helpers containing actual IDs.

OTP expires after 10 minutes and permits five attempts. Resend limits: one minute between requests, three per hour and five per day per email. Global limit: 80 recipient emails per day, with quota reserved for existing forms. Apps Script personal-account email quotas also apply. Sessions expire after eight hours. Approval is rechecked on media requests; preview data is cleared when the gallery closes and is never service-worker cached.

Thumbnails load in batches of six, 24 photos per page. Downloads use a preview up to 2560 pixels with a browser-generated Sai Vista Navratri 2026 watermark. Approved viewers can still save previews or take screenshots; watermarking is not copy protection. Google thumbnail URLs are fetched only on the server. If Google changes the thumbnail size format, the service fails closed and needs an update.

Run `npm run test:player` and `npm test` before publication. Verify real OTP delivery, pending rejection, approval, revocation, thumbnails, preview, watermarked download and private logs. Automated mocks do not prove email delivery, Drive permission inheritance, real media retrieval or mobile hardware behavior.
