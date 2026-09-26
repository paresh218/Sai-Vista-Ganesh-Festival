const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const owner = 'saivistaculturalcommittee@gmail.com';
const props = { PHOTO_FOLDER_ID: 'folder', MEDIA_APPROVAL_OWNER: owner };
const mails = [], files = [], threads = [], triggers = [];
let uuid = 0, sent = [];
const context = {
  console,
  Session: { getEffectiveUser: () => ({ getEmail: () => owner }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: key => props[key], setProperty: (key, value) => props[key] = value }) },
  Utilities: { getUuid: () => String(++uuid).padStart(32, 'a') },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  GmailApp: { getInboxUnreadCount: () => 0, sendEmail: (to, subject, body) => mails.push({ to, subject, body }), search: query => query.startsWith('in:sent') ? sent : threads },
  ScriptApp: { getProjectTriggers: () => triggers, newTrigger: name => ({ timeBased: () => ({ everyMinutes: n => ({ create: () => { assert.equal(n, 5); triggers.push({ getHandlerFunction: () => name }); } }) }) }) },
  DriveApp: { Access: { ANYONE_WITH_LINK: 'public' }, Permission: { VIEW: 'view' }, getFolderById: () => ({ getFiles: () => { let i = 0; return { hasNext: () => i < files.length, next: () => files[i++] }; } }) }
};
vm.runInNewContext(fs.readFileSync('photo-gallery.gs', 'utf8'), context);
function file(type, id) {
  return { name: 'pending-media-' + id, meta: { type, caption: 'Our festival', url: 'https://www.instagram.com/reel/ABC123/' }, viewers: [], shared: false,
    getId: () => id, getName() { return this.name; }, setName(name) { this.name = name; },
    getDescription() { return JSON.stringify(this.meta); }, setDescription(text) { this.meta = JSON.parse(text); },
    addViewer(email) { this.viewers.push(email); }, setSharing() { this.shared = true; } };
}
function message(overrides = {}) {
  const data = { from: 'Reviewer <freakypriyank@gmail.com>', token: 'secret', body: 'APPROVE\n\nOn yesterday somebody wrote:\n> REJECT', date: Date.now(), id: 'message1', auth: 'mx.google.com; dkim=pass; dmarc=pass (p=NONE) header.from=gmail.com;', draft: false, trash: false, ...overrides };
  return { getFrom: () => data.from, getSubject: () => 'Re: [SV-MEDIA ' + data.token + '] Sai Vista media review', getPlainBody: () => data.body,
    getDate: () => new Date(data.date), getId: () => data.id, isDraft: () => data.draft, isInTrash: () => data.trash,
    getHeader: key => key === 'Authentication-Results' ? data.auth : '<message1@mail.gmail.com>' };
}
const issued = Date.now() - 1000;
assert.equal(context.mediaReplyCommand(message(), 'secret', issued).command, 'APPROVE');
for (const overrides of [{ from: 'stranger@gmail.com' }, { body: '> APPROVE' }, { body: 'Thanks!\nAPPROVE' }, { body: 'Please approve' }, { token: 'wrong' }, { date: issued - 1 }, { date: issued + 31 * 86400000 }, { draft: true }, { trash: true }, { auth: 'mx.google.com; dmarc=fail header.from=gmail.com;' }, { auth: 'evil.test; dmarc=pass header.from=gmail.com;' }]) assert.equal(context.mediaReplyCommand(message(overrides), 'secret', issued), null);
const ownReply = message({ from: 'paresh218@gmail.com', auth: '' });
assert.equal(context.mediaReplyCommand(ownReply, 'secret', issued), null);
props.MEDIA_APPROVAL_OWNER = 'paresh218@gmail.com';
sent = [{ getMessages: () => [ownReply] }];
assert.equal(context.mediaReplyCommand(ownReply, 'secret', issued).command, 'APPROVE');
props.MEDIA_APPROVAL_OWNER = owner;
context.Session.getEffectiveUser = () => ({ getEmail: () => 'wrong@gmail.com' });
assert.throws(() => context.setupMediaEmailApprovals(), /Sign in as saivistaculturalcommittee/);
context.Session.getEffectiveUser = () => ({ getEmail: () => owner });
context.setupMediaEmailApprovals(); context.setupMediaEmailApprovals(); assert.equal(triggers.length, 1);
const video = file('video', 'video1'); files.push(video);
context.processMediaEmailApprovals();
assert.equal(mails.length, 2);
assert.deepEqual(video.viewers, ['paresh218@gmail.com', 'freakypriyank@gmail.com']);
assert.equal(video.shared, false);
assert.ok(video.name.startsWith('pending-'));
assert.equal(context.mediaReplyCommand(message({ body: mails[0].body, token: video.meta.reviewToken }), video.meta.reviewToken, video.meta.reviewIssuedAt), null);
context.processMediaEmailApprovals(); assert.equal(mails.length, 2);
threads.push({ getMessages: () => [message({ token: video.meta.reviewToken, date: video.meta.reviewIssuedAt + 1 })] });
context.processMediaEmailApprovals();
assert.ok(video.name.startsWith('approved-')); assert.equal(video.shared, true); assert.equal(mails.length, 3);
context.processMediaEmailApprovals(); assert.equal(mails.length, 3);
const reel = file('instagram', 'reel2'); files.push(reel);
context.processMediaEmailApprovals();
threads.push({ getMessages: () => [message({ token: reel.meta.reviewToken, body: 'REJECT', date: reel.meta.reviewIssuedAt + 1 }), message({ token: reel.meta.reviewToken, body: 'APPROVE', date: reel.meta.reviewIssuedAt + 2 })] });
context.processMediaEmailApprovals();
assert.ok(reel.name.startsWith('rejected-')); assert.equal(reel.shared, false); assert.equal(reel.meta.reviewDecision, 'REJECTED');
const count = mails.length; context.processMediaEmailApprovals(); assert.equal(mails.length, count);
console.log('PASS: exact approved senders, authenticated replies, owner Sent verification, draft/quoted/expired rejection, single trigger, private review access, two notifications, first-decision wins, publish/reject, and retry idempotence.');
