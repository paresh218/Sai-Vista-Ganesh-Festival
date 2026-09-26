# Mobile uploads and nine-day Navratri experience

- One photo/video picker replaces the separate forms. It detects the selected type, displays a local preview, keeps the input intact on failure, and routes to the existing backend. Photos: up to 10,000,000 bytes. Videos: up to 25,000,000 bytes, still subject to committee approval. Instagram remains a separate, collapsible link form.
- Uploading is placed directly beneath the gallery heading. Social-sharing details and the Reel form are collapsible. Phone controls have touch-sized buttons and readable fields; finance grid overflow is fixed.
- The supplied 11–19 October 2026 colour schedule uses Asia/Kolkata dates, including midnight rollover. Pale surfaces and darker text/button accents preserve contrast on White and Yellow days.
- A day-specific goddess popup replaces the automatic Ganesh thank-you popup during these nine dates. Before/after those dates the existing thank-you popup remains. The complete thank-you message remains in Archive throughout. Selecting a calendar card previews that day's goddess without overriding the site's actual date/theme.
- Only the requested illustration is loaded, rather than downloading nine images on every visit. The artwork is generated devotional illustration, not a historical photograph. The calendar's date/goddess mapping follows the user's supplied celebration schedule.
- No Apps Script redeployment is required for this front-end change. Publish all changed site files, the new `community-upload.js` and `navratri-days.js`, and all nine `assets/navratri-*.png` goddess assets. The existing service URL is retained.

Calendar reference supplied by the user: https://www.vedantu.com/blog/navratri-2025-colours-nine-colors-of-navratri-and-their-explanations

Validation includes automated India-date boundary and all-nine-day checks, text contrast checks, combined uploader payload/limit checks, and phone previews at 320px and 390px. Browser preview confirmed photo/video selection and the daily goddess dialog without posting test uploads to the live gallery.
