# Music player regression checklist

Run `npm ci` once, then `npm run test:player`. Before publishing run `npm test` too.

`Player regression` runs automatically on every GitHub push and pull request. This check does not change the independent GitHub Pages deployment settings; tests must pass locally before publishing. Add a regression test whenever fixing a player bug. `AGENTS.md` makes this mandatory for future player work in this project.

## Automated coverage

| Area | Required behaviour | Tests |
| --- | --- | --- |
| Complete interface | All five views retain existing controls; repeated expand/compact preserves theme; minimise/reopen works with and without a track | `player-integration`, `song-popup`, `song-mini` |
| Local transport | Play/pause, next/previous, seeking, volume/mute, speed, shuffle, repeat, automatic next, reordering and search | `navratri-player`, `player-integration` |
| Audio delivery | Chunked/base64 decode, invalid downloads, limits, unsupported formats and failed refresh recovery | `song-download`, `navratri-songs`, `navratri-player` |
| Deck reliability | Preloading, two-deck overlap, manual crossfader, failed replacement, cancellation and cache eviction | `dj-decks`, `deck-b-reliability`, `player-integration` |
| DJ sound | EQ presets/reset, BPM estimates, phase sync, loops, gain limits, effects routing and recording lifecycle | `dj-studio`, `player-integration` |
| Online Garba | Eight collections/88 catalogue entries, search, rapid selection, next, shared controls, supported speeds, media-session actions and local audio association | `garba-special`, `garba-dj-controls`, `player-integration` |
| Source handoff | Online progress survives events from paused local audio; Stop clears controls; manual DJ start pauses online Garba | `player-integration` |
| Offline | Stored version lookup, clear, blocked storage recovery, imports/deduplication, missing files and local playback without network requests | `song-offline`, `navratri-player`, `player-integration` |
| Tonight | Correct day, saved order, shuffle/repeat reset, exact readiness counts and missing-song list | `music-evening`, `navratri-player`, `player-integration` |
| Visuals/background | Spectrum active for local audio; visuals stop when hidden/paused without pausing audio; minimisation and media controls | `player-integration`, `song-mini`, `navratri-player` |
| App updates | Syntax checks, service-worker freshness, offline fallback and reload-loop prevention | `test-player.cjs`, `site-updates` |

The complete-interface tests run the actual HTML and production player scripts together in jsdom. Audio devices, Web Audio, YouTube, recording, network and storage are simulated there; separate tests exercise decoder/worker logic and storage callbacks. They do not prove real decoding, audible output, YouTube availability, OS media-session support, or physical-device background playback.

## Browser/device checks after relevant changes

1. At 320, 390, 768, 1024 and 1440 CSS pixels: verify no horizontal overflow; check all views, open menus, long song names, visible Move to labels, 44px touch targets, expand/compact and mini-player. When an update is available, ensure its notice stays above the mini-player and does not intercept its buttons. Reset temporary viewport overrides afterward.
2. In a browser, play a permitted saved audio file. Confirm elapsed time increases, seeking changes position, pause/resume works, spectrum reacts, minimise retains sound, and reopening retains controls. Stop audio after testing; preserve the user's playlist selection/order.
3. Play an online Garba song. Confirm progress and controls, next/repeat, and switching to local/manual playback without overlapping sources. Record video/region/network errors as external limitations; do not silently mark unavailable playback as passed.
4. Save a test playlist, disconnect the network, reopen, and play saved files. Confirm missing files and blocked/quota-limited storage show honest feedback. Do not delete the user's saved music for a test.
5. Check Android Chrome and iPhone Safari on physical devices: screen lock, app switching, media controls, interruptions and resuming. On a laptop test window minimisation and screen lock separately from actual sleep. A website cannot guarantee playback during OS sleep or when its browser is suspended.
6. Verify the GitHub regression job, GitHub Pages deployment, live release marker, changed scripts and versioned stylesheet.

## Fixes discovered by the new full-interface suite

- Paused local audio was able to overwrite online Garba's progress. Local progress updates now yield while online Garba owns playback.
- Online Stop could leave the main controls stale. It now resets the shared local player as well.
- Starting an unbound/staged local deck could leave online Garba playing simultaneously. Any real local audio `play` event now transfers media-control ownership and pauses Garba.

These scenarios have permanent automated regression tests.

The live browser audit also found and fixed narrow-screen file-picker overflow and overlap between the site-update notice and mini-player controls.

## Live browser audit (16 October 2026)

- Actual saved audio decoded and played; elapsed time advanced and live spectrum activated.
- Mini-player pause/resume and reopening succeeded after separating the update notice.
- All five views were inspected at 320, 390, 768, 1024 and 1440 CSS pixels; the single Offline overflow at 320px was fixed and retested with no overflow.
- The catalogue's first track used the user's associated saved audio successfully. One unlinked online track did not start; this is not counted as a playback pass. The embed viewport was corrected to YouTube's documented 200px minimum while remaining off screen, and autoplay blocking now has explicit feedback.
- Actual phone lock, OS sleep, live provider availability, and every browser/device combination remain unverified. Automated tests simulate these integrations; they do not remove external restrictions.
