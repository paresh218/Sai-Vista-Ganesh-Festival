const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function harness() {
  const nodes = new Map(), calls = [], events = [], handlers = {};
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, { id, value: '', checked: true, hidden: false, disabled: false, files: [], dataset: {},
      addEventListener(type, fn) { this[type] = fn; }, setAttribute() {}, removeAttribute() {}, pause() {}, load() {}, focus() {} });
    return nodes.get(id);
  }
  const ids = ['communityPhotoFile','uploadCommunityPhoto','photoStatus','uploadPreview','uploadPhotoPreview','uploadVideoPreview','uploadFileSummary','clearUploadFile','communityPhotoCaption','communityPhotoConsent'];
  const form = node('communityPhotoForm'); form.elements = ids.map(node); form.reset = () => { node('communityPhotoFile').files = []; };
  const window = { SaiVistaPhotos: { endpoint: 'https://test.invalid/exec' }, SaiVistaMediaReady: true, addEventListener: (type, fn) => handlers[type] = fn, dispatchEvent: event => events.push(event.type) };
  const ctx = { window, document: { getElementById: node, createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,/9j/2Q==' }) },
    URL: { createObjectURL: () => 'blob:preview', revokeObjectURL() {} }, createImageBitmap: async () => ({ width: 100, height: 100, close() {} }),
    FileReader: class { readAsDataURL() { this.result = 'data:video/mp4;base64,AAAAZnR5cA=='; this.onload(); } },
    AbortSignal: { timeout() {} }, crypto: { randomUUID: () => 'fixed-request-id' }, Event: class { constructor(type) { this.type = type; } },
    fetch: async (url, options) => { calls.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ ok: true, pending: true }) }; } };
  vm.runInNewContext(fs.readFileSync('community-upload.js', 'utf8'), ctx);
  const choose = (type, size) => { node('communityPhotoFile').files = [{ type, size, name: 'test' }]; node('communityPhotoFile').change(); };
  const submit = () => { node('communityPhotoCaption').value = 'Celebrating together'; return form.submit({ preventDefault() {} }); };
  return { node, choose, submit, calls, events };
}
(async () => {
  const h = harness();
  h.choose('image/png', 10000001); assert.equal(h.node('uploadCommunityPhoto').disabled, true);
  h.choose('video/mp4', 25000001); assert.equal(h.node('uploadCommunityPhoto').disabled, true);
  h.choose('text/html', 10); assert.equal(h.node('uploadCommunityPhoto').disabled, true);
  h.choose('image/png', 10000000); assert.equal(h.node('uploadPhotoPreview').hidden, false);
  await h.submit(); assert.ok(h.calls[0].image); assert.equal(h.calls[0].action, undefined); assert.ok(h.events.includes('sai-vista-photo-uploaded'));
  h.choose('video/mp4', 25000000); assert.equal(h.node('uploadCommunityPhoto').disabled, false); assert.equal(h.node('uploadVideoPreview').hidden, false);
  await h.submit(); assert.equal(h.calls[1].type, 'video'); assert.equal(h.calls[1].action, 'submitMedia'); assert.equal(h.calls[1].consent, true); assert.ok(h.calls[1].video);
  h.choose('image/jpeg', 100); h.node('communityPhotoConsent').checked = false; await h.submit(); assert.equal(h.calls.length, 2);
  console.log('PASS: one uploader handles both payloads, previews and reset, photo/video size boundaries, unsupported files, and permission validation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
