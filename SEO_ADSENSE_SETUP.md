# Search and advertising launch

This release is published through the repository’s GitHub Pages deployment. No ranking, indexing, ad approval or revenue is guaranteed.

## Search

1. Deploy the changed files together. Confirm HTTPS and the custom domain resolve to this site.
2. Add `saivistaculturalcommittee.in` as a Domain property in Google Search Console using the owner’s Google account. Add the supplied DNS TXT record at the domain provider; do not invent a verification token.
3. Submit `https://saivistaculturalcommittee.in/sitemap.xml`. Inspect the homepage and request indexing. Hash sections are parts of the homepage, not separate sitemap pages.
4. Check indexing and search impressions for “Sai Vista” and “Sai Vista Cultural Committee”. Keep event content current, and link the website from genuine community channels. Do not buy links or stuff keywords.

## Publisher connection

Committee account `saivistaculturalcommittee@gmail.com` now has publisher ID `pub-4904533433490567`. Google supplied the ownership meta tag and ads.txt record, which are included in this release. Google verified site ownership and accepted the review request on 1 November 2026; status: Getting ready / Review requested. Responsive display unit “Sai Vista — Public footer” has slot ID `9499978194`, now configured. Ads remain disabled pending Google approval, account information and consent setup. Auto ads remains OFF. No earnings are active merely because the account exists.

## AdSense application (owner action)

1. The owner creates an account at https://adsense.google.com/start/ with their Google account, actual payee details and country, then adds `https://saivistaculturalcommittee.in/`.
2. Review the public site and all linked content, including media rights, downloadable music, community submissions and personal information. Publish only material the committee has permission to distribute. Confirm privacy disclosures match the actual services. These changes do not certify AdSense eligibility or legal compliance.
3. Use the exact verification meta tag provided by AdSense in the homepage head. This verifies ownership without enabling ad requests before consent. Share that tag with the site maintainer; never share Google passwords, payment details or identity documents in chat.
4. Request site review in AdSense. Only Google can approve it; watch the account for review feedback. Complete identity, tax and payment steps directly in Google when requested.
5. Once the site is Ready, create a responsive display ad unit. Put the committee-owned `ca-pub-` ID and 10-digit slot ID into `advertising-config.js`. Add the exact ads.txt record Google supplies to a root `ads.txt`; the real Google-supplied record is now published.
6. Set up a consent platform appropriate to the visitors. Personalised ads in the EEA, UK and Switzerland require a Google-certified CMP integrated with TCF. The current loader intentionally does nothing until a configured consent platform dispatches `new CustomEvent('sai-vista-ad-consent', {detail: {advertisingAllowed: true}})` for the current visit. This event is an integration hook, not a consent platform. Do not dispatch it unconditionally. Connect revocation/settings controls and reload without approval after withdrawal. Test acceptance, rejection, withdrawal and revisits before enabling ads.
7. Set `enabled: true` only after approval, consent integration and review. Keep Auto ads disabled: use the labelled public manual placement, excluding accounts, payment forms, private media and dialogs. Do not pass flats, names, emails or event/payment details to advertising services. Update the privacy page’s disabled-ad statement when activating.
8. Test the actual consent and ad flow. Do not click your own ads or ask residents to click. Revenue depends on eligible traffic and advertising demand.

Local advertising has no network requests while disabled, invalidly configured or without an affirmative consent event. No paid tools or services were added. Existing committee business enquiries remain available as a direct sponsorship option; agree terms before publishing paid placements and label them Sponsored.

## Guest access boundary

First-time visitors choose resident access or Continue as guest in the initial popup. Previously saved flat numbers no longer grant access; residents must verify their registered email with an OTP. Guest mode hides community accounts, resident payments, photo-library controls and full-film downloads, and defers finance requests. Public marathon registration/payment remains available to visitors because the event accepts outside guests. The resident gate now requires a registered email/flat match, the private reference check and an OTP, with a server-checked remembered session. See RESIDENT_VERIFICATION_SETUP.md for backend setup. Finance endpoints remain publicly callable as before; use authenticated backend authorization if confidentiality is required. Private gallery/video email verification remains intact.

## Skill sources used

- https://github.com/01clauding/claude-seo-skill/blob/main/skills/seo-technical/SKILL.md — crawlability, canonical URL, metadata in initial HTML.
- https://github.com/seoskillsai/seo-skills-ai/blob/main/skills/seo-schema/SKILL.md — Organization/WebSite JSON-LD graph using existing facts only.
- https://github.com/google/skills — inspected the ad skill catalog. Mobile Ads SDK instructions do not apply to this static website; official AdSense web documentation was used instead.

Official references: https://developers.google.com/search/docs/fundamentals/seo-starter-guide , https://support.google.com/adsense/answer/12131223 , https://support.google.com/adsense/answer/1348695 , https://support.google.com/adsense/answer/13554116 .

## Verification performed on 1 November 2026

- `npm run test:player`: 27 passed. `npm test`: 170 passed.
- Browser: initial resident/guest choice, guest entry without a flat; accounts, photo library, full-film download controls hidden; no AdSense script requested; resident dialog opens and Continue as guest dismisses it.
- Browser widths 320, 390, 768, 1024 and 1440 CSS pixels: no page horizontal overflow; restricted sections remained hidden. Temporary viewport override reset.
- Resident entry, remembered flat, invalid saved flat, finance deferral, branded title after translation and advertising consent/configuration gating covered by jsdom tests. No real resident identity was submitted during browser testing.
- Physical phones, actual audio playback, YouTube, offline music, screen lock and OS sleep were not tested for this change. Search Console submission and AdSense approval were not performed. Deployment verification is recorded in RESIDENT_VERIFICATION_SETUP.md.
