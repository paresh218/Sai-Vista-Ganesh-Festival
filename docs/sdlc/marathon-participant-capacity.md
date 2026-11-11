# Marathon participant counts and capacity — 11 November 2026

Owner confirmed 200 total submitted participants across 3K and 5K, including payment-pending entries. Public readiness returns only aggregate race counts, total, limit and closure reason. No participant identities or payment details are published. Counts refresh every minute and when reopening a form or returning to the page; unavailable counts are never shown as zero.

The existing script lock protects an authoritative capacity check immediately before a new entry can create evidence or append a row. The 200th entry succeeds; the 201st fails without saving evidence. Existing request retries remain idempotent at capacity. The fixed deadline remains 15 November 00:00 IST (14 November inclusive), checked again inside the lock. All existing payment approval and email rules remain.

UI disables both payment buttons and submission when capacity or date closes registration, and rechecks availability each time a form opens. This does not reserve slots during external UPI payments; a person who paid before a concurrent final submission must contact Paresh rather than pay again. No payment gateway, reservation store or additional service was introduced.

Regression checks cover combined pending/verified counts, aggregate-only output, exact 199/200/201 boundary, retry at capacity, fixed deadline, per-race counters and both disabled payment links when full. Deployment and live counts are verified in chat without submitting a test participant or making a payment.
