# Player regression checks

For changes to the music player, its shared UI, catalogue, storage, service worker, or audio backend:

1. Run `npm ci` if dependencies are missing, then `npm run test:player`.
2. Run `npm test` before deployment to check the rest of the site.
3. Add a regression test that fails before any player bug fix and passes afterward. Do not weaken assertions to accommodate a regression.
4. Follow the browser/device checklist in `PLAYER_TESTING.md` for UI, playback-source, storage, and background-playback changes. Report the checks actually performed; never claim all devices, actual system sleep, or YouTube playback were verified from mocks.
5. Increment the site release and service-worker cache markers when deploying runtime changes. Version changed stylesheets to refresh existing clients.
6. Verify the deployed files and GitHub Pages job. Keep unrelated local files out of commits.

Run checks in this chat; do not delegate unless the user explicitly requests it.
