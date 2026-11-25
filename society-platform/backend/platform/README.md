# Platform superadmin (P1 local implementation)

Platform authority is separate from society membership. `platformRoles/{verifiedFirebaseUid}` contains `role: superadmin` and `status: active`. Clients can read only their own role document; no client, including a superadmin, can create/edit/delete platform roles. A display name, email string, society owner role or token field named superadmin does not grant this permission.

An active verified superadmin can read the society directory (including unlisted entries), user profiles and the explicit application collection allowlist under every society. Reads are bounded and the dashboard uses cursor pagination. Platform visibility alone grants no data editing or deletion. Society owners/admins can continue permitted changes only in societies where they have an active membership. Infrastructure secrets are outside the permitted read paths and must never be stored in application records.

The account screen's platform dashboard waits for a server-confirmed role, clears platform content on revocation/connection loss, and unsubscribes on logout. Society committee tools also clear when membership is only cached. Backend rules independently enforce access on each request.

## Local verification

Start `run-local.cmd`, choose Account preview and sign in with `superadmin@example.test` / `Local-demo-only-123!`. These are public synthetic credentials and grant authority only in the local demo emulator. The owner/resident fixture accounts do not become platform superadmins. The platform can browse both sample societies without joining either.

`npm.cmd test` includes dashboard, pagination, visibility, edit-error and session/cache cleanup checks. `npm.cmd run test:backend` includes real emulator rule checks for cross-society visibility, forbidden role promotion, forged claims, unverified identity and immediate revocation. Do not run reset-based backend tests against an interactive emulator session.

## Production boundary

The actual user's production account has not been provisioned. During hosted setup, confirm the user's Firebase UID through a trusted administrative channel, verify ownership of the project/account, and write the protected role using a trusted administrative tool. Never expose service credentials or a role-grant endpoint to the frontend. Require appropriate administrator MFA and an operational revocation/recovery procedure before launch. Do not copy the synthetic credentials into production.

`platformAudit` is append-only for verified superadmins, attributable to the current UID and records dashboard view requests before the associated query. Failed audit writes block that dashboard query. **This is not a complete server audit of reads:** direct SDK/REST reads can bypass the UI logging. A trusted gateway or appropriate server-side data-access logging is still required before production if every privileged read must be captured. No immutable full-read audit claim is made for this local implementation. All future feature collections must be checked against the allowlist and corresponding regression tests; no blanket secret access is granted.
