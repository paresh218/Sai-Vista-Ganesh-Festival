// Deploy as a separate Apps Script web app. See PHOTO_GALLERY_SETUP.md.
function photoJson(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function photoFolder() {
  const id = PropertiesService.getScriptProperties().getProperty('PHOTO_FOLDER_ID');
  if (!id) throw new Error('Photo gallery is not configured.');
  return DriveApp.getFolderById(id);
}
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'media') return mediaList();
  try {
    const files = photoFolder().getFiles(), entries = [];
    while (files.hasNext()) {
      const file = files.next();
      if (file.getMimeType() === 'image/jpeg' && file.getName().startsWith('community-')) entries.push(file);
    }
    entries.sort((a, b) => b.getDateCreated().getTime() - a.getDateCreated().getTime());
    return photoJson({ ok: true, photos: entries.slice(0, 12).map(file => ({ caption: file.getDescription() || 'Sai Vista festival moment', image: 'data:image/jpeg;base64,' + Utilities.base64Encode(file.getBlob().getBytes()) })) });
  } catch (_) { return photoJson({ ok: false, error: 'The shared photo gallery is unavailable. Please try again later.' }); }
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (e && e.postData && e.postData.contents.length <= 33400000 && /"action"\s*:\s*"submitMedia"/.test(e.postData.contents.slice(0, 200))) return mediaSubmit(JSON.parse(e.postData.contents));
    if (!e || !e.postData || e.postData.contents.length > 1450000) throw new Error('Invalid upload size.');
    const data = JSON.parse(e.postData.contents);
    if (data.consent !== true || typeof data.caption !== 'string' || !data.caption.trim() || data.caption.length > 100 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data.image)) throw new Error('Please provide a JPEG photo, caption and permission to share.');
    const bytes = Utilities.base64Decode(data.image.split(',')[1]);
    if (bytes.length > 1048576 || bytes.length < 4 || (bytes[0] & 255) !== 255 || (bytes[1] & 255) !== 216 || (bytes[2] & 255) !== 255) throw new Error('Invalid JPEG image.');
    lock.waitLock(10000);
    const folder = photoFolder();
    const files = folder.getFiles(); let count = 0;
    while (files.hasNext()) { files.next(); count++; }
    if (count >= 300) throw new Error('The gallery is full. Please contact the committee.');
    const file = folder.createFile(Utilities.newBlob(bytes, 'image/jpeg', 'community-' + Utilities.getUuid() + '.jpg'));
    file.setDescription(data.caption.trim());
    return photoJson({ ok: true });
  } catch (error) { return photoJson({ ok: false, error: error.message || 'Upload failed. Please try again.' }); }
  finally { if (lock.hasLock()) lock.releaseLock(); }
}

