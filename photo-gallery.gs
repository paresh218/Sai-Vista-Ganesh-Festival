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
      if (!/^(pending|approved|rejected)-media-/.test(file.getName())) continue;
      try {
        const meta = JSON.parse(file.getDescription());
        if (meta.requestId === data.requestId || (url && meta.url === url)) {
          if (file.getName().startsWith('rejected-')) return photoJson({ ok: false, error: 'The committee declined this submission. Please contact the committee before submitting it again.' });
          return photoJson({ ok: true, pending: file.getName().startsWith('pending-'), duplicate: true });
        }
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

// Email approvals are run only by an owner-installed trigger, never a public request.
const MEDIA_REVIEWERS = ['paresh218@gmail.com', 'freakypriyank@gmail.com'];
const MEDIA_SERVICE_ACCOUNT = 'saivistaculturalcommittee@gmail.com';
function setupMediaEmailApprovals() {
  // Run once from the editor as the same Google account that owns the deployment.
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== MEDIA_SERVICE_ACCOUNT) throw new Error('Sign in as ' + MEDIA_SERVICE_ACCOUNT + ' to authorize and activate email approvals.');
  GmailApp.getInboxUnreadCount(); // Request Gmail authorization before installing the trigger.
  const props = PropertiesService.getScriptProperties();
  props.setProperty('MEDIA_APPROVAL_OWNER', Session.getEffectiveUser().getEmail().toLowerCase());
  const existing = ScriptApp.getProjectTriggers().filter(trigger => trigger.getHandlerFunction() === 'processMediaEmailApprovals');
  if (!existing.length) ScriptApp.newTrigger('processMediaEmailApprovals').timeBased().everyMinutes(5).create();
  processMediaEmailApprovals();
}
function mediaReplyCommand(message, token, issuedAt) {
  if (message.isDraft() || message.isInTrash()) return null;
  const from = String(message.getFrom()).trim().toLowerCase();
  const address = /<([^<>]+)>$/.exec(from);
  const sender = address ? address[1] : from;
  if (!MEDIA_REVIEWERS.includes(sender)) return null;
  if (!message.getSubject().includes('[SV-MEDIA ' + token + ']')) return null;
  if (message.getDate().getTime() < issuedAt || message.getDate().getTime() > issuedAt + 30 * 86400000) return null;
  // Only an explicit first-line command counts. Quoted messages cannot approve a file.
  const firstLine = String(message.getPlainBody()).trim().split(/\r?\n/)[0].trim();
  if (!/^(APPROVE|REJECT)$/i.test(firstLine)) return null;
  // Incoming Gmail replies must pass Google's sender authentication. For the
  // deployment owner's own reply, verify the exact message is in Sent instead.
  const auth = String(message.getHeader('Authentication-Results'));
  const authenticated = /^\s*mx\.google\.com\s*;/i.test(auth) && /\bdmarc=pass\b[^;]*\bheader\.from=gmail\.com(?:\s|;|$)/i.test(auth);
  if (!authenticated) {
    const owner = PropertiesService.getScriptProperties().getProperty('MEDIA_APPROVAL_OWNER');
    const messageId = String(message.getHeader('Message-ID')).replace(/^<|>$/g, '');
    if (sender !== owner || !/^[A-Za-z0-9_.+@=-]+$/.test(messageId)) return null;
    const sent = GmailApp.search('in:sent rfc822msgid:' + messageId, 0, 5);
    if (!sent.some(thread => thread.getMessages().some(item => item.getId() === message.getId()))) return null;
  }
  return { command: firstLine.toUpperCase(), sender: sender, messageId: message.getId(), date: message.getDate().getTime() };
}
function mediaReviewSubject(meta) { return '[SV-MEDIA ' + meta.reviewToken + '] Sai Vista media review'; }
function queueMediaReviewEmail(file, meta) {
  if (!meta.reviewToken) {
    meta.reviewToken = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    meta.reviewIssuedAt = Date.now(); meta.reviewNotified = [];
    file.setDescription(JSON.stringify(meta));
  }
  for (const email of MEDIA_REVIEWERS) {
    if ((meta.reviewNotified || []).includes(email)) continue;
    // Reviewers can inspect pending videos without making them public.
    if (meta.type === 'video') file.addViewer(email);
    const preview = meta.type === 'instagram' ? reelUrl(meta.url) : 'https://drive.google.com/file/d/' + file.getId() + '/view';
    const body = 'New Sai Vista submission awaiting your review.\n\n' +
      'Type: ' + (meta.type === 'instagram' ? 'Instagram Reel' : 'Video') + '\n' +
      'Caption (submitted by a resident):\n' + meta.caption + '\n\n' +
      'Review: ' + preview + '\n\n' +
      'After reviewing, reply to THIS email with APPROVE or REJECT as the first line. Keep the subject unchanged. Either authorised reviewer can decide; the first valid reply processed is final.\n\n' +
      'Approved videos are made viewable by anyone with their link and appear on the Sai Vista website. Instagram Reels still depend on public access and embedding permission.\n\n' +
      'Replies are checked approximately every 5 minutes. This request expires after 30 days. Do not forward this review email.\n\nSai Vista Cultural Committee';
    GmailApp.sendEmail(email, mediaReviewSubject(meta), body, { name: 'Sai Vista Cultural Committee' });
    meta.reviewNotified = (meta.reviewNotified || []).concat(email);
    file.setDescription(JSON.stringify(meta));
  }
}
function notifyMediaDecision(file, meta) {
  if (meta.decisionNotified || !meta.reviewDecision) return;
  GmailApp.sendEmail(MEDIA_REVIEWERS.join(','), 'Sai Vista media ' + meta.reviewDecision.toLowerCase(),
    'The submission “' + meta.caption + '” was ' + meta.reviewDecision.toLowerCase() + ' by ' + meta.reviewedBy + '.\n\n' +
    (meta.reviewDecision === 'APPROVED' ? 'It is now included in the website media feed. Refresh videos to see it. Instagram/Google control playback availability.' : 'It will not appear on the website.') +
    '\n\nhttps://saivistaculturalcommittee.in/#communityPhotos', { name: 'Sai Vista Cultural Committee' });
  meta.decisionNotified = true; file.setDescription(JSON.stringify(meta));
}
function processMediaEmailApprovals() {
  const props = PropertiesService.getScriptProperties();
  const owner = props.getProperty('MEDIA_APPROVAL_OWNER');
  if (owner !== MEDIA_SERVICE_ACCOUNT || owner !== Session.getEffectiveUser().getEmail().toLowerCase()) throw new Error('Run setupMediaEmailApprovals as ' + MEDIA_SERVICE_ACCOUNT + ' first.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const iterator = photoFolder().getFiles(), queue = [];
    while (iterator.hasNext()) {
      const file = iterator.next();
      if (!/^(pending|approved|rejected)-media-/.test(file.getName())) continue;
      try {
        const meta = JSON.parse(file.getDescription());
        if (file.getName().startsWith('pending-') || (meta.reviewDecision && !meta.decisionNotified)) queue.push({ file: file, meta: meta });
      } catch (_) { /* Ignore unrelated files. */ }
    }
    queue.sort((a, b) => a.file.getId().localeCompare(b.file.getId()));
    // Bound work and rotate through a backlog to stay within Apps Script runtime quotas.
    const cursor = Number(props.getProperty('MEDIA_REVIEW_CURSOR') || 0);
    for (let i = 0; i < Math.min(10, queue.length); i++) {
      const entry = queue[(cursor + i) % queue.length], file = entry.file, meta = entry.meta;
      try {
        if (!file.getName().startsWith('pending-')) { notifyMediaDecision(file, meta); continue; }
        if (meta.reviewDecision) {
          file.setName(file.getName().replace('pending-media-', meta.reviewDecision === 'APPROVED' ? 'approved-media-' : 'rejected-media-'));
          notifyMediaDecision(file, meta); continue;
        }
        queueMediaReviewEmail(file, meta);
        if (Date.now() > meta.reviewIssuedAt + 30 * 86400000) continue;
        const threads = GmailApp.search('-in:spam -in:trash -in:drafts subject:"SV-MEDIA ' + meta.reviewToken + '" {from:paresh218@gmail.com from:freakypriyank@gmail.com}', 0, 20);
        const replies = [];
        for (const thread of threads) for (const message of thread.getMessages()) {
          const decision = mediaReplyCommand(message, meta.reviewToken, meta.reviewIssuedAt);
          if (decision) replies.push(decision);
        }
        replies.sort((a, b) => a.date - b.date || a.messageId.localeCompare(b.messageId));
        if (!replies.length) continue;
        const decision = replies[0];
        if (decision.command === 'APPROVE') {
          if (meta.type === 'video') file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          else reelUrl(meta.url);
        }
        meta.reviewDecision = decision.command === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        meta.reviewedBy = decision.sender; meta.reviewedAt = new Date().toISOString(); meta.reviewMessageId = decision.messageId;
        file.setDescription(JSON.stringify(meta));
        file.setName(file.getName().replace('pending-media-', decision.command === 'APPROVE' ? 'approved-media-' : 'rejected-media-'));
        notifyMediaDecision(file, meta);
      } catch (error) {
        // Keep pending submissions retryable; failures are visible in Apps Script executions.
        console.error('Media review failed for ' + file.getId() + ': ' + error.message);
      }
    }
    props.setProperty('MEDIA_REVIEW_CURSOR', String(queue.length ? (cursor + 10) % queue.length : 0));
  } finally { lock.releaseLock(); }
}
