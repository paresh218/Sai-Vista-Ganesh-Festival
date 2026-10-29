# Required marathon fields

Scope: registration form only. Reuse existing styling, native required semantics and shared browser/Apps Script validation. No changes to unrelated forms, issued BIBs, payment verification or saved records. No dependencies added.

| Requirement | Acceptance / control | Evidence | Status |
| --- | --- | --- | --- |
| R1 Required fields | All shown entry fields required; red star and explanatory text; native required semantics avoid colour-only communication | Form regression checks every input/select/textarea and marker | Passed |
| R2 Conditional details | Guardian and consent required only under 18; medical note required only for Yes. No/Prefer not to say supported without details | Visibility/required toggle tests; shared validation tests | Passed |
| R3 Visitor participation | Flat mandatory; outside friends/relatives enter Visitor; existing resident autofill retained | Native pattern and backend validation tests | Passed |
| R4 Regression | 154 site tests, 27 player tests; combined service syntax check | tmp/mandatory-full-tests.log, tmp/mandatory-player-tests.log | Passed |

User approved deployment on 29 October 2026 after verification. Candidate: 2026-10-29-marathon-required-fields-1, service-worker v165. Publishing must update both backend and frontend, version changed stylesheet/JS URLs and release/service-worker markers. Prior cached forms allowed blank flat/medical notes and will receive actionable validation errors; preserve retry details and ask users to reopen/reload if needed. No production registrations or emails created during development. Rollback must retain private records and issued BIB counters.

Browser verification: local preview at 1280 px desktop and 390 px mobile; dialog widths equal scroll widths (703/703 and 335/335), red marker rgb(180,35,24), native required flat and Visitor hint confirmed. Mobile screenshot: outputs/marathon-required-fields-mobile.png. No registration submitted.
