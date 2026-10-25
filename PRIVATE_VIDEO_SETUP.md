# Private Navratri video

The top homepage section reuses the existing committee-sent email OTP, remembered gallery session and logged-in flat. Flat selection is self-reported; matching the session does not independently prove residency. The service refuses invalid, expired, revoked and mismatched-flat sessions.

The source is 505,771,572 bytes, 1920×1080, approximately 3:12. FFmpeg created a 15-second 640×360 preview (1,312,851 bytes) and a bandwidth-capped 1920×1080 download (74,494,107 bytes). The original remains unchanged.

## Storage and access

- Only encrypted `.bin` chunks and a non-secret manifest are published. No playable MP4, email, flat, session token or encryption key belongs in public assets or Git.
- `tools/prepare-private-video.cjs` uses a distinct random AES-256-GCM key for each variant, a random nonce per chunk, and asset/variant/index authentication data. It checks every encrypted chunk against the source bytes before publishing the manifest.
- Private settings belong in the committee gallery project's `GALLERY_VIDEO_CONFIG` Script Property, shaped as `{keys:{preview,optimised,original},manifestSha256}`. Keep the generated settings file in ignored local storage. Never log it or commit it.
- `gallery-video` checks the existing session before returning the selected variant key and signed-in session expiry, capped to one hour. Preview and download requests are logged privately before access is granted. A preview key cannot unlock either full download.
- The client/worker verifies the manifest against the hash from the private service. Keys are used in memory only. Logout/flat changes clear the preview and cancel this tab's pending downloads.
- Authorised users can save and redistribute files, as they can with the photo downloads. This is access control, not DRM. Logs record requests and browser delivery, not proof that an OS saved a file or that a human watched it.

## Large downloads

The root service worker grants a random, expiring download route bound to the verified browser/page. It fetches/decrypts one 4 MiB chunk at a time and streams bytes to the browser download, with Content-Length, attachment filename, progress, cancellation, retry and single-range support. Native attachment navigation uses a hidden child frame and must refer back to the granting page; other client fetches are refused. A copied URL has no grant in another browser. Keep the source tab open. Keys/grants are never persisted in Cache Storage.

The service worker excludes encrypted assets from its application cache. Their versioned URLs can use normal browser HTTP caching. A browser without the streaming worker can prepare only the smaller copy (maximum 100 MB) in memory; it never buffers the 500 MB original. A refresh may be needed once to activate the updated worker.

The existing free GitHub Pages host is used. Total published source assets remain below its 1 GB site limit. Its soft monthly bandwidth allowance is 100 GB, so promote the 74.5 MB copy rather than the original. See https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits . Delivery speed still depends on the resident's connection and hosting limits.

## Regression

Run `npm test` and `npm run test:player`. The video tests cover encryption round trips, distinct keys, unsafe manifests, private session checks, logging, client-bound downloads, exact streamed bytes, Range, cancellation, locked initial UI, verification reuse and the original-file memory guard.

Before releasing, check the top card at 320/390/768/1024/1440 widths, email verification, preview playback, both downloads, cancellation and returned-file hashes. Test native download behaviour separately on physical Android/iPhone devices; desktop mocks do not prove mobile OS behaviour. Temporary setup helpers containing keys must be removed before creating the deployed Apps Script version.
