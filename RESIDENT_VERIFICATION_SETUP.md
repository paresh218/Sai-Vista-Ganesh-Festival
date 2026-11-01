# Mandatory resident verification

## Current state

Backend version 14 was deployed on 1 November 2026 under the committee account, preserving the existing endpoint. The private resident reference property is configured. This release publishes the corresponding website gate. Existing flat-only browser records cannot unlock the new resident gate. Guests retain Continue as guest.

## Private sources

Email bindings come from the existing private `Gallery access` tab in the workbook selected by `GALLERY_BOOK_ID`. Email, Name and Flat remain columns A:C; Status (D) must be APPROVED. Do not replace these records with a public email list or import names into the website.

Names and flats are cross-checked in the supplied SV Details workbook, tab ID 0. Its verified layout is B: Owners Name, D: Wing, E: Flat Number. Set the private Script Property `RESIDENT_REFERENCE_BOOK_ID` to the ID from the sheet the owner provided. Give the executing committee account read access to that workbook. Do not change the reference sheet’s sharing to public.

The email must already be recorded for the exact same flat. The reference must contain that flat. Partial names and spouse/family names sharing a significant name token are accepted only within that established email/flat binding. This is a tolerant supporting-name check, not proof of legal ownership. Never move an email to a different flat based on a name search.

For an unrelated spouse name, changed surname, initials-only name or a genuine mismatch: the committee verifies the relationship privately, then adds G1 `Resident approval` and puts APPROVED in column G of that email’s existing Gallery access row. REVOKED in G blocks resident access. No response exposes the directory or owner name. A resident missing from the existing email list must contact the committee; public forms cannot create or rewrite an authorized email/flat binding once the reference property is configured.

## OTP and remembered access

The gate calls gallery-resident-otp, checks the existing mapping and reference, and reuses the existing committee Gmail sender, ten-minute OTP, five-attempt cap, resend delay and send budgets. Correct codes create a server-side session tagged residentVerified. Ordinary legacy gallery tokens and saved flat numbers cannot satisfy gallery-resident-status.

Verified access persists for 90 days on the same browser in saiVistaResidentSession; the same session is shared with the private gallery to avoid a second email/OTP prompt. Every return visit checks the saved session with the server before revealing resident sections. Expiry, revocation, changed directory records or an unavailable server keep the visitor in guest mode. Clearing browser data, forgetting the device or using another browser requires verification again. If storage is blocked, access works only for the current visit and shows that limitation. Never save an OTP in browser storage.

The reference check also applies to gallery requests and old gallery OTP routes when RESIDENT_REFERENCE_BOOK_ID is configured, preventing the older route from rebinding an email to another flat. Existing verified sessions must pass the current directory check.

## Deployment

1. Back up the current Apps Script version and private sheet. Verify email/flat bindings; old gallery flats were originally self-reported. Resolve conflicting or stale records before enabling mandatory verification.
2. Build with `node tools/build-resident-service.cjs`. Deploy its Code.gs and appsscript.json to the existing gallery Apps Script project as the committee sender. Keep the same endpoint by updating its deployment version.
3. Configure RESIDENT_REFERENCE_BOOK_ID privately, then verify the committee account can read tab ID 0 and the expected columns. The source sheet is read-only; the service never edits it.
4. Using one owner-authorized test resident, check real code delivery, wrong code, matching flat, wrong flat, return visit without another code, revocation and shared gallery access. These actions send real email; automated tests do not.
5. Publish the website only after backend checks succeed. Check the Pages job, live release/cache marker, versioned assets, initial popup and guest restrictions. Keep unrelated local files out of commits.

## Access boundary

The gate now verifies residency against the existing approved email/flat records plus the reference. This does not add authentication to the separate legacy collection/expense endpoints: those endpoints were publicly callable before this change. Confidential financial data requires server-side authorization there too; hiding the section alone cannot make that data private.

## Verification

Automated: 180 site tests and 27 player tests passed. New tests cover existing/missing email bindings, wrong flat, partial/family names, private approval, revocation during OTP, refusal to rebind through old gallery routes, old-token rejection, session restoration, wrong OTP, late responses after guest selection blocked browser storage and shared sign-out.

Browser checks at 320, 390, 768, 1024 and 1440 CSS pixels confirmed the initial flat/email popup, visible guest option and no page horizontal overflow. Guest selection kept accounts hidden. Temporary viewport override was reset. No live OTP email was sent. Backend deployment was verified as version 14. An unregistered test email was rejected by the live endpoint without sending mail. The private readiness check found 67 approved email profiles: 41 matched the resident reference and 26 need committee review. A complete live OTP/session round trip, physical-phone playback and OS sleep checks have not been performed.

Verified visit logging now derives identity server-side and updates the existing email row’s H:J metadata. See VISITOR_LOG_SETUP.md for the private workbook layout and deployment.