// Media v2. Only committee-approved records are returned to visitors.
const MEDIA_MAX_BYTES = 25000000;
function reelUrl(value) {
  const match = /^https:\/\/(?:www\.)?instagram\.com\/reels?\/([A-Za-z0-9_-]{5,64})\/?(?:\?[^#\s]*)?(?:#[^\s]*)?$/i.exec(String(value || '').trim());
  if (!match) throw new Error('Paste a direct public Instagram Reel link, such as https://www.instagram.com/reel/ABC123/.');
  return 'https://www.instagram.com/reel/' + match[1] + '/';
}
function mediaList() {
  try {
    const files = photoFolder().getFiles(), items = [];
    while (files.hasNext()) {
      const file = files.next();
      if (!file.getName().startsWith('approved-media-')) continue;
      try {
        const meta = JSON.parse(file.getDescription());
        const item = { id: file.getId(), type: meta.type, caption: meta.caption, created: file.getDateCreated().getTime() };
        if (meta.type === 'instagram') item.url = reelUrl(meta.url);
        else if (meta.type === 'video') item.url = 'https://drive.google.com/file/d/' + file.getId() + '/preview';
        else continue;
        items.push(item);
      } catch (_) { /* Ignore unrelated or damaged records. */ }
    }
    items.sort((a, b) => b.created - a.created);
    return photoJson({ ok: true, mediaVersion: 2, maxVideoBytes: MEDIA_MAX_BYTES, items: items.slice(0, 24) });
  } catch (_) { return photoJson({ ok: false, error: 'Community videos are unavailable. Please try again later.' }); }
}
function mediaSubmit(data) {
  const lock = LockService.getScriptLock();
  try {
    if (data.consent !== true || typeof data.caption !== 'string' || !data.caption.trim() || data.caption.length > 100) throw new Error('Add a caption and confirm permission to share.');
    if (!/^[a-f0-9-]{36}$/i.test(data.requestId || '')) throw new Error('Invalid submission ID. Refresh and try again.');
    let bytes, mime, url;
    if (data.type === 'instagram') url = reelUrl(data.url);
    else if (data.type === 'video') {
      mime = data.mime;
      if (!['video/mp4', 'video/webm'].includes(mime) || typeof data.video !== 'string' || data.video.length > Math.ceil(MEDIA_MAX_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.video)) throw new Error('Choose an MP4 or WebM video no larger than 25 MB.');
      bytes = Utilities.base64Decode(data.video);
      if (bytes.length > MEDIA_MAX_BYTES || bytes.length < 12) throw new Error('Video must be no larger than 25 MB.');
      const signature = bytes.slice(4, 8).map(b => String.fromCharCode(b & 255)).join('');
      const webm = [26, 69, 223, 163].every((b, i) => (bytes[i] & 255) === b);
      if ((mime === 'video/mp4' && signature !== 'ftyp') || (mime === 'video/webm' && !webm)) throw new Error('The file is not a supported MP4 or WebM video.');
    } else throw new Error('Unsupported media type.');
    lock.waitLock(10000);
    const folder = photoFolder(), files = folder.getFiles(); let count = 0;
    while (files.hasNext()) {
      const file = files.next(); count++;
      if (!/^(pending|approved)-media-/.test(file.getName())) continue;
      try {
        const meta = JSON.parse(file.getDescription());
        if (meta.requestId === data.requestId || (url && meta.url === url)) return photoJson({ ok: true, pending: file.getName().startsWith('pending-'), duplicate: true });
      } catch (_) { /* Ignore unrelated metadata. */ }
    }
    if (count >= 300) throw new Error('The gallery is full. Please contact the committee.');
    const suffix = data.type === 'instagram' ? '.json' : mime === 'video/mp4' ? '.mp4' : '.webm';
    const name = 'pending-media-' + data.requestId + suffix;
    const blob = data.type === 'video' ? Utilities.newBlob(bytes, mime, name) : Utilities.newBlob(JSON.stringify({ url: url }), 'application/json', name);
    const file = folder.createFile(blob);
    file.setDescription(JSON.stringify({ type: data.type, caption: data.caption.trim(), url: url || '', requestId: data.requestId }));
    return photoJson({ ok: true, pending: true });
  } catch (error) { return photoJson({ ok: false, error: error.message || 'Submission failed.' }); }
  finally { if (lock.hasLock()) lock.releaseLock(); }
}
// Committee-only editor function. Never exposed through doGet or doPost.
// Set REVIEW_FILE_ID in Script properties, inspect the file, then run this function.
function approveSelectedMedia() {
  const id = PropertiesService.getScriptProperties().getProperty('REVIEW_FILE_ID');
  const files = photoFolder().getFiles(); let selected;
  while (files.hasNext()) { const file = files.next(); if (file.getId() === id) selected = file; }
  if (!selected || !selected.getName().startsWith('pending-media-')) throw new Error('Select a pending file from the dedicated gallery folder.');
  const meta = JSON.parse(selected.getDescription());
  if (meta.type === 'video') selected.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  else if (meta.type === 'instagram') reelUrl(meta.url);
  else throw new Error('Unsupported media type.');
  selected.setName(selected.getName().replace('pending-media-', 'approved-media-'));
}
