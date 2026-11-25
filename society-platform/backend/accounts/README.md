# Account cleanup checkpoint

The account screen records/cancels a private cleanup request. It does not trigger deletion. A platform superadmin can inspect requests read-only. Clients cannot mark a request processing/completed, change its owner, delete its history or unfreeze an account.

`cleanup.mjs` is a trusted-worker prototype with a privileged Firestore connection and an injected Auth adapter. It is not exposed through a browser endpoint or scheduled service. No production worker or CLI deletion command is enabled. `emulator-auth.mjs` accepts only the dedicated disposable project `demo-society-cleanup-auth-tests` and loopback port 9199; it rejects the interactive app and cloud. The implementation follows [Firebase's Auth emulator guidance](https://firebase.google.com/docs/emulator-suite/connect_auth) and the installed emulator's project-scoped REST contract.

Worker stages:

1. Claim pending/failed request transactionally, recording reviewer identity and protected account state. Only one job may own an account.
2. Freeze verified application access, then inventory communities using bounded cursor reads. Block directory owners, owner memberships and active platform superadmins for separate review. Blocked requests preserve the account and restore access.
3. Disable the Auth identity. Redact matching invitation email contacts and cancel pending invitations. Remove own memberships and private profile. Preserve shared events, transfers, opaque actor IDs and minimal cleanup/audit history.
4. Delete the Auth identity, retain a protected deleted state, and mark request/audit complete. Repeated completed jobs are no-ops. Failures stay frozen and become failed for an explicit reviewed retry. Cancelled or already-claimed jobs cannot execute.

Scope is limited to the currently implemented identity/membership/invitation records. Future households, registrations, ledger, media/files and external processors require their own cleanup adapters and reviewed retention rules before those modules launch. This prototype is not a claim that every possible linked record is erased. A crash that leaves processing needs operational recovery; lease expiry/recovery is not implemented. Large community inventory is paged but held in memory; production scale/cost validation remains pending.

Before hosted use: choose trusted worker hosting without enabling billing implicitly, bind reviewer authorization/recent reauthentication, add durable work scheduling and crash recovery, validate every new collection and storage provider, approve retention/backup handling, and complete actor-attributed server auditing. Do not activate automated deletion while these gates remain open. Request UI deliberately states that no data has been deleted.

Checks: `npm.cmd run test:backend` exercises worker invariants with disposable Firestore data, isolated Auth disable/delete and a combined worker/Auth/Firestore case. App tests cover consent, errors, request privacy/cache clearing and cancellation. Test projects and ports are isolated from the running local app. No real account, production record or interactive fixture is removed by these tests.
