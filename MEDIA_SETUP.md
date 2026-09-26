# Enable short videos and Instagram Reels

The website changes are ready locally. Your existing deployed photo service must be updated before the new submission forms become available. Existing photos and the photo URL stay the same.

## Update your existing Apps Script project

1. Open the **Sai Vista Photo Gallery** Apps Script project you already deployed.
2. Replace all of **Code.gs** with the complete contents of **photo-gallery.gs** from this project and save.
3. Keep your existing `PHOTO_FOLDER_ID` Script property.
4. Choose **Deploy → Manage deployments → Edit (pencil)** on the existing web app.
5. Select **New version**, then **Deploy**. Keep Execute as Me and access Anyone. Complete any Google authorization requested for Drive sharing.
6. Keep the existing `/exec` URL in `photo-gallery-config.js`. Publishing a new version of that deployment preserves its URL.
7. Publish the changed website files, including `community-media.js`. Refresh videos on the website: the forms will enable when the service reports version 2.

## Review and approve submissions

New videos and Reel records are private pending files in your dedicated Drive folder, named `pending-media-…`. They are not shown publicly until approved.

1. Open a pending video and review it. For a pending Reel, open/download its small JSON file and visit the `url` inside. Confirm that the Reel is appropriate, public and can be embedded. Submission validates the URL, but cannot prove public visibility.
2. Copy the pending file's Drive ID from its address or share link.
3. In Apps Script → Project Settings → Script properties, set `REVIEW_FILE_ID` to that ID.
4. In the editor, select **approveSelectedMedia** and click **Run**. This approves only that file. For videos it also sets **Anyone with the link / Viewer** so visitors can play them through Google's embedded player. The parent folder stays private. Reel metadata remains private.
5. Refresh videos on the website. Approved media appears newest first (up to 24).

To reject a pending item, move it to Trash in Drive. To withdraw an approved video, first change its sharing to Restricted, then move it to Trash. To withdraw an approved Reel, move its record to Trash. Reload/refresh removes it from the displayed list; already-open third-party players are controlled by their providers.

## Behaviour and limits

- MP4 and WebM only, maximum **25,000,000 bytes (25 MB)**. This limit is enforced on both the browser and server. No extra duration limit is imposed.
- Uploads use your existing Apps Script/Drive service. Base64 transfer adds about one third to the network payload. The page waits up to three minutes; a retry without editing the form reuses the submission ID to prevent duplicate files. Very slow connections may still need a smaller file.
- Videos load only after a visitor clicks Play. Drive may need processing time, and playback availability/codecs are controlled by Google. An Open in Google Drive link is always available.
- Instagram uses the official embed script, loaded when the visitor clicks Watch Reel here. Direct `instagram.com/reel/…` and `/reels/…` URLs are accepted, normalized and deduplicated; tracking parameters are discarded. Arbitrary HTML, other hosts, profile links and redirects are not accepted.
- This does not download Instagram videos or bypass privacy/login/embedding restrictions. Playback, branding and sign-in prompts remain controlled by Instagram. An Open on Instagram link is always available. No Instagram account or Meta token is stored by this website.
- All media shares the existing 300-file folder limit and the owner's Drive/Apps Script quotas. The site is a small community gallery, not a dedicated video streaming service.

## Verify after deploying

Submit one permitted small MP4, check it is absent from the public list while pending, approve it, then play it on another device. Repeat with a permitted public Reel whose creator allows embedding. Confirm a file above 25 MB is rejected. No test videos or Reel links were submitted to your live service during local implementation.
