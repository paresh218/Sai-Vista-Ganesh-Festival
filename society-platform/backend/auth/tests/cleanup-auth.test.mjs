import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emulatorAuth } from '../../accounts/emulator-auth.mjs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { processCleanup } from '../../accounts/cleanup.mjs';

test('cleanup Auth adapter refuses other hosts/projects and disables then deletes an actual isolated emulator identity', async () => {
  assert.throws(() => emulatorAuth('production', '127.0.0.1:9199'));
  assert.throws(() => emulatorAuth('demo-society-cleanup-auth-tests', '127.0.0.1:9099'));
  assert.throws(() => emulatorAuth('demo-society-cleanup-auth-tests', 'example.com:9199'));
  const projectId = 'demo-society-cleanup-auth-tests';
  const adapter = emulatorAuth(projectId);
  {
    const email = `cleanup-${Date.now()}@example.test`;
    const password = 'Local-disposable-test-123!';
    const response = await fetch(`http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer owner' }, body: JSON.stringify({ email, password }) });
    assert.equal(response.ok, true);
    const user = await response.json();
    assert.equal((await adapter.lookupUser(user.localId)).email, email);
    await adapter.disableUser(user.localId);
    assert.equal((await adapter.lookupUser(user.localId)).disabled, true);
    await adapter.deleteUser(user.localId);
    assert.equal(await adapter.lookupUser(user.localId), null);
    const secondResponse = await fetch(`http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer owner' }, body: JSON.stringify({ email: `second-${email}`, password }) });
    assert.equal(secondResponse.ok, true);
    const second = await secondResponse.json();
    if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8185') throw new Error('Cleanup integration requires isolated Firestore.');
    const environment = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8185 } });
    try {
      await environment.withSecurityRulesDisabled(async context => {
        const database = context.firestore();
        await setDoc(doc(database, 'accountCleanupRequests/full-job'), { uid: second.localId, status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        await setDoc(doc(database, 'users', second.localId), { displayName: 'Disposable profile' });
        await processCleanup(database, 'full-job', 'test-reviewer', adapter);
        assert.equal((await getDoc(doc(database, 'users', second.localId))).exists(), false);
        assert.equal((await getDoc(doc(database, 'accountCleanupAudit/full-job'))).data().status, 'completed');
        assert.equal(await adapter.lookupUser(second.localId), null);
      });
    } finally { await environment.cleanup(); }
  }
});
