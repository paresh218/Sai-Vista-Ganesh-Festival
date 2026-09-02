# Sai Vista Ganesh Festival 2026 — V3

## Included
- Mobile-first festival homepage
- Festival schedule
- Five Google Forms integrated as website modal cards
- Existing custom Aarti nomination form integrated with the supplied Google Apps Script
- Live Aarti slot availability
- WhatsApp follow-up link
- Festival accounts placeholder, ready for Google Sheets / Apps Script
- No server required for GitHub Pages

## Forms
1. All Event Registration: https://forms.gle/LZDdZCUgNTp34tar5
2. Satyanarayan Pooja: https://forms.gle/xkEiQqAmXVQ75Keb8
3. Bollywood Night: https://forms.gle/28994c4UexrtNWbXA
4. Satyanarayan Prasad Availability: https://forms.gle/KC1wqmx4xjHbMRtz7
5. Fun Fair Stall Entry: https://forms.gle/2YapGuBbkc962JuZ6

## GitHub Pages
Put `index.html`, `style.css`, and `script.js` in the repository root and enable:
Settings → Pages → Deploy from branch → main → / (root).

## Note about Google Forms
The current implementation opens the supplied Google Form URLs in a website modal. Google may prevent some forms from being embedded in iframes; the modal includes a direct-open fallback. Once the actual field structures are available, selected forms can be converted to native website forms backed by Apps Script and Google Sheets.


## V4 schedule update
The supplied Ganpati 2026 schedule artwork has been added to the homepage and can be opened in a full-screen viewer.
The written schedule section has also been expanded to 14–25 September 2026 to match the latest artwork.


## V5 T-shirt update
Added a Ganpati 2026 T-shirt nomination section:
- Interested: Yes / No
- Size: S, M, L, XL, XXL, XXXL
- Price: ₹300
- Deadline: 8 September 2026
- Deadline-aware UI that automatically closes after the deadline

The T-shirt UI is currently frontend-only because no Google Form or Apps Script endpoint for T-shirt nominations has been supplied. It is ready for a Google Sheets/Apps Script connection later.
