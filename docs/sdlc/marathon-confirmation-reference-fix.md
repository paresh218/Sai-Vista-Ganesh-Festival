# Marathon confirmation reference fix - 9 November 2026

The sender still required a 12-digit UTR after the registration form stopped requesting it. That sent otherwise approved screenshot-based entries to REVIEW before any email attempt. Remove the sender UTR requirement; retain payment Yes, receipt, exact race fee, valid recipient, locking, BIB allocation and SENT/SENDING/REVIEW duplicate protections. Existing reference values are preserved.

A new regression failed before the fix and passed afterward: screenshot-only approval sends once; historical reference formatting does not block approval. All 207 site tests passed. Recover an affected REVIEW record only after checking Sent and obtaining permission for the specific retry; no automatic bulk reset of review records.

Production: service version 7 deployed. After explicit owner permission and checking Sent for an existing confirmation, W23 was changed from REVIEW to QUEUED. The scheduled sender completed it as SENT with BIB 5012; the matching confirmation was verified in committee Sent. No bulk review-status reset was performed.
