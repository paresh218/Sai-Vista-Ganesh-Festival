import { collection, doc, endAt, getDocs, limit, orderBy, query, serverTimestamp, startAfter, startAt, where, writeBatch } from 'firebase/firestore';
import type { Firestore, QueryDocumentSnapshot } from 'firebase/firestore';
import { cleanText, CommunityError, normalizeCommunity } from './model';
import type { CommunityDraft, DirectoryFilters } from './model';

export function directoryQuery(database: Firestore, filters: DirectoryFilters, cursor?: QueryDocumentSnapshot) {
  const prefix = cleanText(filters.name).toLowerCase();
  const city = cleanText(filters.city).toLowerCase();
  return query(collection(database, 'societies'), where('directoryVisible', '==', true),
    ...(filters.kind ? [where('kind', '==', filters.kind)] : []),
    ...(city ? [where('cityKey', '==', city)] : []), orderBy('nameKey'),
    ...(cursor ? [startAfter(cursor)] : prefix ? [startAt(prefix)] : []),
    ...(prefix ? [endAt(`${prefix}\uf8ff`)] : []), limit(21));
}

export async function registerCommunity(database: Firestore, user: { uid: string; email: string }, draft: CommunityDraft) {
  const content = normalizeCommunity(draft);
  const existing = await getDocs(query(collection(database, 'societies'), where('directoryVisible', '==', true), where('nameKey', '==', content.nameKey), where('cityKey', '==', content.cityKey), where('kind', '==', content.kind), limit(5)));
  // shortcut: duplicate lookup guides organizers but cannot prevent simultaneous registrations; add reviewed deduplication before commercial launch.
  if (!existing.empty) throw new CommunityError('This community name, city and type is already listed. Search for it and request to join.');
  const community = doc(collection(database, 'societies'));
  const batch = writeBatch(database);
  batch.set(community, { ...content, schemaVersion: 2, timezone: 'Asia/Kolkata', directoryVisible: true, registrationStatus: 'self_declared', ownerUid: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  batch.set(doc(database, 'societies', community.id, 'members', user.uid), { schemaVersion: 1, role: 'owner', status: 'active', email: user.email, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await batch.commit();
  return { id: community.id, ...content, registrationStatus: 'self_declared' };
}
