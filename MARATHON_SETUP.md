# Marathon entry preview — payment deferred

This release does not collect money or accept entries. The form sends no data and stores no personal data in browser storage. Existing interest sheets remain intact. The payment QR is deliberately not displayed until payment collection is enabled, to avoid untracked payments.

## What is ready

- Poster-based responsive event banner, 3 km / 5 km form, emergency details, blood group, shirt size, age and guardian validation, calendar download.
- Local pinned Motion 14.7.1 with its MIT licence, a short reveal, and reduced-motion support. UI/UX Pro Max was already installed; its local guidance was used.
- Standalone Apps Script registration service, private row storage, unique sequential BIB allocation under a script lock, request idempotency, payment binding and a committee-sender email queue. It is not deployed or connected.
- No Pikbest media: the requested page/licence could not be verified. Use only after obtaining the appropriate licence. Supplied poster is used instead.

## Activation work, deliberately deferred

1. Choose payment provider and finish merchant KYC. Build and test a server adapter that validates provider signatures and queries authoritative paid status, amount, INR currency and order ownership. A frontend callback, UTR or screenshot is insufficient.
2. Create an unpredictable payment token. Store only its SHA-256-keyed record in the private Script Properties: `MARATHON_VERIFIED_<sha256(token)>` with `{status:'PAID',email,race,amountPaise,currency:'INR',reference,expires,usedBy:''}`. Never expose this writer as a public action. Adapter must deduplicate provider events. `expires` is epoch milliseconds. Bind the verified payer email to the order. This adapter does not exist yet.
3. Under **saivistaculturalcommittee@gmail.com**, create a separate Apps Script project containing `marathon-model.js` followed by `marathon-entry-service.gs`. Set `MARATHON_SPREADSHEET_ID` to a restricted committee-owned workbook. Do not reuse an unrelated service deployment. Review private data retention with committee (proposed 90 days after event).
4. Keep `MARATHON_PAYMENTS_ENABLED` absent until sandbox payment, idempotency, concurrency, quota/failure recovery and real committee email tests pass. The account's actual email quota applies; do not split apps to evade it. Add a time-driven trigger for `sendMarathonConfirmationEmails` on activation. If a crash leaves `SENDING`, reconcile delivery before retrying. No exactly-once email-delivery claim is made.
5. Implement the browser checkout and entry submission after server payment success, then update the readiness endpoint and frontend. Current frontend is intentionally hard-disabled even if config is changed. Personal information must not be put in analytics, URLs or local storage. Do not enable payment by changing one flag.
6. Obtain release approval, deploy the reviewed candidate, and verify deployed assets and Pages job. Confirm a real provider payment only with explicit authorization for any charge.

## Data locations after activation

`Marathon entries 2026` in the configured restricted workbook: BIB, participant/contact details, emergency contact, blood group, consent, private payment reference and email queue status. Nothing is stored there by the current preview. BIB numbers are emailed; a printable race-bib design is not included.
