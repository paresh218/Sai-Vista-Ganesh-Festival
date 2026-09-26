# Navratri website update · 26 September 2026

Navratri is announced for the community's requested dates, 11–21 October 2026. The homepage includes the new artwork, photo gallery area, member payment and expenditure dashboards, and the committee's full thank-you message. The announcement also appears in Notifications. Ganesh event details, original form links, Aarti, sponsors, wallpapers and kurta records remain in Archive. Existing deep links open the archive at their original section.

Publish all changed website files and the new Navratri/photo-gallery JavaScript, CSS and image together. The release marker and service-worker cache were updated. The photo service is separate from existing registration and finance services; follow PHOTO_GALLERY_SETUP.md to activate it. Until its endpoint is supplied, uploads display an honest coming-soon message.

## Artwork

Saved asset: `assets/navratri-2026.png`. Generated using the built-in image generator with this prompt:

> Create a beautiful wide landscape illustration for a residential community Navratri festival website. Respectful elegant depiction of goddess Durga with a serene face, festive marigold garlands, glowing diyas and decorative dandiya sticks, rich plum magenta and gold, intricate Indian festive art, welcoming celebratory atmosphere. Polished painterly illustration, balanced wide composition. No text, no letters, no watermark.

## Verification

Existing automated tests plus photo-service validation tests pass. Browser preview confirmed the new home content, archived Ganesh sections, and successful loading of both live finance services. The committee subsequently supplied its deployed photo-service URL, now saved in photo-gallery-config.js. A live read returned ok: true with an empty gallery. A real photo upload and second-device verification remain to be performed after publishing; no test photos were posted to the public gallery.
