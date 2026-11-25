# Ownership transfer

The designated owner of a schema-2 community can nominate an active admin. The nominee accepts with their verified account, using the code in the same selected community. Requests expire after three days in the form; rules enforce a maximum seven days. No notification or email is sent.

`societies/{id}/ownershipTransfers/{code}` records schemaVersion, fromUid, toUid, status, createdAt, updatedAt and expiresAt. Records cannot be deleted. Pending requests may be cancelled by an active owner. Accepted/cancelled records are immutable. Only owners, the nominee and platform superadmins can read a request; only owners/platform superadmins can list bounded history.

Acceptance updates four documents atomically: community ownerUid, old owner role to admin, nominee role to owner, and request status to accepted. Root and both member documents receive ownershipTransferId and server updatedAt. Rules verify all pre-write and post-write states, preserve other fields, require both active memberships and deny partial swaps, replay, arbitrary root edits or platform promotion. The nominated admin explicitly accepts responsibility; the previous owner remains an active admin. Stale outstanding requests become unusable after the designated owner changes.

Older schema-1 roots or inconsistent designated-owner metadata require trusted migration before transfer. The app never guesses or silently rewrites ownership. Existing interactive fixtures may predate schema 2; a newly registered community supports this flow. Ownership history is retained, but complete server-side privileged-access auditing, recovery/MFA and operational dispute resolution remain hosted launch gates.

Regression tests cover nomination validation, verified identities, private reads, complete/partial transfers, expiry, cancellation, revoked nominee, immutable history and stale issuer rejection. UI/service tests cover consent, transaction writes, failed saves and retained inputs. No real ownership or production permissions were changed by implementation tests.
