# Run the local solution

Double-click `society-platform/run-local.cmd`, or run this in PowerShell:

```powershell
cd "D:\Sai Vista Ganesh Festival\society-platform"
.\run-local.cmd
```

It checks Node/npm and Java, restores missing/stale dependencies, starts local Firebase Auth/Firestore, waits for readiness, loads synthetic fixtures and starts the web app. On Windows it opens the app in your default browser. Keep the launcher window open. Ctrl+C stops only its own services. Java is found in the ignored project `.tools` directory when available; otherwise Java 21+ must be installed. No execution-policy or permanent PATH change is made.

If port 5173 already belongs to another preview, leave it alone and choose another web port:

```powershell
.\run-local.cmd --port=5180
```

Options:

- `--demo`: synthetic web preview without Firebase or Java.
- `--no-open`: start services without opening a browser.
- `--port=5180`: choose another web port; Firebase ports remain fixed.
- `--help`: show usage.
- `--android` / `--ios`: explain the pending native projects. They do not claim to start unimplemented applications. Local iOS builds require a Mac and Xcode.

Logs are under ignored `.local/`. Errors identify missing tools, startup failures or occupied ports. The launcher never terminates an unrelated process. Repeating the same run reuses its healthy active session without reseeding. A different mode/port while that launcher is active reports a conflict. Stop that original launcher before changing modes. Stale locks with a dead PID can be replaced; an unreadable/in-progress lock fails safely.

## Local test accounts

Choose Account preview after startup. All use the public test password `Local-demo-only-123!`:

| Email | Access |
| --- | --- |
| superadmin@example.test | Read-only cross-society platform dashboard |
| admin@example.test | Society admin fixture initially in Sai Vista only |
| owner@example.test | Society-owner fixtures in both sample societies |
| resident@example.test | Resident fixture initially in Sai Vista |

Do not reuse that password or enter real resident data. Emulator data is disposable and resets on shutdown by default. These accounts are not connected to production. In full emulator mode, the home/archive read explicitly public local database events and administration uses authenticated database controls. Web-only --demo keeps synthetic events in memory. Existing events without an audience field stay member-only until an admin explicitly shares them.

## Regression commands

To try invitations, select a community and sign in as its synthetic owner. Create a member/admin invitation in Account preview. Share the community name and code manually; no email is sent. Sign in as the named verified test account, select the same community, and accept its code. Existing active or revoked memberships cannot be replaced. Owners can browse invitation history and cancel a pending code. See backend/firestore/INVITATIONS.md.

- `npm.cmd test`: React/domain regression tests.
- `npm.cmd run build`: typecheck and production build.
- `npm.cmd run test:launcher`: startup-order, failure, conflict, readiness and lock regressions.
- `npm.cmd run test:launcher:smoke`: real demo server from another working directory, repeat-launch reuse and shutdown cleanup. Stop an existing launcher first.
- `npm.cmd run test:backend`: disposable Auth/Firestore permission and identity tests. Uses separate test ports 8185/9199 and project demo-society-platform-tests; running app data on 8085/9099 is untouched.

The launcher locates Java for the services it starts. If running backend tests manually, prepend the project `.tools/*jre*/bin` directory to that terminal's PATH first, as described in backend/firestore/README.md.

## Smoke checklist

- Start full mode with emulators stopped; verify readiness, local URLs and synthetic login.
- Run again; verify the same services remain running and fixtures are not reseeded.
- Sign in as synthetic superadmin; browse both societies. Sign in as a society admin; check only its permitted workspace.
- Stop with Ctrl+C; verify owned web/backend ports are released and unrelated previews survive.
- Check demo mode separately; Firebase should not start.
- Read the clear error for a busy port, missing prerequisite or unsupported native option.

Recorded checks are in PROJECT_HISTORY.md. Native device tests, new-machine installation and automatic default-browser opening have not been claimed from the --no-open development smoke runs.

## Find or register a community (C01)

Open Communities. Search by name prefix, exact city and community type. Choose a listing, then use Account preview to request membership; its owner/admin must approve. Verified accounts can register an unlisted housing society, Ganesh mandal, Durga mandal, festival committee or community group and become its initial owner. Listings are self-declared and public; use invented local details only.

An already-running emulator may contain older sample roots without searchable metadata. Fresh launcher startup seeds the new metadata. Do not reset a running session just to upgrade samples: emulator data is disposable, and restarting loses unsaved test records. Hosted legacy data needs a trusted metadata migration before release.

Owners can now revoke an existing admin under Account preview > Manage admin access. Open an active admin membership, confirm revocation, then submit. The backend denies owner removal, role rewrites, cross-community changes and self-restoration. This removes that admin's entire community access; other communities remain unaffected. Use disposable test records only.

Ownership transfer: new schema-2 communities support owner nomination of an active admin and acceptance by that admin in Account preview. Both people explicitly confirm. Old sample metadata may need trusted migration; do not reset interactive data to bypass it. See backend/firestore/OWNERSHIP.md.

Account cleanup: verified accounts can submit/cancel a review request. This does not delete data in the interactive app. A worker prototype is tested only against isolated disposable fixtures; operational deletion is disabled pending hosting, reviewer, recovery and retention setup. See backend/accounts/README.md.

## Publish content without deployment

1. Open Account preview or Admin preview in full emulator mode and sign in as the selected community's admin/owner.
2. Create an event. Defaults are Draft and Members only. Choose Public visitors and Published only for content intended for everyone, then save.
3. Open the home page in another tab; it subscribes to database changes. Feature/pin order is applied before event date. Archive moves explicitly public events to the public archive; choose Members only or Draft to withdraw public access. Archiving is not a privacy control.
4. Open an event in the account workspace to edit its title, description, venue, category or date. If another admin changed it, the save is rejected and inputs remain. Reopen the record to review the latest version before retrying.
5. Community appearance controls public display name, home tagline and announcement. The canonical directory name and ownership are unchanged. Existing plum/gold/cream styling and bundled Poppins remain shared.

The local preview contains only invented test content. New and older member-only events do not appear on the public home page until explicitly shared. Member-event browsing outside the admin workspace, translations, module switches and media/logo controls are still pending.
