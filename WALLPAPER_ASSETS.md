# Ganpati Bappa 2026 assets

- Original: `assets/ganpati-bappa-2026-original.jpg` (3024 × 4032), copied unchanged from the resident-supplied photograph.
- Enhanced: `assets/ganpati-bappa-2026-mobile-wallpaper.png` (841 × 1870, approximately 9:20), created using the built-in image generation tool. This is an AI-enhanced rendition; fine details can differ. No claim of a 4K or lossless restoration is made.
- Public page after deployment: `https://saivistaculturalcommittee.in/#wallpapers`.
- The homepage uses the original photograph. Wallpaper downloads are loaded on demand and cached by the existing service worker after access.
- Phones use different aspect ratios and zoom settings. The page explains how to position the image and offers the uncropped original. These are still wallpapers for home/lock screens, not an animated screensaver.

## Final image-edit prompt

Edit the supplied original photograph of Sai Vista's actual Ganpati Bappa idol and decoration for 2026 into a high-resolution portrait phone wallpaper, aspect ratio 9:20 if possible, at least 1440 pixels wide. Photo restoration and lighting enhancement, not an artistic reinterpretation. Preserve the exact idol's face, trunk, hands, crown, garments, garlands, elephant mount, smaller foreground idol, moon disc and galaxy/cloud decoration. Do not invent or redesign any religious details. Improve exposure, shadow detail, natural colour balance and fine clarity, reduce camera noise without artificial sharpening or plastic textures. Retain the warm festive illumination. Compose with both idols fully visible in the central safe area, the main idol near the middle, leaving calm darker background space in the top 18 percent for a lock-screen clock, and margin at the bottom and both sides for different phone crops. Extend existing dark decoration naturally above/below only as necessary for a tall screen; avoid cropping the crown, hands or feet. No text, no watermark, no phone mockup, no frames. Output the wallpaper image itself.

## UI inspiration

Reviewed https://uiverse.io/cards, https://uiverse.io/buttons and https://uiverse.io/radio-buttons. The styles in `mobile-components.css` are original implementations of raised cards, segmented selectors, touch feedback and a floating mobile navigation bar, adapted to the existing festival colours. No third-party component source code was copied.

## Devotional video

`assets/ganpati-bappa-2026-devotional-18s.mp4`: 18 seconds, 1080 × 1920, 30 fps, H.264 video with stereo AAC audio, approximately 7.4 MB. Uses the enhanced wallpaper with a 2.5% centred zoom and gentle fades. The full portrait is fitted over a blurred background.

Music is an original synthesized pentatonic flute-style phrase with soft bells, a plucked drone and hand-drum-style rhythm, created for this clip. No vocals, third-party recordings or existing song melody were used. Rebuild instructions are in `build-bappa-video.py`; local dependencies and intermediate files are ignored by Git.

The site uses native, user-initiated playback, `playsinline`, `preload="none"`, and an MP4 download link. Video requests bypass the service worker so browser range requests and seeking go directly to the server. The clip is not pre-cached for offline use.
