const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const files = [], props = { PHOTO_FOLDER_ID: 'folder' };
const iterator = values => { let index = 0; return { hasNext: () => index < values.length, next: () => values[index++] }; };
const folder = {
  getFiles: () => iterator(files),
  createFile(blob) {
    const file = { id: `file${files.length}`, name: blob.name, description: '', shared: false,
      getName() { return this.name; }, setName(value) { this.name = value; },
      getId() { return this.id; }, getDescription() { return this.description; },
      setDescription(value) { this.description = value; }, getDateCreated: () => new Date(),
      setSharing() { this.shared = true; }, getMimeType: () => blob.mime };
    files.push(file); return file;
  }
};
const ctx = {
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: key => props[key] }) },
  LockService: { getScriptLock: () => { let locked = false; return { waitLock() { locked = true; }, hasLock: () => locked, releaseLock() { locked = false; } }; } },
  Utilities: { base64Decode: text => Array.from(Buffer.from(text, 'base64')), newBlob: (data, mime, name) => ({ data, mime, name }) },
  DriveApp: { getFolderById: () => folder, Access: { ANYONE_WITH_LINK: 'public' }, Permission: { VIEW: 'view' } }
};
vm.runInNewContext(fs.readFileSync('photo-gallery.gs', 'utf8'), ctx);
const send = payload => ctx.doPost({ postData: { contents: JSON.stringify(payload) } });
const base = { action: 'submitMedia', requestId: '12345678-1234-1234-1234-123456789012', type: 'instagram', caption: 'Festival moment', consent: true, url: 'https://www.instagram.com/reels/ABC123xyz/?igsh=test' };
for (const url of ['https://instagram.com.evil.test/reel/ABC123/', 'javascript:alert(1)', 'https://www.instagram.com/person/', 'https://evil.test/reel/ABC123/', 'https://user@instagram.com/reel/ABC123/']) assert.equal(send({ ...base, url }).ok, false);
assert.equal(send({ ...base, consent: false }).ok, false);
assert.equal(send(base).pending, true);
assert.equal(files.length, 1);
assert.equal(JSON.parse(files[0].description).url, 'https://www.instagram.com/reel/ABC123xyz/');
assert.equal(send({ ...base, requestId: '22345678-1234-1234-1234-123456789012' }).duplicate, true);
assert.equal(ctx.mediaList().items.length, 0);
props.REVIEW_FILE_ID = 'file0'; ctx.approveSelectedMedia();
assert.equal(ctx.mediaList().items.length, 1);
assert.equal(files[0].shared, false);
const bytes = Buffer.alloc(12); bytes.write('ftyp', 4);
const video = { ...base, type: 'video', requestId: '32345678-1234-1234-1234-123456789012', mime: 'video/mp4', video: bytes.toString('base64') };
assert.equal(send({ ...video, mime: 'text/html' }).ok, false);
assert.equal(send({ ...video, video: Buffer.alloc(12).toString('base64') }).ok, false);
assert.equal(send(video).ok, true);
assert.equal(send(video).duplicate, true);
assert.equal(files.length, 2);
assert.equal(ctx.mediaList().items.length, 1);
props.REVIEW_FILE_ID = 'file1'; ctx.approveSelectedMedia();
assert.equal(files[1].shared, true);
assert.equal(ctx.mediaList().items.length, 2);
assert.match(ctx.mediaList().items.find(item => item.type === 'video').url, /drive\.google\.com\/file\/d\/file1\/preview/);
// Exercise the decoded byte boundary without allocating a 33 MB request string.
ctx.Utilities.base64Decode = () => ({ length: 25000001 });
assert.equal(ctx.mediaSubmit({ ...video, requestId: '42345678-1234-1234-1234-123456789012' }).ok, false);
ctx.Utilities.base64Decode = () => ({ length: 25000000, slice: () => [102, 116, 121, 112] });
assert.equal(ctx.mediaSubmit({ ...video, requestId: '42345678-1234-1234-1234-123456789012' }).ok, true);
assert.equal(ctx.doGet({ parameter: { action: 'media' } }).mediaVersion, 2);
console.log('PASS: Reel validation/canonicalization, duplicate prevention, consent, private pending entries, approval, video signatures, 25 MB boundary, and version discovery.');
