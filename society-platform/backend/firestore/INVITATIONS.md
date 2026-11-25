# Local community invitations (S04)

Active, verified community owners can issue invitations for `resident` (member) or `admin` access. An invitation never grants owner or platform authority. Admins cannot issue invitations. These rules apply to all community types, including mandals and festival committees.

`societies/{id}/invitations/{randomId}` contains schemaVersion 1, recipient email, role, status, createdBy, createdAt, updatedAt and expiresAt. New invitations must be pending, use server creation/update timestamps and expire within seven days. The current form chooses three days. Existing invitation email, role, issuer and expiry are immutable. Owners can cancel pending invitations; accepted/cancelled records cannot be changed or deleted. Expiry is enforced at acceptance; no cleanup scheduler is needed for correctness.

Only active owners and platform superadmins can list invitations, with bounded queries. A verified recipient can read their specific code, including its history. Other members/admins and anonymous visitors cannot inspect recipient contacts. Codes are random Firestore IDs, but email matching and backend rules provide authorization; possession of a code alone grants nothing.

Acceptance uses one Firestore transaction. The named verified account must create its own active membership (or activate its pending resident request) and consume the matching pending invitation atomically. The membership has `invitationId`; the invitation gains `acceptedBy` and an updated server timestamp. Rules validate both documents using pre-write and post-write values, the invitation role/email/expiry, selected community, immutable membership creation time and the issuer's continuing active-owner status. Concurrent acceptance has one winner. A code cannot be replayed, used in another community, or used to reactivate a revoked account or overwrite an active membership.

Pending join requests can accept a matching invitation. Existing active members cannot change role through this flow. Owner transfer, existing-admin revocation and audited account cleanup remain separate S04 work. Do not treat this as a complete hosted identity system.

Local use: select a community in Account preview. Its owner creates an invitation and manually shares the community name/code. The recipient signs into the matching verified account, selects that community, and enters the code under Have an invitation? Owners can browse paginated invitation history, select a record and cancel its code. No real email is sent. Do not enter real contacts in the local demo.

Tests: `npm.cmd test` covers service/UI/permission-display behavior. `npm.cmd run test:backend` uses isolated test emulators and validates actual rules, including expiry, cancellation, issuer revocation, malformed writes, tenant privacy, privilege escalation and concurrent acceptance. Production hosting, delivery, abuse/rate limits, MFA, complete server audit and native session behavior remain release gates.

Update: owner-controlled revocation of active admins is now implemented separately in Account preview. It changes only status and updatedAt; invitations still cannot replace active or revoked memberships. Owner transfer, reviewed restoration and complete actor-attributed role audit remain pending.
