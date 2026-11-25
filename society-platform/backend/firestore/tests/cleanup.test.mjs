import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, setLogLevel, updateDoc } from 'firebase/firestore';
import { processCleanup } from '../../accounts/cleanup.mjs';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8185') throw new Error('Cleanup tests require isolated Firestore.');
setLogLevel('silent');
let environment;
const calls = [];
const adapter = { lookupUser: async uid => ({ uid, email: 'guest@example.test' }), disableUser: async uid => { calls.push(`disable:${uid}`); }, deleteUser: async uid => { calls.push(`delete:${uid}`); } };
before(async () => { environment = await initializeTestEnvironment({ projectId: 'demo-society-cleanup-tests', firestore: { host: '127.0.0.1', port: 8185, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } }); });
beforeEach(async () => {
  calls.length = 0; await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async context => {
    const database = context.firestore();
    await setDoc(doc(database, 'accountCleanupRequests/job'), { uid: 'guest', status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await setDoc(doc(database, 'societies/alpha'), { schemaVersion: 2, ownerUid: 'someone-else', directoryVisible: true });
    await setDoc(doc(database, 'societies/alpha/members/guest'), { role: 'resident', status: 'active', email: 'guest@example.test' });
    await setDoc(doc(database, 'societies/alpha/invitations/invite'), { email: 'guest@example.test', status: 'pending', createdBy: 'other' });
    await setDoc(doc(database, 'societies/alpha/events/shared'), { title: 'Shared history' });
    await setDoc(doc(database, 'users/guest'), { displayName: 'Private profile' });
  });
});
after(async () => environment?.cleanup());
test('cleanup removes profile/membership, redacts contacts, preserves shared data and writes a minimal audit', async () => {
  await environment.withSecurityRulesDisabled(async context => {
    const database = context.firestore();
    assert.equal((await processCleanup(database, 'job', 'local-reviewer', adapter)).status, 'completed');
    assert.deepEqual(calls, ['disable:guest', 'delete:guest']);
    for (const path of ['users/guest', 'societies/alpha/members/guest']) assert.equal((await getDoc(doc(database, path))).exists(), false);
    assert.equal((await getDoc(doc(database, 'societies/alpha/events/shared'))).data().title, 'Shared history');
    assert.equal((await getDoc(doc(database, 'societies/alpha/invitations/invite'))).data().email, null);
    const audit = (await getDoc(doc(database, 'accountCleanupAudit/job'))).data();
    assert.equal(audit.status, 'completed'); assert.equal(audit.actor, 'local-reviewer'); assert.equal(audit.email, undefined);
    await processCleanup(database, 'job', 'local-reviewer', adapter);
    assert.equal(calls.length, 2);
  });
  const client = environment.authenticatedContext('guest', { email_verified: true }).firestore();
  await assertFails(getDoc(doc(client, 'users/guest')));
  await assertFails(setDoc(doc(client, 'users/guest'), { schemaVersion: 1, displayName: 'Resurrect', language: 'en', updatedAt: serverTimestamp() }));
});
test('owners and platform superadmins are blocked before any destructive work', async () => {
  for (const owner of [true, false]) await environment.withSecurityRulesDisabled(async context => {
    const database = context.firestore();
    await updateDoc(doc(database, 'accountCleanupRequests/job'), { status: 'pending' });
    if (owner) await updateDoc(doc(database, 'societies/alpha'), { ownerUid: 'guest' });
    else { await updateDoc(doc(database, 'societies/alpha'), { ownerUid: 'someone-else' }); await setDoc(doc(database, 'platformRoles/guest'), { role: 'superadmin', status: 'active' }); }
    assert.equal((await processCleanup(database, 'job', 'reviewer', adapter)).status, 'blocked');
    assert.equal((await getDoc(doc(database, 'users/guest'))).exists(), true);
    assert.equal((await getDoc(doc(database, 'accountStates/guest'))).data().status, 'active');
    assert.deepEqual(calls, []);
  });
});
test('worker failure preserves frozen access and supports an explicit retry', async () => {
  await environment.withSecurityRulesDisabled(async context => {
    const database = context.firestore();
    await assert.rejects(processCleanup(database, 'job', 'reviewer', { ...adapter, deleteUser: async () => { throw new Error('auth failure'); } }));
    assert.equal((await getDoc(doc(database, 'accountCleanupRequests/job'))).data().status, 'failed');
    assert.equal((await getDoc(doc(database, 'accountStates/guest'))).data().status, 'deleting');
    assert.equal((await processCleanup(database, 'job', 'reviewer', adapter)).status, 'completed');
  });
});
test('cancelled jobs, missing reviewers and concurrent claims cannot run twice', async () => {
  await environment.withSecurityRulesDisabled(async context => {
    const database = context.firestore();
    await assert.rejects(processCleanup(database, 'job', '', adapter));
    await updateDoc(doc(database, 'accountCleanupRequests/job'), { status: 'cancelled' });
    await assert.rejects(processCleanup(database, 'job', 'reviewer', adapter));
    await updateDoc(doc(database, 'accountCleanupRequests/job'), { status: 'pending' });
    await Promise.allSettled([processCleanup(database, 'job', 'one', adapter), processCleanup(database, 'job', 'two', adapter)]);
    assert.equal(calls.filter(call => call === 'delete:guest').length, 1);
  });
});
test('different cleanup requests for one identity cannot bypass the account lock or reset deleted state', async () => {
  await environment.withSecurityRulesDisabled(async context => {
    const database = context.firestore();
    await setDoc(doc(database, 'accountStates/guest'), { status: 'deleting', requestId: 'other' });
    await assert.rejects(processCleanup(database, 'job', 'reviewer', adapter), /Another cleanup/);
    await updateDoc(doc(database, 'accountStates/guest'), { status: 'deleted' });
    await assert.rejects(processCleanup(database, 'job', 'reviewer', adapter), /Another cleanup/);
    assert.deepEqual(calls, []);
  });
  const client = environment.authenticatedContext('guest', { email_verified: true }).firestore();
  await assertFails(setDoc(doc(client, 'accountStates/guest'), { status: 'active' }));
});
