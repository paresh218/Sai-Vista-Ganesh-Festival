import { collection, doc, runTransaction, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

export class InvitationError extends Error {}
export function invitationCode(value: string) {
  const code = value.trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(code)) throw new InvitationError('Enter a valid invitation code.');
  return code;
}
export async function createInvitation(database: Firestore, societyId: string, uid: string, address: string, role: string) {
  const email = address.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InvitationError('Enter a valid invitation email.');
  if (!['resident', 'admin'].includes(role)) throw new InvitationError('Choose member or admin access.');
  const reference = doc(collection(database, 'societies', societyId, 'invitations'));
  await setDoc(reference, { schemaVersion: 1, email, role, status: 'pending', createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 3 * 86400000) });
  return reference.id;
}
export async function cancelInvitation(database: Firestore, societyId: string, code: string) {
  await updateDoc(doc(database, 'societies', societyId, 'invitations', invitationCode(code)), { status: 'cancelled', updatedAt: serverTimestamp() });
}
export async function acceptInvitation(database: Firestore, societyId: string, user: { uid: string; email: string }, code: string) {
  const reference = doc(database, 'societies', societyId, 'invitations', invitationCode(code));
  const membership = doc(database, 'societies', societyId, 'members', user.uid);
  await runTransaction(database, async transaction => {
    const [invitation, member] = await Promise.all([transaction.get(reference), transaction.get(membership)]);
    const data = invitation.data();
    if (!data || data.email !== user.email || data.status !== 'pending' || !['resident', 'admin'].includes(data.role) || !(data.expiresAt instanceof Timestamp) || data.expiresAt.toMillis() <= Date.now()) throw new InvitationError('This invitation is unavailable, expired or intended for another account.');
    const existing = member.data();
    if (member.exists() && !(existing?.role === 'resident' && existing.status === 'pending')) throw new InvitationError('This account already has a membership. Ask the owner about access changes.');
    transaction.set(membership, { schemaVersion: 1, email: user.email, role: data.role, status: 'active', invitationId: reference.id, createdAt: member.exists() ? existing!.createdAt : serverTimestamp(), updatedAt: serverTimestamp() });
    transaction.update(reference, { status: 'accepted', acceptedBy: user.uid, updatedAt: serverTimestamp() });
  });
}
