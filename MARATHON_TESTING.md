# Marathon UI regression

Run `npm test` and `npm run test:player` before publishing. The community tests cover promotion placement, both activity forms, flat autofill, consent/validation and successful/failed saves.

Browser checks performed on 23 October 2026:

- At 320, 390, 768, 1024 and 1440 viewport pixels, the homepage has no horizontal overflow. The marathon banner stacks through 800 pixels and uses two columns on wider screens.
- Mobile interest buttons are full width and 48 pixels tall. The previous two-column phone layout produced narrow, 180-pixel-tall buttons.
- At 390 pixels, the image and both buttons are visible after using the Marathon shortcut. The fixed header does not cover the image title.
- The mobile menu, Marathon shortcut, Accounts, Ganesh archive and Navratri archive routes work without page overflow.
- Running and Walking open the correct labelled dialog. The remembered flat fills automatically. At 320 pixels the form fields stack and the dialog scrolls within the viewport without horizontal overflow.
- Escape and the close button dismiss the form. The service readiness check succeeds. No new real resident response was submitted during these UI checks.
- Hindi and Marathi banner translations fit at 320 pixels; both Hindi interest buttons retain 48-pixel targets.

Repeat these checks after banner, navigation or form CSS changes. Physical Android/iPhone devices and actual audio playback were not retested for this layout-only change.
