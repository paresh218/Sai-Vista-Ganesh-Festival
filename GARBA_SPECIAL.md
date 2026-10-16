# Garba Special integration

## Analysis and chosen approach

The reference uses plain JavaScript modules, a canvas scene, a JSON catalogue, and the YouTube iframe API. Its hidden video player requests low quality; it does not provide downloaded audio, an offline music library, or guaranteed buffering-free playback. Its progress indicator interpolates between YouTube time samples.

Reuse Sai Vista's existing two-deck player, IndexedDB audio storage, crossfades, equalizers, cue/loop tools, and service worker. A Garba Special panel adds eight collections and 88 song entries, with search, next, shuffle, original YouTube links, and a visible YouTube player. The catalogue is a local snapshot from https://garba.pycnavratri.com/tracks.json on 16 October 2026, with source attribution; it does not depend on that site remaining online. YouTube availability and individual embedding restrictions still apply.

## Use

Open DJ player → Garba Special → pick a collection and song for online listening. The embedded video's controls handle playback and volume. YouTube audio does not pass through the DJ sound processing or crossfade system.

For full DJ features offline, import audio files you are permitted to use, then choose **Open saved Garba in DJ player**. Multiple files can be imported together, up to 50 MB per file. Files are stored immediately on that browser/device; matching file contents are deduplicated. The saved collection also appears in the playlist selector. Existing Drive playlists retain their Save playlist function.

The app must first be loaded online and its service worker installed to reopen the page offline. Imported audio stays on this device; it is not uploaded or shared with other residents. Browser storage can be cleared or evicted, so retain original files. HTTPS or localhost is required for the browser storage and hashing features.

Saving every reference song offline requires corresponding permitted audio files. The YouTube embed supplies no offline audio download API. This integration does not extract YouTube audio.

## Verification

Seven automated test files cover the new catalogue and controls, automatic next, online/DJ handoff, offline messaging, imports and duplicate detection, offline DJ playback without network requests, refresh preservation, existing deck transitions, sound controls, decoding, storage, cue and loops. Live visual and real YouTube playback verification remain outstanding: the available inspection browser timed out on both the public site and the local preview. No deployment was performed.


## Modern player and full DJ audio matching

The player now uses Daily songs, Garba Special, Sound, DJ studio and Offline views. Main transport controls route to active online Garba: play/pause, next/previous, seek, volume/mute, supported playback rates, shuffle, repeat-one, cue points and timed loops. Online audio cannot be processed by the local EQ, analyser, effects or recorder.

Use my audio beside a Garba track imports a permitted audio file into IndexedDB and remembers the association on this browser. Choosing that track subsequently loads its saved audio into the existing DJ engine, including offline. All existing DJ capabilities then apply, with their existing file size, format and analysis limits. Uploaded/imported files are not obtained from YouTube.

The deployment includes automated tests for shared transport routing and linked-audio handoff. Visual browser verification remains outstanding; the user explicitly requested deployment with that limitation.
