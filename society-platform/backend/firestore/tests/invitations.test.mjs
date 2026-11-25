import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, setLogLevel, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8185') throw new Error('Invitation tests require isolated Firestore at 127.0.0.1:8185.');
setLogLevel('silent');
let environment;
const db = (uid, verified = true) => environment.authenticatedContext(uid, { email: `${uid}@example.test`, email_verified: verified }).firestore();
const invitation = (changes = {}) => ({ schemaVersion: 1, email: 'guest@example.test', role: 'admin', status: 'pending', createdBy: 'owner', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 86400000), ...changes });
const inviteRef = (database, id = 'invite', tenant = 'alpha') => doc(database, 'societies', tenant, 'invitations', id);
async function issue(changes = {}, id = 'invite') { await setDoc(inviteRef(db('owner'), id), invitation(changes)); }
async function accept(database, uid = 'guest', id = 'invite', tenant = 'alpha', changes = {}, consume = true) {
  const batch = writeBatch(database);
  batch.set(doc(database, 'societies', tenant, 'members', uid), { schemaVersion: 1, email: `${uid}@example.test`, role: 'admin', status: 'active', invitationId: id, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...changes });
  if (consume) batch.update(inviteRef(database, id, tenant), { status: 'accepted', acceptedBy: uid, updatedAt: serverTimestamp() });
  return batch.commit();
}
before(async () => { environment = await initializeTestEnvironment({ projectId: 'demo-society-invitation-tests', firestore: { host: '127.0.0.1', port: 8185, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } }); });
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async context => {
    for (const tenant of ['alpha', 'beta']) {
      await setDoc(doc(context.firestore(), 'societies', tenant), { directoryVisible: true });
      for (const [uid, role] of [['owner', 'owner'], ['admin', 'admin'], ['resident', 'resident']]) await setDoc(doc(context.firestore(), 'societies', tenant, 'members', uid), { role, status: 'active' });
    }
    await setDoc(doc(context.firestore(), 'platformRoles', 'super'), { role: 'superadmin', status: 'active' });
  });
});
after(async () => environment?.cleanup());

