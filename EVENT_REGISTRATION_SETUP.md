# Festival registration: Google Sheets setup

The website has 11 event forms. All entries go into one private Google spreadsheet, with separate tabs: Bollywood Night, Drawing, Talent Show, Treasure Hunt, Rangoli, Pooja Thali, Fun n Fair, Fancy Dress, No Stove Cooking, Satyanarayan Pooja and Mahaprasad. A Children Gifts tab helps coordinate one gift per child across competitions.

## Deploy

1. Create a Google spreadsheet (or use your existing festival spreadsheet). Copy its ID from the URL between `/d/` and `/edit`.
2. Create a **new, separate Apps Script project** at script.google.com. Do not replace the existing Aarti, accounts or visitor-counter project: they use their own doGet/doPost handlers.
3. Paste the complete contents of `event-registration.gs` into Code.gs. This is self-contained; do not paste event-registration-model.js separately.
4. In Project Settings > Script Properties, add:
   - `SPREADSHEET_ID`: the spreadsheet ID.
   - `DRAWING_MAX_AGE`: `18` provisionally, or `16` once confirmed. Default is 18 because the detailed supplied guidelines say 13–18.
   - `FANCY_DRESS_DEADLINE`: the actual committee-approved ISO timestamp, including `+05:30`. Without this, Fancy Dress submissions stay closed. The server also enforces the deadline.
   - `TALENT_MUSIC_URL`: the designated HTTPS audio-upload link, when available. Without it, the form asks participants to contact Priyank. Audio is not uploaded through this website or stored by this script.
5. Run `setupEventRegistration` in the editor and authorize spreadsheet access. It creates the tabs without deleting existing entries. Use empty tabs with these names; existing tab headers must match the script.
6. Deploy > New deployment > Web app. Execute as **Me** and allow access to **Anyone** so residents do not need a Google account to submit. Keep the spreadsheet itself private. Copy the deployed URL ending in `/exec`.
7. Paste that URL into `endpoint` in `event-registration-config.js` in this website. Do not use the existing Aarti URL.
8. Refresh localhost and make a clearly labelled test entry. Check its event tab, then check the WhatsApp link. Repeat for each form before publishing. Remove test rows manually when finished.
9. After future Apps Script changes, use Manage deployments > Edit > New version > Deploy. Publish the updated website files together when ready.

## WhatsApp

Only after Google Sheets confirms a save, a prefilled WhatsApp link appears for Priyank (+91 76219 40889), including the registration reference and submitted details. The resident must open WhatsApp and press Send, just like the Aarti form. This is not automatic server-side WhatsApp delivery; that would require a separately configured WhatsApp Business API.

## Entries, corrections and gifts

- Required on event forms: first name, last name, wing A–F, flat and Indian mobile number. Mahaprasad requires only wing, flat and adult/child counts; name and phone columns stay blank for new Mahaprasad entries. Children use a parent/guardian phone.
- Bollywood: one entry per wing, 5–6 named players with phones. The wing contact is Player 1. Player 1’s name and phone automatically follow the contact fields and are read-only. The server validates this match.
- Talent: each member registers individually, with a shared group name. One solo and one group per participant maximum. Solo <=120 seconds, group <=240. Day and sequence are allotted by draw. Gifts on 21 September. Music deadline: 15 September.
- Duplicate matching uses first name + last name + wing + flat, so the coordinator must reconcile spelling variations. Group-name consistency also needs review.
- Pooja and Mahaprasad: one entry per household. Contact Priyank for corrections; do not submit another entry under a different name.
- Fun n Fair: one table per entry, ₹500, non-refundable. Payment status starts as Not verified. This form does not collect payments or claim they were received.
- No Stove Cooking: 18+, one person per entry, vegetarian, no pre-cut/chopped/grated raw materials. Final cooking duration and ingredient-approval process are awaiting confirmation; the source’s “such as 60 minutes” was not treated as a final rule.
- Treasure Hunt: interest only until last year’s rules/team format are supplied.
- Run `refreshChildrenGifts` before distribution. It combines registered children under 18 across competitions into one row per child. Mark Gift issued? and notes manually. Rerunning preserves those flags. Bollywood roster has no supplied age requirement, so it is not included in this children’s register; review any child Bollywood participants manually. Mahaprasad is a count, not competition participation.
- Data rows contain common fields plus Details JSON with all event-specific answers (including all Bollywood players). Individual columns also expose every Bollywood player’s name and phone, talent details, Mahaprasad counts, stall details, costume, dish/ingredients, fees and drawing age group.
- Writes use a script lock; retrying the same request reference returns the saved result without adding a second row. A retry with changed data is rejected. There is no public endpoint for listing resident registrations.

## Current validation status

Local checks cover validation, duplicate/retry behaviour, deadlines, age limits and Apps Script saves with a mocked spreadsheet. Real Google Sheets authorization, deployment and WhatsApp sending require the deployment steps above.

## Fun n Fair cultural fund eligibility

Residents select wing and flat first. The rest of the stall form opens only when the existing festival collection API has exactly one matching household row with Paid = Yes (case-insensitive). Amount alone does not establish eligibility. An unpaid household receives a polite request to pay first; missing/duplicate records or service errors remain blocked with retry guidance. Changing wing or flat requires a new check.

The Apps Script independently fetches the same collection source immediately before saving every new stall entry. Browser-supplied payment status is never trusted. The separate ₹500 non-refundable stall/table fee still applies; cultural fund eligibility does not mark that fee paid. Matching is household-based, as in the dashboard, and is not identity authentication.

Replace Code.gs with the updated event-registration.gs, authorize UrlFetchApp external-request access when Google requests it, and deploy a new version. The existing collection deployment needs no changes. If the event endpoint is not configured yet, complete the deployment steps above. Real collection payment updates must be reflected in the source before eligibility changes.

## Current deployment

Configured on 9 September 2026 using deployment version 4 (23:52 IST).

Web app: https://script.google.com/macros/s/AKfycbxkBboCHlZSB3JghP-3eej8dhUxe1V7fKZRsviP2J3mW77-nNjNxldARn_hAq6LxnMI/exec

## Fun Fair payment and WhatsApp recipient

Fun Fair uses the supplied Neeraj Upadhyay QR (assets/neeraj-funfair-qr.jpeg), UPI ID `neeraj18upadhyay1@ybl`, and a ₹500 UPI link. Its saved-entry WhatsApp message goes to Neeraj at +91 8319503483. All other event messages continue to Priyank. Residents must open WhatsApp and press Send. Payment remains subject to coordinator verification; this does not change the cultural fund eligibility check.

No Stove Cooking no longer collects age, dish name or ingredients. The 18+ guideline remains visible, but age is not validated from an input. Cooking requires “I have read the details and agree to it.”; Pooja and Mahaprasad require “I have read and agreed.”. Redeploy the updated script to accept cooking entries without the removed fields. Existing sheet columns and historical entries are retained.
