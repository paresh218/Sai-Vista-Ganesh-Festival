# Marathon BIB name and short numbers

Scope: required print name in the existing registration form, private sheet persistence, confirmation email and separate four-digit category sequences. No live records changed or emails sent during implementation.

Plan: reuse shared validation and FormData submission → append column AA without moving existing columns → allocate under the existing script lock → preserve issued BIBs → run focused and full regression checks. No new dependencies or theme changes.

| Requirement | Acceptance / control | Evidence | Status |
| --- | --- | --- | --- |
| R1 Print name | Required 1–30 characters, no controls; trimmed and spreadsheet formula-safe; included in digest and email | marathon-entry.test.cjs validation, browser payload, storage/email and retry tests | Passed |
| R2 Short BIBs | New 3K starts 3001, 5K starts 5001; independent persistent counters; scan existing numeric BIBs; lock protects allocation | Allocation, retry, collision and 3999 exhaustion tests | Passed |
| R3 Preserve records | Keep column U approval, V BIB, W email status. Append AA. Setup refuses unknown headers. Issued legacy BIBs remain valid; old rows use full name in email | Idempotent append/migration and issued-number tests | Passed |
| R4 Regression | Existing flows continue; syntax-check combined Apps Script | Focused 19, full site 152, player 27 tests passed; combined service syntax check passed | Passed |

User approved publication on 29 October 2026. Release candidate: 2026-10-29-marathon-bib-name-1, service-worker v164, model v3. Backend version 3 deployed to the existing committee-owned endpoint. Before completing publication: update Apps Script source, run setupMarathonRegistration to append the AA header, deploy a new service version and publish the matching frontend; increment release/service-worker markers and version model script URLs. Verify an approved labelled test, spreadsheet persistence and email before opening normal traffic. Rollout compatibility: backend accepts the previous sheet header until AA is appended under setup/save lock, and cached old forms default to the full name (first 30 characters). Legacy request digests remain valid for exact retries; new forms require the explicit print name. No issued BIB renumbering or resend is authorized here.

Each category supports 999 new four-digit numbers (3001–3999 / 5001–5999). Exhaustion marks REVIEW and sends no confirmation. Recovery preserves issued numbers and counters. Rollback must preserve the added AA column/data rather than removing it; old service code expects 26 headers and needs compatibility handling before reuse.

Verification: full site suite first encountered a sandbox EPERM on an unrelated Sharp temporary-file rename; rerun with appropriate filesystem access passed. UI field/payload verified in JSDOM; no real desktop/mobile browser or live spreadsheet/email test was performed for this candidate.
