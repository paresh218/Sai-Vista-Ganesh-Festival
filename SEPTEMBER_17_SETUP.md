# Activate the 17 September website update

## Version 8 connection verified

The supplied deployment (17 September 2026, 14:32 IST) responds with `status: success`, `service: sai-vista-events-v1`, `registrationRevision: 2026-09-17`, and Fancy Dress cutoff `2026-09-18T00:00:00+05:30`. The local `event-registration-config.js` now points to its new `/exec` URL. Publish the updated website configuration to connect the public site. This read-only check does not verify a live row write or WhatsApp delivery.

The website files are updated locally. The Google Apps Script must be redeployed to activate blood donation saving and enforce the revised deadlines on the server. Publishing the website alone does not update Google Apps Script.

## Update the existing Google Sheets connection

1. Open the Apps Script project used by the existing event registration endpoint in `event-registration-config.js`.
2. Replace its Code.gs contents with the entire `event-registration.gs` file. This includes all existing events plus Blood Donation; do not append it to the previous code and do not replace the separate Aarti/accounts scripts.
3. Keep the existing `SPREADSHEET_ID` script property. Run `setupEventRegistration()` once. It preserves existing entries and creates a **Blood Donation** tab with the previous donation answer in a dedicated **Have donated blood before?** column. The donor's full name is stored in **First name**; **Last name** stays blank.
4. Select **Deploy → Manage deployments → Edit → New version → Deploy** for the existing web app. Keep its existing execute-as and audience settings and retain its `/exec` URL. If a new URL is issued, update `endpoint` in `event-registration-config.js`.
5. Publish the website changes, including `assets/artisanal-sweets.jpeg`, then reload the website. Blood donation submission stays disabled until the service confirms the updated version.
6. Make a clearly labelled test blood donation entry, verify the row in the private spreadsheet, and check that the WhatsApp link is addressed to **Sameer Gandhi, +91 9326199515**, with the correct details. No live test registrations or WhatsApp messages were sent during local verification.

## Nomination deadlines

- Talent Show and Drawing: closed immediately, including new submissions made directly to the updated Apps Script.
- Fancy Dress: last day **17 September 2026**.
- Bollywood Night: last day **18 September 2026**.
- Remaining forms in Event Registration, including blood donation interest: last day **19 September 2026**.

Each final day is inclusive through 11:59 PM India time. Submissions close at midnight starting the next day. The old `FANCY_DRESS_DEADLINE` property is now ignored. Existing registrations are retained; retrying a previously saved reference does not create another row, even after closure. Aarti uses a separate service and retains its existing slot rules.

## WhatsApp and blood donation

The popup asks for name, wing, flat, mobile number and an optional **Have donated blood before?** checkbox (unchecked is saved as No). Coordinators: Sameer Gandhi and Deepak Karade.

After Google Sheets confirms the save, a prefilled WhatsApp link includes those details and the registration reference. The resident opens the link and presses **Send**. This follows the site's existing WhatsApp flow; automatic delivery is not configured and would need a WhatsApp Business messaging service.

## Other changes

- No Stove Cooking: participation gift for all; gifts worth ₹10,000 in total, sponsored by Artisanal Sweets. The supplied logo appears in the schedule and registration card.
- Archive navigation with Kurta details and refund information. The T-shirt entry was removed as requested. Final Kurta price: ₹250. The old ₹300 payment option is removed.
- Refund notice explains the initial ₹300 collection, the ₹250 final price announced at the trial, and the forthcoming ₹50 refund to each person who paid ₹300.
- Notifications and committee updates contain only the refund notice and nomination reminders. The floating promotional chat is removed.

## Verification

`node event-registration.test.cjs`, `node site-updates.test.cjs`, and `node expense-model.test.cjs` pass locally. Registration checks include server cutoff enforcement, both donation checkbox values, duplicate protection and saved retries after closure. Google deployment and real WhatsApp delivery are separate from these local checks.
