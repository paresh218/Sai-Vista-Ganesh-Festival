# Sai Vista Navratri Songs

Upload folder: https://drive.google.com/drive/folders/1BkL8XO3KYJxPgAB2zyrKrbpZjIzJykma

Owner: saivistaculturalcommittee@gmail.com. Authorised uploader: shubhgore11@gmail.com (resident A-1302), Editor. Anyone with the link has Viewer access. Permissions were verified in Google Drive.

## Upload songs

1. Sign into Google Drive as shubhgore11@gmail.com.
2. Open the upload folder and select Day 1–9 (11–19 October 2026, following the existing website calendar).
3. Choose New → File upload. MP3 is recommended. Use names such as `01 Aarti.mp3`, `02 Garba.mp3` for playback order.
4. Open the website’s Navratri Songs section, select the same day, and choose Refresh songs.
5. Choose Play song and use the website player. Drive preview is available as a fallback.

Folder Editor access also allows organising and deleting files in this dedicated folder. All songs placed here are publicly viewable through the link. Audio format support, preview processing, download availability and traffic limits are controlled by Google Drive. Song files uploaded by Shubh can remain owned by his Google account.

## Service and maintenance

The read-only Apps Script service is deployed in the committee account:

- Project: https://script.google.com/u/1/home/projects/1cnIfqFxRnuqqTk9Ifu6P4xjwbSMAvQR_Y4djjIUSLagffGWtTTH-TCet/edit
- Service: https://script.google.com/macros/s/AKfycbwNKxnnqEyQTHjHB1oUI31q2UonlUsOGESO46kL9UZjc-Y51IUFRSEUF1DCrUrH9Liq/exec
- Execute as committee; audience Anyone; code has no upload/write endpoint.
- Source: navratri-songs.gs. Website settings: navratri-songs-config.js.

To change service code, update Code.gs in this project and Deploy → Manage deployments → Edit → New version. Preserve the endpoint URL. Folders are discovered automatically from the dedicated upload root, including nested folders (up to eight levels). Refresh songs after uploads or folder changes. Empty folders also appear in the chooser.

The service includes audio files and MP4 uploads, including the uploaded `1. pankhida .m4a.mp4`. Automated checks cover folder discovery, nested files, media filtering, ordering, resource keys, group boundaries and safe failures.

## Advanced player
The website uses browser Web Audio for bass, mid/vocals and treble (-12 to +12 dB), presets, volume, speed, seeking, shuffle, repeat and automatic next. Two audio decks keep the current song playing while the next loads, preload the upcoming song, and crossfade for 0–10 seconds (default 3). Changing folders preserves current playback. Device media controls are supported where available. The selected song loads completely before playing (up to 25 MB); long or unsupported files can use Drive preview. Downloads use the existing read-only Apps Script service, restricted to files discovered inside the dedicated upload root. This is intended for a small community, subject to Drive/Apps Script quotas. Slow loading can still cause a gap if the outgoing song ends first. Crossfade does not automatically match beats. No Python server, packages or paid streaming service are required.

The DJ player opens in a separate modal popup. Minimise keeps playback running; Stop playback ends it. Set cue / Go to cue remembers one position for the current track. Loop start / Loop end repeats the chosen segment; Clear loop cancels it. Resident entry remembers only the validated flat in localStorage on this browser. Change flat / forget this device clears it. Clearing browser data or using private browsing can require entry again. This remembers a self-reported flat, not a Google authentication session.

## On-demand DJ studio
Open advanced DJ studio inside the popup to load the extra controls. Load Deck B, analyse both decks (or enter BPM and Set beat here), then Sync B to A. Start manual mix enables the equal-power crossfader; Finish mix / Auto DJ releases the outgoing deck and returns to automatic playback. Waveforms support mouse/touch seeking and arrow keys. Three hot cues per track and BPM/grid corrections are saved on this browser. Beat loops support 4/8/16 beats. Pitch preservation uses the browser audio engine where supported. Sync adjusts tempo and beat phase against the analysed/corrected grid; it is not guaranteed to match the accuracy of a desktop DJ system.

Analysis runs sequentially in a worker, only when requested, and caches compact results. Limits: 25 MB and 12 minutes per analysed track; longer tracks can use manual BPM. PCM decoding can still use significant memory on phones. Match track loudness uses measured RMS with bounded gain and the existing output limiter. Filter, echo and reverb apply to the player mix. Recording captures the player output only, saves a local browser-compatible audio file and stops at 30 minutes or about 100 MB. Minimise keeps playback and recording running. Browser data clearing removes saved analysis/cues. No Mixxx source or third-party runtime is bundled.

The visible site checks for new uploads every 60 seconds and rechecks on focus or player opening (15-second minimum). It updates the selected playlist without stopping playback. Audio downloads are shared between duration calculation and playback in a session memory cache capped at 50 MB / six completed songs; next-track preloading continues. First-time downloads still depend on Drive/network speed.

All non-trashed uploaded files are listed, including MPEG and documents. The player checks browser MIME support before direct playback; unsupported files show Drive preview/open options and are skipped by automatic next-track selection and duration downloads. Drive preview itself depends on Google's format support; download/conversion may be needed.

MPEG-labeled files containing MP3 audio are detected from their ID3 / MPEG Layer III frame header and played as audio/mpeg without altering the Drive original. MPEG video containers still require audio conversion. Verified against the actual Yei Oh Vitthale upload: browser decoded 336.144 seconds and playback advanced.
