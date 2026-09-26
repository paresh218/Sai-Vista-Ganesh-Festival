// Deploy as a separate Apps Script web app. See PHOTO_GALLERY_SETUP.md.
function photoJson(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function photoFolder() {
  const id = PropertiesService.getScriptProperties().getProperty('PHOTO_FOLDER_ID');
  if (!id) throw new Error('Photo gallery is not configured.');
  return DriveApp.getFolderById(id);
}
function doGet() {
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
