# Sai Vista Navratri Songs

Upload folder: https://drive.google.com/drive/folders/1BkL8XO3KYJxPgAB2zyrKrbpZjIzJykma

Owner: saivistaculturalcommittee@gmail.com. Authorised uploader: shubhgore11@gmail.com (resident A-1302), Editor. Anyone with the link has Viewer access. Permissions were verified in Google Drive.

## Upload songs

1. Sign into Google Drive as shubhgore11@gmail.com.
2. Open the upload folder and select Day 1–9 (11–19 October 2026, following the existing website calendar).
3. Choose New → File upload. MP3 is recommended. Use names such as `01 Aarti.mp3`, `02 Garba.mp3` for playback order.
4. Open the website’s Navratri Songs section, select the same day, and choose Refresh songs.
5. Choose Play song, then use Google’s player controls. The fallback link opens the song in Drive if preview is unavailable.

Folder Editor access also allows organising and deleting files in this dedicated folder. All songs placed here are publicly viewable through the link. Audio format support, preview processing, download availability and traffic limits are controlled by Google Drive. Song files uploaded by Shubh can remain owned by his Google account.

## Service and maintenance

The read-only Apps Script service is deployed in the committee account:

- Project: https://script.google.com/u/1/home/projects/1cnIfqFxRnuqqTk9Ifu6P4xjwbSMAvQR_Y4djjIUSLagffGWtTTH-TCet/edit
- Service: https://script.google.com/macros/s/AKfycbwNKxnnqEyQTHjHB1oUI31q2UonlUsOGESO46kL9UZjc-Y51IUFRSEUF1DCrUrH9Liq/exec
- Execute as committee; audience Anyone; code has no upload/write endpoint.
- Source: navratri-songs.gs. Website settings: navratri-songs-config.js.

To change service code, update Code.gs in this project and Deploy → Manage deployments → Edit → New version. Preserve the endpoint URL. For another festival year, update day folders and dates in both the service and website configuration.

Verified live: all nine day lists return successfully and are currently empty. Automated checks cover audio filtering, ordering, resource keys and safe failures. A real song’s playback must be checked after the first upload.
