# Marathon 3D — society lawn revision

Candidate: `2026-10-29-marathon-3d-2`, service-worker v160. Local preview only; deployment requires approval under `SKILL.md`. Supersedes the rejected shoe/podium concept.

## Scope and design

Four original stylised adult runners in Sai Vista Marathon jerseys, shorts and trainers, informed by broad hairstyle/glasses/beard cues in the supplied group photos. No exact facial-replica claim. Oversized display shoe removed. Society balcony towers, rectangular green lawn, planted walkway, bollard lamps, START arch, checkered start line, waving flags and a small medal replace the generic floating scene. These are artistic approximations, not a surveyed layout or confirmed route.

References actually inspected: user-supplied Google-hosted nighttime courtyard photograph (white projecting balconies, lawn, planted paving, warm lamps); public NoBroker Sai Vista facade image; text of SSD Sai Vista brochure. Brochure screenshot fetch failed. No external photograph is redistributed or used as a runtime texture. Source photos remain in Downloads / on their original host. Runtime fetches no third-party assets or personal data.

Keep existing date, prices, payment-disabled entry preview and event information. Payment/backend/production sheets are outside this revision. Rendering is progressive: original poster remains for reduced motion, data saving, 2G, low memory, unavailable WebGL, module failure and context loss. One 30 fps loop; caps pixel ratio; pauses on hidden/offscreen/manual pause/open dialog. GPU resources disposed on exit/failure. Local pinned Three.js bundle and MIT licence; no paid service.

| ID | Acceptance | Evidence |
| --- | --- | --- |
| R1 | No display shoe; society lawn, balcony buildings and START flags; four jersey-clad runners | Scene regression and local browser screenshots |
| R2 | Finite animated geometry; waves/running gait; one loop, pause and cleanup | `marathon-3d.test.cjs` |
| R3 | Safe low-resource/reduced-motion fallback; lazy bundle under 200 KB gzip | Automated preference/network/WebGL tests; bundle size check |
| R4 | No overflow at 320, 390, 768, 1440; no headline/building overlap; 44px pause | Actual local in-app browser |
| R5 | Existing form/paid-access/player features preserved | Full site and player regressions |

## Verification — 29 October 2026 IST

- `npm run build:marathon-3d`: succeeds; self-hosted versioned production bundle; excluded from eager service-worker cache.
- `npm test`: 136 passed, zero failed. `npm run test:player`: 27 passed, zero failed.
- Actual local browser: 320×740, 390×844, 768×1024, 1440×1000. Scene renders, pause works, no horizontal overflow. Headline and art occupy separate regions. Original Windows Python `.mjs` MIME issue remains avoided by using `.js` bundle output.
- Screenshots: `outputs/marathon-society-lawn-desktop.png`, `outputs/marathon-society-lawn-mobile.png`.
- Automated fallbacks/context-loss tests and mocked rendering lifecycle do not establish physical-phone battery use, GPU frame rate on every device, OS sleep or screen-reader conformance.
- No new authentication/data inputs; existing validation and payment guard remain. ASVS 5.0.0 framework scope is dependency provenance, failure isolation and unchanged trust boundaries; no certification claim.

## Release

Pending explicit approval of this candidate for the existing GitHub Pages site. No production writes or migration. Rollback: restore previously published homepage assets/cache marker. After approval, run/verify Pages and regression workflows and compare live files, then perform a live form/payment-disabled smoke check. Keep unrelated local files and reference photos out of commits.
