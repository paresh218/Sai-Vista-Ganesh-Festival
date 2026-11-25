import { after, before, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, setLogLevel, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore';

const host = process.env.FIRESTORE_EMULATOR_HOST;
if (host !== '127.0.0.1:8185') throw new Error('Rules tests require the isolated test Firestore emulator at 127.0.0.1:8185.');
setLogLevel('silent');

let environment;
const event = (status = 'published') => ({
  schemaVersion: 1, title: 'Sample gathering', description: 'Synthetic event only',
  startsAt: Timestamp.fromDate(new Date('2026-11-07T12:30:00Z')),
  venue: 'Community lawn', category: 'Community', status, pinned: false,
  createdAt: Timestamp.fromMillis(1000), updatedAt: Timestamp.fromMillis(1000),
});
const db = (uid, verified = true) => environment.authenticatedContext(uid, { email_verified: verified, email: `${uid}@example.test` }).firestore();
const eventRef = (database, society = 'alpha', id = 'public') => doc(database, `societies/${society}/events/${id}`);
const newCommunity = (uid, kind = 'ganesh_mandal') => ({ schemaVersion: 2, name: 'New Festival Group', nameKey: 'new festival group', city: 'Pune', cityKey: 'pune', location: 'Rahatani', kind, timezone: 'Asia/Kolkata', directoryVisible: true, registrationStatus: 'self_declared', ownerUid: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
function register(database, uid, id, changes = {}, memberChanges = {}) {
  const batch = writeBatch(database);
  batch.set(doc(database, 'societies', id), { ...newCommunity(uid), ...changes });
  batch.set(doc(database, 'societies', id, 'members', uid), { schemaVersion: 1, role: 'owner', status: 'active', email: `${uid}@example.test`, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...memberChanges });
  return batch.commit();
}

test('only an active tenant owner can revoke admin access; the same admin client immediately loses writes', async () => {
  const reference = database => doc(database, 'societies/alpha/members/admin');
  const change = { status: 'revoked', updatedAt: serverTimestamp() };
  const administrator = db('admin');
  for (const uid of ['admin', 'resident', 'beta-admin', 'super']) await assertFails(updateDoc(reference(db(uid)), change));
  await assertFails(updateDoc(reference(db('owner', false)), change));
  await assertFails(updateDoc(doc(db('owner'), 'societies/alpha/members/owner'), change));
  await assertFails(updateDoc(reference(db('owner')), { ...change, role: 'resident' }));
  await assertSucceeds(updateDoc(eventRef(administrator), { pinned: true, updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(reference(db('owner')), change));
  await assertFails(updateDoc(eventRef(administrator), { pinned: false, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(reference(db('owner')), { status: 'active', updatedAt: serverTimestamp() }));
});

test('verified users request or cancel only their own cleanup; clients cannot claim processing or completion', async () => {
  const reference = (database, id = 'job') => doc(database, 'accountCleanupRequests', id);
  const request = { uid: 'resident', status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await assertFails(setDoc(reference(db('resident', false)), request));
  await assertFails(setDoc(reference(db('admin')), request));
  await assertFails(setDoc(reference(db('resident')), { ...request, status: 'completed' }));
  await assertFails(setDoc(reference(db('resident')), { ...request, email: 'private@example.test' }));
  await assertSucceeds(setDoc(reference(db('resident')), request));
  await assertSucceeds(getDoc(reference(db('resident'))));
  await assertSucceeds(getDoc(reference(db('super'))));
  await assertFails(getDoc(reference(db('owner'))));
  await assertSucceeds(getDocs(query(collection(db('resident'), 'accountCleanupRequests'), where('uid', '==', 'resident'), where('status', '==', 'pending'), limit(20))));
  await assertFails(getDocs(query(collection(db('resident'), 'accountCleanupRequests'), limit(20))));
  await assertFails(updateDoc(reference(db('resident')), { status: 'processing', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(reference(db('resident')), { status: 'completed', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(reference(db('owner')), { status: 'cancelled', updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(reference(db('resident')), { status: 'cancelled', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(reference(db('resident')), { status: 'pending', updatedAt: serverTimestamp() }));
  await assertFails(deleteDoc(reference(db('resident'))));
});

test('public event access requires explicit public audience, published/archive status and a listed community', async () => {
  const owner = db('owner');
  const visitor = environment.unauthenticatedContext().firestore();
  const data = { ...event(), audience: 'public', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await assertSucceeds(setDoc(eventRef(owner, 'alpha', 'public-opt-in'), data));
  await assertSucceeds(getDoc(eventRef(visitor, 'alpha', 'public-opt-in')));
  await assertSucceeds(getDocs(query(collection(visitor, 'societies/alpha/events'), where('audience', '==', 'public'), where('status', '==', 'published'), limit(20))));
  await assertFails(getDocs(query(collection(visitor, 'societies/alpha/events'), where('status', '==', 'published'), limit(20))));
  await assertFails(getDoc(eventRef(visitor, 'alpha', 'public')));
  await assertSucceeds(updateDoc(eventRef(owner, 'alpha', 'public-opt-in'), { status: 'draft', updatedAt: serverTimestamp() }));
  await assertFails(getDoc(eventRef(visitor, 'alpha', 'public-opt-in')));
  await assertSucceeds(updateDoc(eventRef(owner, 'alpha', 'public-opt-in'), { status: 'archived', updatedAt: serverTimestamp() }));
  await assertSucceeds(getDoc(eventRef(visitor, 'alpha', 'public-opt-in')));
  await assertFails(updateDoc(eventRef(owner, 'alpha', 'public-opt-in'), { audience: 'everyone', updatedAt: serverTimestamp() }));
  await assertSucceeds(setDoc(eventRef(db('beta-admin'), 'beta', 'hidden-public'), data));
  await assertFails(getDoc(eventRef(visitor, 'beta', 'hidden-public')));
});

test('public branding is strictly validated and editable only by that community admin', async () => {
  const reference = database => doc(database, 'societies/alpha/settings/public');
  const settings = { schemaVersion: 1, name: 'Community celebrations', tagline: 'Celebrate together.', announcement: 'Sample announcement', updatedAt: serverTimestamp() };
  await assertSucceeds(setDoc(reference(db('admin')), settings));
  await assertSucceeds(getDoc(reference(environment.unauthenticatedContext().firestore())));
  for (const uid of ['resident', 'beta-admin', 'super']) await assertFails(setDoc(reference(db(uid)), settings));
  for (const changes of [{ name: '' }, { tagline: '' }, { announcement: 'x'.repeat(501) }, { customScript: 'no' }, { privateEmail: 'private@example.test' }]) await assertFails(setDoc(reference(db('owner')), { ...settings, ...changes }));
});

test('event rules reject whitespace-only titles, venues and categories even through direct SDK writes', async () => {
  for (const field of ['title', 'venue', 'category']) await assertFails(setDoc(eventRef(db('admin'), 'alpha', `blank-${field}`), { ...event(), [field]: '   ', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
});

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-society-platform-tests',
    firestore: { host: '127.0.0.1', port: 8185, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async context => {
    const seed = context.firestore();
    for (const society of ['alpha', 'beta']) {
      await setDoc(doc(seed, `societies/${society}`), { schemaVersion: 1, name: society, location: 'Demo', timezone: 'Asia/Kolkata', directoryVisible: society === 'alpha' });
      for (const [id, status] of [['public', 'published'], ['draft', 'draft'], ['past', 'archived']]) {
        await setDoc(eventRef(seed, society, id), event(status));
      }
    }
    for (const [society, uid, role, status] of [
      ['alpha', 'owner', 'owner', 'active'], ['alpha', 'admin', 'admin', 'active'],
      ['alpha', 'resident', 'resident', 'active'], ['alpha', 'revoked', 'resident', 'revoked'],
      ['beta', 'beta-admin', 'admin', 'active'], ['alpha', 'dual', 'resident', 'active'], ['beta', 'dual', 'admin', 'active'],
    ]) await setDoc(doc(seed, `societies/${society}/members/${uid}`), { role, status });
    await setDoc(doc(seed, 'societies/alpha/ledgerEntries/private'), { amount: 10000 });
    await setDoc(doc(seed, 'users/resident'), { displayName: 'Synthetic resident' });
    await setDoc(doc(seed, 'platformRoles/super'), { role: 'superadmin', status: 'active' });
  });
});

test('platform superadmin can inspect both societies, hidden directory entries, private records and user profiles', async () => {
  const platform = db('super');
  await assertSucceeds(getDocs(query(collection(platform, 'societies'), limit(20))));
  await assertSucceeds(getDoc(doc(platform, 'societies/beta')));
  for (const society of ['alpha', 'beta']) {
    await assertSucceeds(getDoc(eventRef(platform, society, 'draft')));
    await assertSucceeds(getDocs(query(collection(platform, `societies/${society}/members`), limit(20))));
  }
  await assertSucceeds(getDoc(doc(platform, 'societies/alpha/ledgerEntries/private')));
  await assertSucceeds(getDoc(doc(platform, 'users/resident')));
  await assertSucceeds(getDocs(query(collection(platform, 'users'), limit(20))));
  await assertFails(getDocs(collection(platform, 'users')));
  await assertFails(updateDoc(eventRef(platform), { title: 'Unrequested platform edit', updatedAt: serverTimestamp() }));
});

test('platform authority cannot be self-granted, forged in claims or inherited from a society owner role', async () => {
  await assertFails(setDoc(doc(db('admin'), 'platformRoles/admin'), { role: 'superadmin', status: 'active' }));
  await assertFails(updateDoc(doc(db('super'), 'platformRoles/super'), { status: 'active' }));
  await assertFails(getDoc(doc(db('owner'), 'users/resident')));
  await assertFails(getDoc(eventRef(db('owner'), 'beta', 'draft')));
  await assertFails(getDoc(eventRef(db('super', false), 'beta', 'draft')));
  const forged = environment.authenticatedContext('admin', { email_verified: true, superadmin: true, role: 'superadmin' }).firestore();
  await assertFails(getDoc(eventRef(forged, 'beta', 'draft')));
  await assertFails(updateDoc(eventRef(db('admin'), 'beta'), { title: 'Cross-tenant edit', updatedAt: serverTimestamp() }));
});

test('revoking the platform role immediately blocks the same authenticated client', async () => {
  const platform = db('super');
  await assertSucceeds(getDoc(eventRef(platform, 'beta', 'draft')));
  await environment.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), 'platformRoles/super'), { status: 'revoked' });
  });
  await assertFails(getDoc(eventRef(platform, 'beta', 'draft')));
  await assertFails(getDoc(doc(platform, 'users/resident')));
});

test('platform view history is attributable, bounded and append-only', async () => {
  const platform = db('super');
  const entry = doc(platform, 'platformAudit/view-one');
  const data = { actorUid: 'super', action: 'view', target: 'societies/alpha/events', createdAt: serverTimestamp() };
  await assertSucceeds(setDoc(entry, data));
  await assertFails(updateDoc(entry, { target: 'societies/beta/events' }));
  await assertFails(deleteDoc(entry));
  await assertFails(setDoc(doc(platform, 'platformAudit/forged'), { ...data, actorUid: 'owner' }));
  await assertFails(setDoc(doc(db('owner'), 'platformAudit/owner'), { ...data, actorUid: 'owner' }));
  await assertSucceeds(getDocs(query(collection(platform, 'platformAudit'), limit(20))));
  await assertFails(getDocs(collection(platform, 'platformAudit')));
  await assertFails(getDoc(doc(platform, 'infrastructure/secrets')));
});
after(async () => { await environment?.cleanup(); });

test('verified organizers can register every community type with an atomic initial owner membership', async () => {
  const organizer = db('organizer');
  for (const kind of ['society', 'ganesh_mandal', 'durga_mandal', 'festival_committee', 'community_group']) {
    await assertSucceeds(register(organizer, 'organizer', `new-${kind}`, { kind }));
    await assertSucceeds(getDoc(doc(organizer, 'societies', `new-${kind}`, 'members', 'organizer')));
  }
});

test('community registration rejects unverified identities, orphan documents, forged owners and malformed public fields', async () => {
  const organizer = db('organizer');
  await assertFails(register(db('organizer', false), 'organizer', 'unverified'));
  await assertFails(setDoc(doc(organizer, 'societies/orphan'), newCommunity('organizer')));
  await assertFails(register(organizer, 'organizer', 'wrong-owner', { ownerUid: 'other' }));
  await assertFails(register(organizer, 'organizer', 'wrong-member', {}, { role: 'superadmin' }));
  await assertFails(register(organizer, 'organizer', 'bad-kind', { kind: 'unknown' }));
  await assertFails(register(organizer, 'organizer', 'fake-key', { nameKey: 'different listing' }));
  await assertFails(register(organizer, 'organizer', 'private-data', { contactEmail: 'private@example.test' }));
  await assertFails(register(organizer, 'organizer', 'empty-name', { name: '  ', nameKey: '  ' }));
});

test('registration cannot overwrite an existing community or add an owner to one that already exists', async () => {
  const organizer = db('organizer');
  await assertFails(register(organizer, 'organizer', 'alpha'));
  await assertFails(setDoc(doc(organizer, 'societies/alpha/members/organizer'), { schemaVersion: 1, role: 'owner', status: 'active', email: 'organizer@example.test', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(organizer, 'platformRoles/organizer'), { role: 'superadmin', status: 'active' }));
});

test('members join mandals through pending requests, without inheriting organizer privileges', async () => {
  const organizer = db('organizer');
  await assertSucceeds(register(organizer, 'organizer', 'mandal'));
  const applicant = db('applicant');
  await assertSucceeds(setDoc(doc(applicant, 'societies/mandal/members/applicant'), { schemaVersion: 1, role: 'resident', status: 'pending', email: 'applicant@example.test', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertFails(getDocs(query(collection(applicant, 'societies/mandal/events'), limit(20))));
  await assertSucceeds(updateDoc(doc(organizer, 'societies/mandal/members/applicant'), { status: 'active', updatedAt: serverTimestamp() }));
  await assertSucceeds(getDocs(query(collection(applicant, 'societies/mandal/events'), where('status', '==', 'published'), limit(20))));
});

test('anonymous access is restricted to visible directory documents and constrained directory queries', async () => {
  const anonymous = environment.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(anonymous, 'societies/alpha')));
  await assertFails(getDoc(doc(anonymous, 'societies/beta')));
  await assertSucceeds(getDocs(query(collection(anonymous, 'societies'), where('directoryVisible', '==', true), limit(20))));
  await assertFails(getDocs(collection(anonymous, 'societies')));
  await assertFails(getDoc(eventRef(anonymous)));
  await assertFails(getDoc(doc(anonymous, 'societies/alpha/members/resident')));
});

test('residents can read published and archived events but not drafts, private records or another society', async () => {
  const resident = db('resident');
  await assertSucceeds(getDoc(eventRef(resident)));
  await assertSucceeds(getDoc(eventRef(resident, 'alpha', 'past')));
  await assertFails(getDoc(eventRef(resident, 'alpha', 'draft')));
  await assertFails(getDoc(eventRef(resident, 'beta')));
  await assertFails(getDoc(doc(resident, 'societies/alpha/ledgerEntries/private')));
  await assertFails(getDoc(eventRef(db('revoked'))));
  await assertFails(getDoc(eventRef(db('resident', false))));
});

test('resident queries must constrain visibility and bound results', async () => {
  const events = collection(db('resident'), 'societies/alpha/events');
  await assertSucceeds(getDocs(query(events, where('status', '==', 'published'), limit(20))));
  await assertFails(getDocs(query(events, limit(20))));
  await assertFails(getDocs(query(events, where('status', '==', 'published'))));
  await assertFails(getDocs(query(events, where('status', '==', 'published'), limit(101))));
});

test('roles are scoped by society, including users who belong to two societies', async () => {
  await assertSucceeds(getDoc(eventRef(db('admin'), 'alpha', 'draft')));
  await assertFails(getDoc(eventRef(db('admin'), 'beta', 'draft')));
  await assertFails(getDoc(eventRef(db('dual'), 'alpha', 'draft')));
  await assertSucceeds(getDoc(eventRef(db('dual'), 'beta', 'draft')));
});

test('clients cannot grant themselves membership, change roles or change directory records', async () => {
  await assertFails(setDoc(doc(db('intruder'), 'societies/alpha/members/intruder'), { role: 'owner', status: 'active' }));
  await assertFails(updateDoc(doc(db('resident'), 'societies/alpha/members/resident'), { role: 'admin' }));
  await assertFails(updateDoc(doc(db('owner'), 'societies/alpha/members/resident'), { role: 'owner' }));
  await assertFails(updateDoc(doc(db('owner'), 'societies/alpha'), { directoryVisible: false }));
  await assertSucceeds(getDoc(doc(db('resident'), 'societies/alpha/members/resident')));
  await assertFails(getDoc(doc(db('resident'), 'societies/alpha/members/owner')));
});

test('only tenant admins can create valid event documents with server timestamps', async () => {
  const valid = { ...event('draft'), createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await assertSucceeds(setDoc(eventRef(db('admin'), 'alpha', 'new'), valid));
  await assertFails(setDoc(eventRef(db('resident'), 'alpha', 'resident-write'), valid));
  await assertFails(setDoc(eventRef(db('beta-admin'), 'alpha', 'cross-write'), valid));
  await assertFails(setDoc(eventRef(db('admin'), 'alpha', 'bad'), { ...valid, title: '' }));
  await assertFails(setDoc(eventRef(db('admin'), 'alpha', 'extra'), { ...valid, societyId: 'beta' }));
  await assertFails(setDoc(eventRef(db('admin'), 'alpha', 'clock'), event()));
});

test('event edits preserve creation timestamps, validate status and deny hard deletion', async () => {
  const ref = eventRef(db('owner'));
  await assertSucceeds(updateDoc(ref, { status: 'archived', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { status: 'secret', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(eventRef(db('resident')), { pinned: true, updatedAt: serverTimestamp() }));
  await assertFails(deleteDoc(ref));
});

test('verified users can edit only their own minimal profile and cannot smuggle roles or extra private fields', async () => {
  const own = doc(db('resident'), 'users/resident');
  const profile = { schemaVersion: 1, displayName: 'Synthetic neighbour', language: 'en', updatedAt: serverTimestamp() };
  await assertSucceeds(setDoc(own, profile));
  await assertSucceeds(getDoc(own));
  await assertFails(getDoc(doc(db('owner'), 'users/resident')));
  await assertFails(getDocs(query(collection(db('resident'), 'users'), limit(10))));
  await assertFails(setDoc(doc(db('resident'), 'users/other'), profile));
  await assertFails(setDoc(doc(db('resident', false), 'users/resident'), profile));
  await assertFails(setDoc(own, { ...profile, role: 'owner' }));
  await assertFails(setDoc(own, { ...profile, language: 'unsupported' }));
  await assertFails(setDoc(own, { ...profile, displayName: '' }));
  await assertFails(deleteDoc(own));
});

test('membership revocation takes effect for an already authenticated client', async () => {
  const resident = db('resident');
  await assertSucceeds(getDoc(eventRef(resident)));
  await environment.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), 'societies/alpha/members/resident'), { status: 'revoked' });
  });
  await assertFails(getDoc(eventRef(resident)));
});

test('self join creates only a pending resident; society admins approve or revoke without changing protected roles', async () => {
  const newResident = db('new-resident');
  const ref = doc(newResident, 'societies/alpha/members/new-resident');
  const request = { schemaVersion: 1, role: 'resident', status: 'pending', email: 'new-resident@example.test', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await assertFails(setDoc(ref, { ...request, role: 'owner', status: 'active' }));
  await assertFails(setDoc(ref, { ...request, email: 'someone-else@example.test' }));
  await assertFails(setDoc(doc(newResident, 'societies/beta/members/new-resident'), request));
  await assertSucceeds(setDoc(ref, request));
  await assertFails(getDoc(eventRef(newResident)));
  await assertFails(updateDoc(ref, { status: 'active', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db('beta-admin'), 'societies/alpha/members/new-resident'), { status: 'active', updatedAt: serverTimestamp() }));
  const committeeRef = doc(db('admin'), 'societies/alpha/members/new-resident');
  await assertSucceeds(updateDoc(committeeRef, { status: 'active', updatedAt: serverTimestamp() }));
  await assertSucceeds(getDoc(eventRef(newResident)));
  await assertFails(updateDoc(committeeRef, { role: 'admin', updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(committeeRef, { status: 'revoked', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(committeeRef, { status: 'active', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db('owner'), 'societies/alpha/members/owner'), { status: 'revoked', updatedAt: serverTimestamp() }));
});
