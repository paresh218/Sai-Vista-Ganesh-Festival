# Resident social sign-in

Use the committee-owned Clerk application `app_3LVCqZFKHQ1A6kOuV6bz5wdH9Ze`.
Production instance: `ins_3LVD0CPcIucqb0acSauYJAMZMUh`.
Website: https://saivistaculturalcommittee.in/.

## Free plan

Hobby is currently $0, with no card required, up to 50,000 monthly retained users
and three social connections. Google is active; Facebook and LinkedIn are staged.
Phone/SMS is excluded from Hobby and remains off. Sessions have a fixed seven-day
lifetime. Recheck https://clerk.com/pricing before changing billing or features.

## Production configuration

`resident-social-config.js` contains only the public publishable key and frontend
API URL. Production DNS, certificates, Google OAuth and the private verifier are configured.
The frontend uses `enabled: true`. Deployment checks:

1. Clerk verifies the domain records and issues its certificates.
2. Google production OAuth credentials are configured in Clerk. Facebook and
   LinkedIn each require their own developer credentials and any provider review.
   Selecting a provider in development does not make it ready for production.
3. The private Apps Script properties contain `CLERK_ISSUER` set to
   `https://clerk.saivistaculturalcommittee.in` and the matching `CLERK_SECRET_KEY`.
   Never put the secret in public source, Sheets, screenshots, logs or frontend config.
4. Run `node tools/build-resident-service.cjs`. Deploy its generated `Code.gs`
   to the existing committee web app without changing its URL or execution account.
5. Complete a real production social login for an approved resident. Confirm the
   flat/email binding, private media access, visit logging, public-account restrictions and
   logout. Test an unregistered account receives public access only. Do not invent a resident
   record or bypass directory approval to make a test pass.
6. Enable the frontend, run `node tools/build-resident-client.cjs`, update the
   asset filename/release/cache markers if previously published, run the site and
   player checks, publish and verify GitHub Pages and the served files.

The production login uses Google OAuth without a site OTP step. Legacy OTP backend handlers remain for existing gallery sessions; the Google login does not expose them.
Social sign-in does not import or upload the committee's resident directory into
Clerk. Google sign-in comes first. The server finds the saved flat from the verified email. Only new emails are asked for their flat, with an “I am not a resident” option. The chosen flat is saved for later logins. There is no guest
bypass. Accounts, member payments, downloads and photo galleries require resident
verification on the server. Approved email/flat pairings are checked against the
private resident reference; names alone do not establish identity.

An unmatched flat creates a PENDING row in **Resident requests** in the existing
private email workbook and sends one review email to paresh218@gmail.com. After
checking the identity, Paresh sets Status (column E) to APPROVED or DENIED. The
visitor can choose **Check verification** without signing in again. An existing
REVOKED/DENIED access record is not restored by an older approval. Review notes
belong in column H. Never approve a stranger merely because they know a flat.

Google is configured for production. Facebook and LinkedIn are disabled in
production, as approved, until their owner creates developer apps and supplies
credentials. Their configuration and development connections remain. Prepare both
with website https://saivistaculturalcommittee.in/, privacy page /privacy.html,
terms page /terms.html and callback
https://clerk.saivistaculturalcommittee.in/v1/oauth_callback. Use only basic
profile/email scopes. Provider identity checks and terms require owner participation.
Do not add placeholder credentials or a paid plan.

Backend releases: resident verifier v17, payments v3, expenses v3, registration v13,
community gallery v6/v7 across all five active endpoints. Legacy public gallery
GET reads are denied; feeds use authenticated POST. Payment and expense source
Sheets are Restricted. Registration tokens are removed before response storage.

## Verification and sessions

Apps Script verifies RS256 signatures with node-forge, using JWKS fetched only from
the configured issuer. Tokens must have the expected issuer, one of the two site
origins, a short unexpired lifetime, and valid Clerk user/session identifiers.
The server retrieves the active provider session and verified primary email from
Clerk, then checks the private directory. Browser email/name claims are ignored.

The site exchanges that token for its existing opaque session, bounded by Clerk's
session expiry, abandonment deadline and seven days. Every private request checks
Clerk's live session state as well as the resident directory. Logout revokes the
provider session. The provider JWT is never persisted in the site or its logs.
The existing email list receives verification/activity timestamps without new
duplicate contact rows. Public sign-ins are labelled separately from verified
residents in private logs. The SDK loads only when sign-in starts.

## DNS additions

These CNAME records are specific to this production instance:

| Name | Target |
| --- | --- |
| clerk | frontend-api.clerk.services |
| accounts | accounts.clerk.services |
| clkmail | mail.no9j4fg6cicu.clerk.services |
| clk._domainkey | dkim1.no9j4fg6cicu.clerk.services |
| clk2._domainkey | dkim2.no9j4fg6cicu.clerk.services |

Keep the existing GitHub Pages root/www records, nameservers and DMARC record.

## Deployment verification (3 November 2026)

All 201 site tests and 27 player checks passed locally. GitHub's Player regression
job passed. Pages deployed successfully on its second attempt after a server 500.
Live release: `2026-11-03-social-login-2`; service-worker cache: `v178`.
The login dialog had no horizontal overflow at 320, 390, 768, 1024 and 1440 pixels.
A real committee Google account completed production OAuth with no flat and
received public access only. Accounts, payments, expenses and both galleries were
hidden. All five active gallery endpoints rejected fresh anonymous requests;
the main gallery endpoint also rejected an invalid-token POST.
An actual registered resident's positive-access flow, approval email delivery,
physical-phone playback and OS sleep remain unverified. No fake resident request
or test review email was created.
