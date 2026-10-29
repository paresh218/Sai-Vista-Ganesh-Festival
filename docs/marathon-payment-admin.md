# Marathon payment verification — committee guide

This uses a **private Google Sheet**, rather than an offline Excel file, so an edit can trigger email. Downloading/editing an Excel copy will not trigger messages. Screenshots are evidence, not confirmation of money received.

## Normal operation
1. Participant selects 3 km ₹149 or 5 km ₹199, pays `8149525915@ybl`, then submits a screenshot, 12-digit UTR and entry details.
2. Private sheet stores the entry and receipt link. Column **U — Payment verified?** starts blank. BIB and Email status also start blank. No initial confirmation email.
3. Check the actual credited payment in PhonePe/bank records, amount and unused UTR. Then select **Yes** in column U. Never verify solely from a screenshot.
4. An installed edit trigger queues confirmation; a five-minute sweep catches bulk edits and quota deferrals. Email is sent from `saivistaculturalcommittee@gmail.com`, with the allocated BIB and event schedule. Column W becomes SENT, column X records the time. No repeated email when Yes is selected again.
5. The website shows the optional WhatsApp group immediately after the entry is saved. This is separate from payment approval. Medical details, flat and emergency contact never appear in this email or the group link.

Use No or leave blank while awaiting payment. Do not change participant details while a confirmation is sending. If a wrong entry has already been confirmed, contact the participant; changing Yes to No does not recall email.

## Email recovery
SENT means MailApp accepted the message, not proof of inbox delivery. SENDING or REVIEW means uncertain outcome: inspect committee Sent mail first. If no message exists, change Email status to QUEUED; the existing BIB is reused. Never clear a BIB or blindly retry uncertain mail. Daily email quota is shared across the committee account; pending approved rows wait for quota without inventing success or using additional accounts to bypass limits.

## Activation checklist (requires release approval)
- Run `node tools/build-marathon-service.cjs`; import its Code.gs and appsscript.json into a **separate** committee-owned Apps Script project. Do not replace the gallery or old event registration service.
- Run `setupMarathonRegistration` as the committee account. It creates a private registration workbook and private proof folder, adds the Yes/No dropdown and installs edit + five-minute triggers. Existing historical sheets are untouched. Keep sharing Restricted, committee access only until explicitly authorised otherwise.
- Record the returned private workbook link for the user. Verify actual sharing, headers and receipt access. A copied URL is not a successful permission check.
- After approval, set script property MARATHON_REGISTRATION_ENABLED=true and deploy as committee owner. Client-facing web app accepts entry submission; there is no public approval, participant-list or proof-download action.
- Configure marathon-registration-config.js with that exact /exec endpoint and registrationEnabled=true. Check health readiness first. The client keeps the payment deep link and Submit disabled until readiness is confirmed.
- Perform a labelled synthetic end-to-end entry (no real payment), check blank U/no email, then mark Yes for the authorised committee test recipient. Verify a single BIB email, schedule, sender and private receipt access. Repeated Yes and sweep must not resend.
- Verify CORS/readback, retry handling and mobile UPI handoff. Do not execute a real payment during testing. If a code change is necessary, rerun regressions and refresh release approval for material changes.
- Publish the reviewed frontend only after the test passes. Verify regression/Pages jobs and live file identity.

## Privacy / limits
Contact, DOB, gender, blood group, emergency contact, optional medical note, transaction reference and receipt are private event-administration data. Minimise notes and receipt content. Google platform access controls/encryption apply; there is no separate application field encryption. The committee must review deletion after event administration and remove records/proofs within its agreed retention period; this change does not automatically delete live records. No sensitive form contents go to analytics or browser storage. Invalid MIME/signature, oversize receipts, missing evidence and duplicate UTRs are rejected. Signature checking does not establish that an image is a genuine receipt. Locking and idempotency are tested with service mocks, not a production load test.
# BIB update — 29 October 2026

New entries require **Name on the BIB**, stored in **AA**. Payment approval stays in **U**. After updating Apps Script, run `setupMarathonRegistration` once to append the new header safely. New BIBs use **3001–3999** for 3 km and **5001–5999** for 5 km, with separate persistent counters. Already-issued BIBs stay unchanged. The confirmation email includes the print name; older entries fall back to full name. Do not reset sequence properties. If a category fills its range, the email status becomes REVIEW without sending.
