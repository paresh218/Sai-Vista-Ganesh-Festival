# Shared community photos

The website now includes a top photo-upload link and an accessible slideshow. Uploads remain clearly marked as coming soon until shared storage is connected; they are never saved only to one visitor's browser.

1. Create a dedicated private Google Drive folder owned by the committee. Copy its folder ID.
2. Create a **separate** Google Apps Script project and paste `photo-gallery.gs`. Do not replace the existing payments, expenses or registration scripts.
3. Under Project Settings → Script properties, add `PHOTO_FOLDER_ID` with the folder ID.
4. Deploy as a web app, executing as the committee owner, accessible to Anyone. Authorize Drive access with the committee account.
5. Paste the deployed HTTPS `/exec` URL into `photo-gallery-config.js` as `endpoint`.
6. Publish the website files. Test with one permitted photo, then open the website on a second device to confirm the photo is shared.

Uploaded photos appear publicly immediately. The latest 12 appear in the slideshow, with previous/next and pause controls. Delete a photo from the dedicated folder to remove it from future gallery loads. The folder stays private; the web app serves photo content publicly. Keep only public community photos in this folder. Captions are rendered as plain text. Browser conversion to JPEG strips original metadata. The service limits images to 1 MB after conversion and the folder to 300 files. This is a small community gallery using Apps Script quotas, without user authentication; committee members should monitor submissions and storage.

Deployment requires the committee's Google account; no credentials belong in this repository. The storage service has not been deployed by this change.
