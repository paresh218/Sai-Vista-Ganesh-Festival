import { initializeApp, deleteApp } from 'firebase/app';
import assert from 'node:assert/strict';
import { applyActionCode, connectAuthEmulator, createUserWithEmailAndPassword, getAuth, sendEmailVerification, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { societies, demoEvents } from '../web/src/data/demo.ts';

// This helper can address only local emulators and a demo project; it never provisions real societies or users.
const projectId = 'demo-society-platform';
const authHost = 'http://127.0.0.1:9099';
const password = 'Local-demo-only-123!';
const app = initializeApp({ apiKey: 'local-demo-key', projectId }, 'local-fixtures');
const auth = getAuth(app);
connectAuthEmulator(auth, authHost, { disableWarnings: true });
let environment;

try {
  environment = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8085 } });
  const identities = [];
  for (const [email, role] of [['owner@example.test', 'owner'], ['resident@example.test', 'resident'], ['superadmin@example.test', 'superadmin'], ['admin@example.test', 'admin']]) {
    let credential;
    try { credential = await createUserWithEmailAndPassword(auth, email, password); }
    catch (error) {
      if (error.code !== 'auth/email-already-in-use') throw error;
      credential = await signInWithEmailAndPassword(auth, email, password);
    }
    if (!credential.user.emailVerified) {
      await sendEmailVerification(credential.user);
      const response = await fetch(`${authHost}/emulator/v1/projects/${projectId}/oobCodes`);
      if (!response.ok) throw new Error('Local verification codes are unavailable.');
      const codes = await response.json();
      const verification = codes.oobCodes.findLast(code => code.email === email && code.requestType === 'VERIFY_EMAIL');
      if (!verification) throw new Error('Local verification code was not created.');
      await applyActionCode(auth, verification.oobCode);
    }
    identities.push({ uid: credential.user.uid, email, role });
    await signOut(auth);
  }
  await environment.withSecurityRulesDisabled(async context => {
    const database = context.firestore();
    const owner = identities.find(identity => identity.role === 'owner');
    const platform = identities.find(identity => identity.role === 'superadmin');
    await setDoc(doc(database, 'platformRoles', platform.uid), { role: 'superadmin', status: 'active' });
    for (const society of societies) {
      await setDoc(doc(database, 'societies', society.id), { schemaVersion: 2, name: society.name, nameKey: society.name.toLowerCase(), city: 'Pune', cityKey: 'pune', location: society.location, kind: 'society', timezone: 'Asia/Kolkata', directoryVisible: true, registrationStatus: 'self_declared', ownerUid: owner.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await setDoc(doc(database, 'societies', society.id, 'members', owner.uid), { schemaVersion: 1, role: 'owner', status: 'active', email: owner.email, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    const resident = identities.find(identity => identity.role === 'resident');
    await setDoc(doc(database, 'societies', societies[0].id, 'members', resident.uid), { schemaVersion: 1, role: 'resident', status: 'active', email: resident.email, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    const admin = identities.find(identity => identity.role === 'admin');
    await setDoc(doc(database, 'societies', societies[0].id, 'members', admin.uid), { schemaVersion: 1, role: 'admin', status: 'active', email: admin.email, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    for (const event of demoEvents) {
      const { id, societyId, ...content } = event;
      await setDoc(doc(database, 'societies', societyId, 'events', id), { ...content, startsAt: Timestamp.fromDate(new Date(content.startsAt)), schemaVersion: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    assert.equal(new Set(identities.map(identity => identity.uid)).size, 4, 'Synthetic identities must be distinct.');
    assert.equal((await getDoc(doc(database, 'societies', 'sai-vista', 'members', owner.uid))).data().role, 'owner');
    assert.equal((await getDoc(doc(database, 'societies', 'sai-vista', 'events', 'lights'))).data().status, 'published');
    assert.equal((await getDoc(doc(database, 'societies', 'sai-vista', 'members', admin.uid))).data().role, 'admin');
  });
  console.log('Local synthetic fixtures are ready. No cloud services were contacted.');
  console.log(`Superadmin: superadmin@example.test | Admin: admin@example.test | Owner: owner@example.test | Resident: resident@example.test | Test password: ${password}`);
  console.log('All four accounts are verified locally. Owner fixtures cover both societies; initial admin/resident fixtures cover Sai Vista. Existing additional memberships are preserved.');
  console.log('Event/admin previews still use in-memory demo content. Account profile and membership use local Firestore.');
} finally {
  await environment?.cleanup();
  await deleteApp(app);
}
