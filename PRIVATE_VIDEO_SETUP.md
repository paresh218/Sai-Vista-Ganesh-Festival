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

The service worker excludes encrypted assets from its application cache. Their versioned URLs can use normal browser HTTP caching. A browser without the streaming worker can prepare only the smaller copy (maximum 100 MB) in memory; it never buffers the 500 MB original. A refresh may be needed once to activate the updated worker. If a native stream is cancelled by the browser or shows no bytes after ten seconds, the UI offers an explicit compatibility download of the smaller copy. This cancels the idle native attempt, rechecks access, and prepares at most 100 MB in memory. The 500 MB original never uses that fallback.

The existing free GitHub Pages host is used. Total published source assets remain below its 1 GB site limit. Its soft monthly bandwidth allowance is 100 GB, so promote the 74.5 MB copy rather than the original. See https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits . Delivery speed still depends on the resident's connection and hosting limits.

## Regression

Run `npm test` and `npm run test:player`. The video tests cover encryption round trips, distinct keys, unsafe manifests, private session checks, logging, client-bound downloads, exact streamed bytes, Range, cancellation, locked initial UI, verification reuse and the original-file memory guard.

Before releasing, check the top card at 320/390/768/1024/1440 widths, email verification, preview playback, both downloads, cancellation and returned-file hashes. Test native download behaviour separately on physical Android/iPhone devices; desktop mocks do not prove mobile OS behaviour. Temporary setup helpers containing keys must be removed before creating the deployed Apps Script version.

## Public glimpse and transfer controls (release 4)
The 1.3 MB, 15-second glimpse is deliberately public at assets/navratri-2026-glimpse.mp4, loaded only on Play. Full-film keys still require the verified email and matching logged-in flat. Old encrypted previews remain for compatibility.

Both download sizes stream independently per browser/grant. Pause stops before the next chunk is delivered (one in-flight chunk may finish); Resume continues the same stream. Cancel aborts pending work, including a paused stream. The smaller compatibility buffer has the same preparation controls. Once data reaches the browser, its Downloads panel owns saving. Keep the tab open; pauses do not survive browser closure.

Each encrypted chunk uses up to five attempts, with 1/2/4/8-second backoff and a 45-second request timeout. Permanent HTTP client errors and authentication/decryption failures stop immediately. An extended outage still requires restarting; this is not persistent offline resume. Regression covers independent streams, owner-only pause/resume, exact resumed bytes, cancellation, and transient/permanent failures.

## Public community reactions and muted autoplay
The public glimpse starts muted when 35% visible. Reduced-motion and browser data-saving preferences keep Play manual. Browsers can still block autoplay; Play remains available. No full film is fetched automatically.

Like totals and the latest 50 approved comments are public through gallery-video-community. Reactions and comment submissions require the existing verified email/flat session. Likes are idempotent per verified email, stored under a secret-derived private reference, and updated under the script lock. Comments require explicit public-sharing consent, a stable request UUID, at most 300 characters, one-minute spacing and at most three per day. Every new comment is PENDING. There is no unreliable automatic profanity approval.

In the existing restricted gallery workbook, the committee reviews the **Video comments** tab. Change column D to exactly APPROVED to publish, or REJECTED to hide. Review content for insults, harassment, private details and targeting before approval. Public responses never include email, flat, token or private references; approved text uses textContent in the browser. Public results cache for 15 seconds; visitors can Refresh. **Video likes** stores the private reaction state. Both tabs are created on the first verified submission.

WhatsApp and Facebook open a share composer for the canonical public page. Instagram shows link-copy/Story instructions; More sharing options uses the device share sheet when supported. Shared links never include session tokens or private download grants. The site does not publish to social accounts automatically or combine their platform reaction totals.

Comment display names are entered explicitly and stored in column G only with publicNameConsent. The updated consent covers both name and comment. Both appear only after committee review. Older comments without this consent display “Resident”; private gallery names, emails and flats are never inferred for public display. Every approved comment uses the bundled robot SVG avatar, with no external avatar service.

Comments and the submission form are directly visible, without a details toggle. If there is more than one approved comment, only pinned comments show initially. View comments expands the list; Show pinned only collapses it. With no pins, the list waits behind View comments; a single comment remains visible. Committee members pin an approved comment by entering YES in column H (Pinned) of Video comments; clear the cell to unpin. Pending/rejected rows never appear even when pinned. Pins are retained ahead of recent unpinned comments within the 50-comment response limit. Refresh sees sheet changes after the 15-second public cache expires. The pin column is added automatically when the updated public service reads the existing sheet.

The video now has a community post frame: header above the player, reaction and share buttons directly below, comments alongside on desktop and below on mobile. The Comment action opens all available comments and focuses the name field. The private Video likes tab includes Name, Verified email and Flat in columns D–F, alongside current liked/unliked state and update time. Existing opaque references are backfilled only when matched to existing verified access records; unmatched identities stay blank. Public responses still contain only aggregate like totals.

Every new comment stores the verified session email in column I and session flat in column J of the restricted Video comments tab. These values come from gallerySession, never the public display name or a client-provided email. A token/flat mismatch is rejected before writing. Public JSON explicitly selects only name, text and pinned status. Historical comments keep blank audit fields where the original flat was not recorded; no historical residency is inferred. Flats remain self-reported at site login.
