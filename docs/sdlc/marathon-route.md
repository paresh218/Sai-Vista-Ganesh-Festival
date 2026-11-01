# Marathon route — 1 November 2026

Scope: use the latest supplied `12.jpeg`, not the superseded route image. Add an animated 3 km/5 km course and a normal image, preserving the site theme and existing memories section order.

| Requirement | Acceptance / control | Implementation | Evidence | Status |
| --- | --- | --- | --- | --- |
| R1 | Latest image, original pixels and attribution retained | Local JPEG, SHA-256 d50ef91e565d289a734ca597875d67954313f2b28e551d3f094f629bc13a0daa | Asset regression | Pass |
| R2 | Distance choice follows outward and return course; turnaround 1.5 km / 2.5 km | SVG overlay traced in supplied image coordinates; approximate illustration, not navigation | Route selection and completion tests; browser controls checked | Pass |
| R3 | Normal image visible, full-size open and download available | Original image below animation; native links work without JavaScript | DOM and browser image-load checks | Pass |
| R4 | Mobile reflow, keyboard native controls, reduced motion, pause/replay; stop offscreen / hidden | Existing theme tokens; viewport observer and document visibility; no external runtime library | Mobile 390 × 844 / default desktop; mocked reduced motion and offscreen tests | Pass |
| R5 | Preserve neighbouring behaviour and prepare release | News route text updated; site-data v6; site release 2026-11-01-marathon-route-1; service worker v169 | Full site and player suites | Pass |

Plan: requirements/design complete; implementation complete; verification complete; deployment pending explicit approval. Rollback: restore the prior HTML, site-data and worker files, remove route assets, then publish a newer worker marker.

Skill: installed and read `iart-ai/map-animation-skills`, `skills/map-animation/SKILL.md` v0.1.0. Applied its web SVG overlay, path draw-on, travelling marker and 12 fps graphic cadence. This is an interactive web feature, not an MP4/Remotion deliverable. No Earth Studio, tiles, geocoding, new paid service or runtime package. 21st catalog search unavailable without login; reused the existing design system.

Security: static public map provided for publication; no new data collection, upload, authentication or backend changes. No geolocation permission; no location tracking. Applicable ASVS boundary: static local assets, no new untrusted inputs or API. Original Google attribution is retained. Existing registration and payment logic unchanged.

Verification: latest image is 900 × 1600, 158,467 bytes. All route-specific tests pass. Full regression passed after an initial sandbox-only Sharp temporary-file rename restriction; rerun with normal temporary-file access passed. Player suite passed. `21st review marathon-route.js marathon-route.css`: zero findings. Browser checked route switching, pause, replay, both images loaded, original expanded and no horizontal page overflow at 390 px. No physical phone, assistive-technology or exhaustive browser matrix tested. Screenshots: `outputs/marathon-route-desktop.png`, `outputs/marathon-route-mobile.png`. Animation geometry is traced from the supplied image, not surveyed GPS data.

Release gate: obtain approval of this candidate for https://saivistaculturalcommittee.in/ before production publication; live environment unchanged.
