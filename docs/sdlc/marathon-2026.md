# Sai Vista Marathon 2026 — release candidate

Plan: requirements → design → implementation → tests/browser review → approval → deployment.
Scope: replace tentative interest promotion with confirmed event details and an entry-form preview. Payment stays a placeholder by user instruction. Preserve historical interest responses and festival/video/player features.

| Requirement | Acceptance / control | Implementation | Evidence / status |
| --- | --- | --- | --- |
| R1 | 29 Nov 2026, 6 AM, Sai Vista Multipurpose Court; starts/ends at society; route soon; closes 26 Nov IST | Homepage banner, calendar, event details | Pass: automated and local browser review |
| R2 | 3 km ₹149 / 5 km ₹199, ages 12+, T-shirt/medal/breakfast/e-certificate | Race cards and poster | Pass: automated and local browser review |
| R3 | Accessible responsive form; name, DOB, email, mobile, emergency contact, blood group, shirt size; guardian consent under 18 | Dialog and shared validation | Pass: automated and local browser review |
| R4 | No payment collection, submission, fake confirmation or BIB without verified payment | Frontend disabled; backend fails closed; no configured endpoint | Pass: automated and local browser review |
| R5 | Future verified-payment registration issues unique BIB and committee email; concurrent/retry safety | Standalone service, lock, private verified-payment ledger, email retry queue | Automated service tests pass; live integration deferred |
| R6 | Motion installed locally; reduced motion; no unlicensed animation | Vendored Motion + supplied poster | Pass: automated and local browser review |

Data: contact and emergency details/blood group are private; no browser persistence or analytics of form contents. Store only when final submission is enabled. Proposed deletion: 90 days after event, committee to confirm before activation. No medical diagnosis is requested. Flat is self-reported. ASVS 5.0.0 risk framework: input validation, server authorization, sensitive data minimisation, rate limiting and concurrency; this is not a conformance claim.

Payment contract: only a future authenticated provider adapter may insert verified payments. Browser fields, QR scans, transaction references and redirects are never proof of payment. No such adapter is implemented in this placeholder release.

Release: local candidate only. `SKILL.md` requires explicit candidate approval immediately before deployment. Rollback: restore previous HTML/assets/cache marker; existing interest sheets remain untouched. No live data migration required. Payment/email live tests are blocked until provider decision, committee service configuration and activation approval.

## Verification — 28 October 2026

- `npm test`: 129 passed, 0 failed. `npm run test:player`: 27 passed, 0 failed.
- Regression update: old first-section video assertion now expects video after the new two marathon sections; public preview and protected-download checks remain intact. Retired interest-popup tests were replaced with entry-preview tests; historical backend interest tests remain.
- Actual local in-app browser: desktop 1440×1000, tablet 768×1024, phones 390×844 and 320×740. Banner/form stay within viewport. Close is 44px. Distance/fee, remembered flat, minor/guardian fields and Escape closure checked. No captured browser errors.
- Screenshots: `outputs/marathon-entry-desktop.png`, `outputs/marathon-entry-mobile.png`, `outputs/marathon-entry-form-mobile.png`.
- No live payment, email, load test, physical-phone, OS sleep or YouTube playback check. Payment/email service tests use mocks. No production changes or migration performed.
- Motion and poster add about 286 KB to initial uncompressed assets (176,646 + 109,144 bytes), with deferred JS and a lazy full poster. No measured network-speed claim.
- Approval/deploy/observe: pending. Candidate release marker `2026-10-28-marathon-entry-preview-1`; SW cache v158. Public preview only; server remains undeployed.
