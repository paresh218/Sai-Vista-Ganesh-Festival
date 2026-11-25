import { collection, doc, runTransaction, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { invitationCode } from '../invitations/data';

export async function requestTransfer(database: Firestore, societyId: string, fromUid: string, toUid: string) {
  const reference = doc(collection(database, 'societies', societyId, 'ownershipTransfers'));
  await setDoc(reference, { schemaVersion: 1, fromUid, toUid, status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 3 * 86400000) });
  return reference.id;
}
export async function cancelTransfer(database: Firestore, societyId: string, code: string) {
  await updateDoc(doc(database, 'societies', societyId, 'ownershipTransfers', invitationCode(code)), { status: 'cancelled', updatedAt: serverTimestamp() });
}
export async function acceptTransfer(database: Firestore, societyId: string, uid: string, code: string) {
  const transferId = invitationCode(code);
  const reference = doc(database, 'societies', societyId, 'ownershipTransfers', transferId);
  await runTransaction(database, async transaction => {
    const transfer = (await transaction.get(reference)).data();
    if (!transfer || transfer.toUid !== uid || transfer.status !== 'pending' || !(transfer.expiresAt instanceof Timestamp) || transfer.expiresAt.toMillis() <= Date.now()) throw new Error('Transfer unavailable');
    const rootRef = doc(database, 'societies', societyId);
    const oldRef = doc(database, 'societies', societyId, 'members', transfer.fromUid);
    const newRef = doc(database, 'societies', societyId, 'members', uid);
    const [root, previous, next] = await Promise.all([transaction.get(rootRef), transaction.get(oldRef), transaction.get(newRef)]);
    if (root.data()?.ownerUid !== transfer.fromUid || previous.data()?.role !== 'owner' || previous.data()?.status !== 'active' || next.data()?.role !== 'admin' || next.data()?.status !== 'active') throw new Error('Ownership changed');
    transaction.update(rootRef, { ownerUid: uid, ownershipTransferId: transferId, updatedAt: serverTimestamp() });
    transaction.update(oldRef, { role: 'admin', ownershipTransferId: transferId, updatedAt: serverTimestamp() });
    transaction.update(newRef, { role: 'owner', ownershipTransferId: transferId, updatedAt: serverTimestamp() });
    transaction.update(reference, { status: 'accepted', updatedAt: serverTimestamp() });
  });
}
