# Shared web application

React + TypeScript resident and admin demo, built with Vite. Run commands from the parent society-platform folder. `src/app` owns composition and routing; `src/features` owns feature components and domain logic; `src/data` contains synthetic fixtures; `src/styles` contains shared CSS. Add new features to their own folders rather than growing one script.

The same build will be packaged for Capacitor Android and iOS. Real admin screens require backend authorization in S03/S04; the current explicitly labeled admin preview edits synthetic memory only.
