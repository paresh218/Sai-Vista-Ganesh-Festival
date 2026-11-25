import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteApp, initializeApp } from 'firebase/app';
import { applyActionCode, confirmPasswordReset, connectAuthEmulator, createUserWithEmailAndPassword, getAuth, getIdTokenResult, inMemoryPersistence, initializeAuth, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';

if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9199') throw new Error('Auth tests require the isolated test Auth emulator at 127.0.0.1:9199.');
const projectId = 'demo-society-platform-tests';
let app;
let auth;
before(async () => {
  const response = await fetch(`http://127.0.0.1:9199/emulator/v1/projects/${projectId}/accounts`, { method: 'DELETE' });
  assert.ok(response.ok);
  app = initializeApp({ apiKey: 'local-demo-key', projectId }, 'identity-test');
  initializeAuth(app, { persistence: inMemoryPersistence });
  auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true });
});
after(async () => { if (app) await deleteApp(app); });

test('local signup, email verification, logout, recovery and fresh login work without granting roles', async () => {
  const email = 'synthetic-resident@example.test';
  const initialPassword = 'local-only-password-123';
  const nextPassword = 'new-local-password-456';
  const credential = await createUserWithEmailAndPassword(auth, email, initialPassword);
  assert.equal(credential.user.emailVerified, false);
  await sendEmailVerification(credential.user);
  const codes = await fetch(`http://127.0.0.1:9199/emulator/v1/projects/${projectId}/oobCodes`).then(response => response.json());
  const verification = codes.oobCodes.find(code => code.email === email && code.requestType === 'VERIFY_EMAIL');
  assert.ok(verification);
  await applyActionCode(auth, verification.oobCode);
  await credential.user.reload();
  const token = await getIdTokenResult(credential.user, true);
  assert.equal(token.claims.email_verified, true);
  assert.equal(token.claims.admin, undefined);
  assert.equal(token.claims.role, undefined);
  await signOut(auth);
  assert.equal(auth.currentUser, null);
  await assert.rejects(signInWithEmailAndPassword(auth, email, 'wrong-test-password'));
  await sendPasswordResetEmail(auth, email);
  const resetCodes = await fetch(`http://127.0.0.1:9199/emulator/v1/projects/${projectId}/oobCodes`).then(response => response.json());
  const reset = resetCodes.oobCodes.find(code => code.email === email && code.requestType === 'PASSWORD_RESET');
  assert.ok(reset);
  await confirmPasswordReset(auth, reset.oobCode, nextPassword);
  await assert.rejects(signInWithEmailAndPassword(auth, email, initialPassword));
  const signedIn = await signInWithEmailAndPassword(auth, email, nextPassword);
  assert.equal(signedIn.user.email, email);
  await signOut(auth);
});
