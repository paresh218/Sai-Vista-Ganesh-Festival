import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, setLogLevel, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8185') throw new Error('Ownership tests require isolated Firestore.');
setLogLevel('silent');
let environment;
const db = (uid, verified = true) => environment.authenticatedContext(uid, { email_verified: verified, email: `${uid}@example.test` }).firestore();
const transferRef = (database, id = 'request', society = 'alpha') => doc(database, 'societies', society, 'ownershipTransfers', id);
const request = (changes = {}) => ({ schemaVersion: 1, fromUid: 'owner', toUid: 'admin', status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 86400000), ...changes });
async function issue(changes = {}, id = 'request') { return setDoc(transferRef(db('owner'), id), request(changes)); }
function accept(database, id = 'request', omit = '', society = 'alpha') {
  const batch = writeBatch(database);
  if (omit !== 'root') batch.update(doc(database, 'societies', society), { ownerUid: 'admin', ownershipTransferId: id, updatedAt: serverTimestamp() });
  if (omit !== 'old') batch.update(doc(database, 'societies', society, 'members', 'owner'), { role: 'admin', ownershipTransferId: id, updatedAt: serverTimestamp() });
  if (omit !== 'new') batch.update(doc(database, 'societies', society, 'members', 'admin'), { role: 'owner', ownershipTransferId: id, updatedAt: serverTimestamp() });
  if (omit !== 'request') batch.update(transferRef(database, id, society), { status: 'accepted', updatedAt: serverTimestamp() });
  return batch.commit();
}
before(async () => { environment = await initializeTestEnvironment({ projectId: 'demo-society-ownership-tests', firestore: { host: '127.0.0.1', port: 8185, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } }); });
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async context => {
    for (const society of ['alpha', 'beta']) {
      await setDoc(doc(context.firestore(), 'societies', society), { schemaVersion: 2, ownerUid: society === 'alpha' ? 'owner' : 'other-owner', directoryVisible: true, updatedAt: Timestamp.fromMillis(1) });
      for (const [uid, role, status] of [['owner', 'owner', 'active'], ['admin', 'admin', 'active'], ['resident', 'resident', 'active'], ['revoked', 'admin', 'revoked']]) await setDoc(doc(context.firestore(), 'societies', society, 'members', uid), { schemaVersion: 1, role, status, email: `${uid}@example.test`, createdAt: Timestamp.fromMillis(1), updatedAt: Timestamp.fromMillis(1) });
    }
  });
});
after(async () => environment?.cleanup());

test('only the designated verified owner can nominate an active admin with bounded immutable fields', async () => {
  await assertSucceeds(issue());
  for (const uid of ['admin', 'resident', 'other']) await assertFails(setDoc(transferRef(db(uid), uid), request({ fromUid: uid })));
  await assertFails(setDoc(transferRef(db('owner', false), 'unverified'), request()));
  for (const changes of [{ toUid: 'owner' }, { toUid: 'resident' }, { toUid: 'revoked' }, { fromUid: 'other' }, { status: 'accepted' }, { expiresAt: Timestamp.fromMillis(1) }, { expiresAt: Timestamp.fromMillis(Date.now() + 8 * 86400000) }, { extra: 'no' }]) await assertFails(issue(changes, `bad-${Math.random()}`));
});
test('only nominee can accept a complete atomic role swap, retaining history and an active owner', async () => {
  await issue();
  await assertFails(accept(db('owner')));
  await assertFails(accept(db('admin', false)));
  for (const omit of ['root', 'old', 'new', 'request']) await assertFails(accept(db('admin'), 'request', omit));
  await assertFails(accept(db('admin'), 'request', '', 'beta'));
  await assertSucceeds(accept(db('admin')));
  assert.equal((await getDoc(doc(db('admin'), 'societies/alpha/members/owner'))).data().role, 'admin');
  assert.equal((await getDoc(doc(db('admin'), 'societies/alpha/members/admin'))).data().role, 'owner');
  assert.equal((await getDoc(doc(db('admin'), 'societies/alpha'))).data().ownerUid, 'admin');
  await assertFails(accept(db('admin')));
  await assertFails(issue({}, 'stale-owner'));
  await assertFails(updateDoc(transferRef(db('admin')), { status: 'pending', updatedAt: serverTimestamp() }));
});
test('cancelled, expired and revoked nominees cannot accept; arbitrary role/root edits stay denied', async () => {
  await issue();
  await assertFails(updateDoc(transferRef(db('admin')), { status: 'cancelled', updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(transferRef(db('owner')), { status: 'cancelled', updatedAt: serverTimestamp() }));
  await assertFails(accept(db('admin')));
  await issue({}, 'expired');
  await environment.withSecurityRulesDisabled(context => updateDoc(transferRef(context.firestore(), 'expired'), { expiresAt: Timestamp.fromMillis(1) }));
  await assertFails(accept(db('admin'), 'expired'));
  await issue({}, 'revoked');
  await environment.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'societies/alpha/members/admin'), { status: 'revoked' }));
  await assertFails(accept(db('admin'), 'revoked'));
  await assertFails(updateDoc(doc(db('owner'), 'societies/alpha'), { ownerUid: 'resident', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db('owner'), 'societies/alpha/members/resident'), { role: 'owner', updatedAt: serverTimestamp() }));
});
test('transfer details are private to owner, nominee and platform superadmin', async () => {
  await issue();
  await assertSucceeds(getDoc(transferRef(db('owner'))));
  await assertSucceeds(getDoc(transferRef(db('admin'))));
  await assertFails(getDoc(transferRef(db('resident'))));
  await assertFails(getDoc(transferRef(environment.unauthenticatedContext().firestore())));
});
