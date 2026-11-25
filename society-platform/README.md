# Society platform

Separate successor project for a configurable society event service on web, Android and iOS.

Start with [PROJECT_HISTORY.md](PROJECT_HISTORY.md). It contains the scope, task status, acceptance checks, decisions, store guidance and resume instructions.

Every implemented feature and behavior change requires reusable regression tests. Bug fixes require a reproducing test that fails before the fix and passes afterward. The plan's coverage register tracks existing cases, gaps and required manual/device checks. Fill the recorded regression gaps before expanding functionality.

New code lives only in this folder. The original festival site is a behavior reference and remains unchanged. The first app is a local demo, not a production service.

## Layout

- `web/src/app/`: React/TypeScript application composition and routes.
- `web/src/features/`: society, event and admin components and domain types.
- `web/src/data/`: synthetic demo fixtures; no real resident records.
- `web/src/styles/`: responsive shared styles.
- `tests/`: application and domain tests.
- `android/`: reserved for the generated Capacitor Android project.
- `ios/`: reserved for the generated Capacitor iOS project.
- `backend/firestore/`: NoSQL document contracts, Firestore Security Rules, indexes and backend tests.
- `backend/auth/`: identity test suite and local account workflow instructions.
- `docs/`: preview evidence and implementation notes.

Native folders will be generated from the working shared web app using Capacitor. They are not independent rewrites. The backend plan is Firebase Authentication + Firestore NoSQL; no cloud services or paid plans have been enabled.

## Local development

Run `run-local.cmd` to start the local app and Firebase emulators together. In PowerShell, use `.\run-local.cmd`. If another preview occupies port 5173, use `.\run-local.cmd --port=5180`. See [local running instructions](docs/LOCAL_RUNNING.md) for test accounts, options, logs and regression commands.

For a web-only demo, use `.\run-local.cmd --demo`. In --demo, event edits stay in memory and reset on reload. In full emulator mode, public home/archive, administration, appearances and account workspaces use local Firestore. No hosted project is configured.

To test actual local identity/profile/membership: put Java 21+ on the current terminal's PATH, start `npm run emulators`, run `npm run seed:local`, then start `npm run dev:emulator` in another terminal. See [local identity instructions](backend/auth/README.md). No cloud configuration or billing is required. Never use personal data or real passwords in emulator mode.

The launcher performs that manual sequence automatically and finds the local Java runtime. On PowerShell systems that block npm.ps1, use `npm.cmd` for any manual npm commands. Platform superadmin access is described in [platform permissions](backend/platform/README.md).

Do not store resident exports, database backups, credentials or signing files here. This folder currently sits inside the existing website repository; check hosting exclusions or move it to its own repository before adding private operational files.

Community onboarding is implemented locally: open Communities to browse/search, choose an existing group and request approval, or sign in with a verified account to register a new society, Ganesh/Durga mandal, festival committee or community group. Registration creates its owner membership atomically. See docs/LOCAL_RUNNING.md for usage and legacy local-fixture limitations.

Poppins is self-hosted using pinned @fontsource/poppins 5.3.0. Its original OFL license ships in web/public/licenses/Poppins-OFL.txt. See https://fontsource.org/fonts/poppins/use for the font package integration reference.