test('only a verified active owner issues bounded member/admin invitations', async () => {
  await assertSucceeds(issue());
  await assertSucceeds(issue({ role: 'resident' }, 'member'));
  for (const uid of ['admin', 'resident', 'guest', 'super']) await assertFails(setDoc(inviteRef(db(uid), uid), invitation({ createdBy: uid })));
  await assertFails(setDoc(inviteRef(db('owner', false), 'unverified'), invitation()));
  for (const changes of [{ role: 'owner' }, { role: 'superadmin' }, { createdBy: 'admin' }, { status: 'accepted' }, { email: '' }, { email: 'bad' }, { extra: 'private' }, { expiresAt: Timestamp.fromMillis(Date.now() - 1000) }, { expiresAt: Timestamp.fromMillis(Date.now() + 8 * 86400000) }]) await assertFails(issue(changes, `bad-${Math.random()}`));
});
test('invitation contacts are private to their recipient, owner and platform superadmin', async () => {
  await issue();
  for (const uid of ['guest', 'owner', 'super']) await assertSucceeds(getDoc(inviteRef(db(uid))));
  for (const uid of ['admin', 'resident', 'other']) await assertFails(getDoc(inviteRef(db(uid))));
  await assertFails(getDoc(inviteRef(environment.unauthenticatedContext().firestore())));
  await assertSucceeds(getDocs(query(collection(db('owner'), 'societies/alpha/invitations'), limit(20))));
  await assertSucceeds(getDocs(query(collection(db('super'), 'societies/alpha/invitations'), limit(20))));
  await assertFails(getDocs(query(collection(db('guest'), 'societies/alpha/invitations'), limit(20))));
  await assertFails(getDocs(collection(db('owner'), 'societies/alpha/invitations')));
});
test('recipient atomically accepts once and cannot change role, tenant, email or identity', async () => {
  await issue();
  await assertFails(accept(db('guest', false)));
  await assertFails(accept(db('other'), 'other'));
  await assertFails(accept(db('guest'), 'guest', 'invite', 'beta'));
  await assertFails(accept(db('guest'), 'guest', 'invite', 'alpha', { role: 'owner' }));
  await assertFails(accept(db('guest'), 'guest', 'invite', 'alpha', { email: 'other@example.test' }));
  await assertFails(accept(db('guest'), 'guest', 'invite', 'alpha', {}, false));
  await assertFails(updateDoc(inviteRef(db('guest')), { status: 'accepted', acceptedBy: 'guest', updatedAt: serverTimestamp() }));
  await assertSucceeds(accept(db('guest')));
  await assertFails(accept(db('guest')));
  await assertSucceeds(getDocs(query(collection(db('guest'), 'societies/alpha/members'), limit(20))));
  await assertFails(getDocs(query(collection(db('guest'), 'societies/beta/members'), limit(20))));
});
test('pending resident can accept a member invitation while creation history stays immutable', async () => {
  const database = db('guest');
  const createdAt = Timestamp.fromMillis(1000);
  await environment.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'societies/alpha/members/guest'), { schemaVersion: 1, email: 'guest@example.test', role: 'resident', status: 'pending', createdAt, updatedAt: createdAt }));
  await issue({ role: 'resident' });
  await assertFails(accept(database, 'guest', 'invite', 'alpha', { role: 'resident' }));
  await assertSucceeds(accept(database, 'guest', 'invite', 'alpha', { role: 'resident', createdAt }));
});
test('cancellation, expiration and issuer revocation block acceptance and preserve invitation history', async () => {
  await issue();
  for (const change of [{ email: 'other@example.test' }, { role: 'owner' }, { expiresAt: Timestamp.fromMillis(Date.now() + 86400000) }, { createdBy: 'admin' }]) await assertFails(updateDoc(inviteRef(db('owner')), { ...change, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(inviteRef(db('admin')), { status: 'cancelled', updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(inviteRef(db('owner')), { status: 'cancelled', updatedAt: serverTimestamp() }));
  await assertFails(accept(db('guest')));
  await assertFails(updateDoc(inviteRef(db('owner')), { status: 'pending', updatedAt: serverTimestamp() }));
  await issue({}, 'expired');
  await environment.withSecurityRulesDisabled(context => updateDoc(inviteRef(context.firestore(), 'expired'), { expiresAt: Timestamp.fromMillis(1) }));
  await assertFails(accept(db('guest'), 'guest', 'expired'));
  await issue({}, 'revoked-owner');
  await environment.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'societies/alpha/members/owner'), { status: 'revoked' }));
  await assertFails(accept(db('guest'), 'guest', 'revoked-owner'));
});
test('simultaneous acceptance consumes one invitation once and preserves tenant-scoped issuer authority', async () => {
  await environment.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'societies/beta/members/beta-owner'), { role: 'owner', status: 'active' }));
  await assertFails(setDoc(inviteRef(db('beta-owner')), invitation({ createdBy: 'beta-owner' })));
  await issue();
  const results = await Promise.allSettled([accept(db('guest')), accept(db('guest'))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal((await getDoc(inviteRef(db('guest')))).data().acceptedBy, 'guest');
});
test('invitations cannot reactivate revoked users, overwrite active memberships or promote existing owners', async () => {
  for (const [uid, role, status] of [['revoked', 'resident', 'revoked'], ['resident', 'resident', 'active'], ['owner', 'owner', 'active']]) {
    await environment.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'societies/alpha/members', uid), { schemaVersion: 1, email: `${uid}@example.test`, role, status, createdAt: Timestamp.fromMillis(1), updatedAt: Timestamp.fromMillis(1) }));
    await issue({ email: `${uid}@example.test` }, uid);
    await assertFails(accept(db(uid), uid, uid));
  }
});
