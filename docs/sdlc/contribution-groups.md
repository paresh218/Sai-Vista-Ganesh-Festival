# Separate resident and other contributions

Plan: inspect public feed → partition society-flat records from other contributions → reuse existing cards/tables and filters → test totals, flat counts, escaping and responsive layout. No backend or spreadsheet edits, dependencies or new public data.

| Requirement | Acceptance / control | Evidence | Status |
| --- | --- | --- | --- |
| R1 Resident grouping | Only A–F, floors 1–13, units 01–04 belong to resident charts. Recognized owner/tenant suffixes retained. Duplicate records count once per flat; all records remain visible | payment-dashboard.test.cjs | Passed |
| R2 Other group | Separate donor/surplus/other section with original source group labels and received total | Synthetic feed tests and public feed inspection | Passed |
| R3 Accounting | Overall received = received resident entries + received other entries; only Yes counts. Resident pending excludes other collections. Unknown/missing flats are not invented as unpaid | Reconciliation and empty-source tests | Passed |
| R4 Preserve UI | Existing wing/status/sort controls and detail expansion work; output escaped; mobile widths checked | Regression suite and local browser | Passed |

Source inspection: existing feed contains sponsorship, previous-year Ganpati/Holi surplus, Aarti collections and stall fees alongside residents. Some society flats are absent; B-101 also has a separate Tenant row. Charts count a flat as paid only when every recorded entry for that flat is paid. Recorded-flat percentage excludes missing records. The 312-flat society capacity is explanatory, not a claim of 312 source rows. Do not infer how much of a resident's payment is a donation without an explicit source entry/category.

Publication approved by user on 29 October 2026 after verification. No live spreadsheet records changed. Deployment requires release/cache markers and versioned script URL after approval. Rollback is the prior frontend assets; source and expenses remain unchanged.

Verification: 158 site tests and 27 player tests passed. Real public feed reconciles resident received 605003 + other received 54761 = overall 659764; 306 resident records represent 305 distinct flats, plus 20 other records. Desktop at 1096 px and mobile at 390 px showed no page or donor-card horizontal overflow (mobile card 299/299 px). Existing internal table scrolling retained. Browser screenshots are outputs/contribution-groups-desktop.png and outputs/contribution-groups-mobile.png. Candidate version markers: contribution-groups-1, script v25, service-worker v166. No deployment or source-sheet mutation performed.

User added a sponsorship summary block during approved publication. The second card shows received SPONSORSHIP entries only, already included once in overall receipts; surplus/Aarti/stall fees are excluded from this card. Regression initially failed on missing card, then passed after implementation. Final candidate: contribution-groups-2, script v26, theme CSS v5, service-worker v167.

Correction requested after publication: rename the second card to Surplus received and use all received non-flat contributions, rather than SPONSORSHIP alone. Reuse otherReceived, so the card agrees with the separate-group total and the overall amount stays unchanged. Synthetic regression expects 6100 including sponsorship, carry-forward surplus and Aarti, excluding pending stall fees and resident/tenant payments; this assertion failed before the correction. Correction verified: 158 site tests and 27 player tests passed. User approved publication. Final candidate: contribution-groups-3, script v27, service-worker v168.
