const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let created = 0, released = 0, caption = '';
const context = {
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: value => ({ setMimeType: () => JSON.parse(value) }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'test-folder' }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, hasLock: () => true, releaseLock: () => released++ }) },
  Utilities: { base64Decode: value => [...Buffer.from(value, 'base64')], newBlob: value => value, getUuid: () => 'test-id' },
  DriveApp: { getFolderById: () => ({ getFiles: () => ({ hasNext: () => false }), createFile: () => { created++; return { setDescription: value => caption = value }; } }) }
};
vm.runInNewContext(fs.readFileSync('photo-gallery.gs', 'utf8'), context);
const submit = payload => context.doPost({ postData: { contents: JSON.stringify(payload) } });
const valid = { image: 'data:image/jpeg;base64,/9j/2Q==', caption: '<script>caption</script>', consent: true };
assert.equal(submit({ ...valid, consent: false }).ok, false);
assert.equal(submit({ ...valid, image: 'data:image/jpeg;base64,YWJjZA==' }).ok, false);
assert.equal(submit({ ...valid, caption: '' }).ok, false);
assert.equal(submit({ ...valid, caption: 'a'.repeat(101) }).ok, false);
assert.equal(created, 0);
assert.equal(submit(valid).ok, true);
assert.equal(created, 1);
assert.equal(caption, valid.caption);
assert.equal(context.doGet().photos.length, 0);
assert.ok(released > 0);
console.log('PASS: shared photo service rejects missing consent, invalid JPEG and invalid captions; valid upload reaches storage; empty gallery is supported.');
