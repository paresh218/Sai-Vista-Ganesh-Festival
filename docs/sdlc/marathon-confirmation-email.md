# Rich participant confirmation

Plan: reuse the approved invitation theme → add a pure HTML renderer alongside existing plain text → add htmlBody to the existing MailApp call → verify personalized output and unchanged trigger/retry behavior → preview with synthetic data.

| Requirement | Acceptance / control | Evidence | Status |
| --- | --- | --- | --- |
| R1 Rich confirmation | Personalized BIB/name/distance/paid amount, poster, seven schedule rows for selected distance | marathon-entry.test.cjs HTML test | Passed |
| R2 Useful actions | Calendar, WhatsApp updates group, prefilled optional acknowledgement and public WhatsApp invitation | Parsed DOM links and preview | Passed |
| R3 Preserve processing | Same Yes-only edit trigger, five-minute sweep, locks, quotas, BIB allocation, SENT/SENDING/REVIEW behavior and recipient | Existing regressions; only htmlBody added to send call | Passed |
| R4 Privacy | Escape participant text. Exclude medical, blood group, emergency and flat details. Plain text retained; no extra recipients, permissions or tracking | Regression assertions, source diff | Passed |

Poster uses the existing public HTTPS image; email clients may hide remote images. BIB and schedule remain readable without it. Acknowledgement opens a reply and requires Send; it is optional and has no effect on confirmation. Already SENT participants are not automatically re-emailed.

User approved activation on 29 October 2026. Approved source saved in the existing committee project and read back byte-for-byte (normalized newlines). No live participant email test performed. Activate by updating committee Apps Script source only after release approval; existing installed triggers execute current saved source, so saving is itself activation for those triggers. Versioning the web app alone does not control installed-trigger code. Rollback: restore prior service source while retaining sheet, status and BIB sequence properties. No frontend release or service-worker changes required.

Final verification: 159 site tests and 27 player tests passed; combined Apps Script bundle syntax checked. Standalone synthetic HTML preview checked on desktop and 390 px mobile with no horizontal overflow; UTF-8 text and poster load verified. Preview file: outputs/marathon-confirmation-email-review.html. Screenshot: outputs/marathon-confirmation-email-mobile.png. No actual Gmail/Outlook/mobile-client delivery test yet.
