# Community redesign — Cobalt Spatial

Candidate: 2026-10-29-community-theme-2. Based on live f91986e. Target: https://saivistaculturalcommittee.in/ (GitHub Pages). Local preview: http://127.0.0.1:8926/?preview=cobalt.

Plan: requirements complete; design complete; implementation complete; verification complete within the scope below; approval pending; deployment/observation pending. Replaces rejected evergreen colours while preserving accepted local fonts.

| ID | Acceptance / control | Implementation / evidence | Status |
| --- | --- | --- | --- |
| R1 | Consistent professional colours across site | Cobalt/graphite tokens; home, marathon, video, gallery auth, finance, both archives, businesses, music reviewed | Pass |
| R2 | Lightweight spatial appearance | Static gradients/shadows; existing lazy Three.js scene and fallback retained; no extra render loop or runtime UI dependency | Pass |
| R3 | Responsive readable controls | 320/390/768/1024/1440px home/player checks; gallery and entry dialogs at 390px; finance amount clipping fixed; selected token contrast test | Pass within listed checks |
| R4 | Preserve navigation/private operations/payment lock | Anchors retained; More keyboard regression; Home native-anchor jump regression failed before fix and passed after; 5km preview remains disabled | Pass |
| R5 | Install requested 21st.dev tooling | CLI 1.18.0 dev dependency, official Codex plugin 0.5.0 installed; npm install audit reports zero vulnerabilities | Installed; account sign-in pending |
| R6 | Regression and player controls | npm test: 141/141; npm run test:player: 27/27; git diff --check clean | Pass |

## Design / security
UI/UX Pro Max spatial recommendation adapted for an ordinary accessible portal. Public 21st Modern Minimal token preview inspected: https://21st.dev/@serafimcloud/themes/modern-minimal. Darkened primary for AA white-text contrast. No claim that a catalogue component was installed: CLI search returned authentication required. No paid generation, account creation, private image upload or credential embedding. MCP installation requires a subsequent host reload/sign-in for authenticated use. Reference: https://21st.dev/mcp and https://github.com/21st-dev/codex-plugin.

ASVS 5.0.0 scope: unchanged auth/payment/storage/backend trust boundaries; dependency provenance. WCAG 2.2 AA target: tested palette pairs, keyboard More closure/focus, reduced motion and readable touch controls. This is not an exhaustive conformance or security audit. Existing warning/success and artwork colours retained. PWA theme metadata updated. SW v162, CSS v3, routing JS v9, theme JS v1.

21st deterministic review executed on index.html/community-theme.css/community-theme.js: 73 findings, 72 informational hardcoded-colour notices in the defining theme stylesheet and one existing dynamic external-form href placeholder. script.js assigns the actual form URL before opening its modal. No scanner assertions were weakened. Review is not a browser accessibility audit.

## Browser evidence — 29 October 2026
In-app Chromium browser, local Windows server. Homepage checked at 320, 390, 768, 1024, 1440px: document/hero no horizontal overflow. More menu and archive navigation exercised. Home jump corrected at source and tested. 5km form opens at ₹199, prefilled flat, disabled submission; 390px dialog scrollWidth equals clientWidth. Gallery auth dialog opens/closes with no OTP sent. Video download menu exposes both protected quality choices; no full download or comment post performed. Finance filter changed to wing B; amount cards now fit. Ganesh and Navratri archive plus businesses visited. No runtime console errors observed in checked session.

All five music views clicked at all five widths, no dialog horizontal overflow (288/358/720/966/1163px). Real permitted saved Pankhida track played: duration 9:09, current time advanced beyond seven seconds; seeking, pause/resume, minimise/reopen, expand and Stop exercised. Audio stopped afterward. No user playlists were reordered or cleared. Physical Android/iPhone, screen lock, OS sleep, disconnected offline playback and live YouTube Garba playback not tested this release. Existing automated integrations do not prove those device/provider behaviours.

Screenshots: outputs/community-cobalt-desktop.png and outputs/community-cobalt-mobile.png. Automated logs: tmp/community-theme-tests.log and tmp/community-theme-player.log. Theme CSS ~8 KB gzip; theme JS <1 KB gzip; two fonts ~83 KB raw. These are asset sizes, not measured end-user speed claims.

## Release gate / rollback
Live site untouched. SKILL.md requires explicit approval of this candidate and target immediately before deployment. No data migration or backend changes. Publish only reviewed feature files; exclude SKILL.md, old outputs and society-platform. Rollback to f91986e and restore earlier release/cache assets. After approval, verify GitHub regression/Pages jobs and deployed file hashes, then smoke-test live routes.
