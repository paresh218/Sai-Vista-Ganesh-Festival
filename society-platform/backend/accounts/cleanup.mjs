import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, startAfter, updateDoc, where } from 'firebase/firestore';

async function all(database, path, ...filters) {
  const records = [];
  let cursor;
  do {
    const page = await getDocs(query(collection(database, path), ...filters, orderBy('__name__'), ...(cursor ? [startAfter(cursor)] : []), limit(100)));
    records.push(...page.docs);
    cursor = page.docs.length === 100 ? page.docs.at(-1) : null;
  } while (cursor);
  return records;
}

// Trusted worker only: invoke with a privileged database and reviewed Auth adapter, never from the browser.
export async function processCleanup(database, requestId, actor, auth) {
  if (!actor?.trim()) throw new Error('A reviewer identity is required.');
  const requestRef = doc(database, 'accountCleanupRequests', requestId);
  const original = (await getDoc(requestRef)).data();
  if (!original) throw new Error('Cleanup request not found.');
  if (original.status === 'completed') return { status: 'completed' };
  if (!['pending', 'failed'].includes(original.status)) throw new Error('Cleanup request cannot be processed.');
  const uid = original.uid;
  if (typeof uid !== 'string' || !uid || uid.includes('/')) throw new Error('Invalid account identity.');
  const stateRef = doc(database, 'accountStates', uid);
  const auditRef = doc(database, 'accountCleanupAudit', requestId);
  await runTransaction(database, async transaction => {
    const current = (await transaction.get(requestRef)).data();
    const state = (await transaction.get(stateRef)).data();
    if (!current || current.uid !== uid || !['pending', 'failed'].includes(current.status)) throw new Error('Cleanup already claimed or cancelled.');
    if (state?.status === 'deleted' || (state?.status === 'deleting' && state.requestId !== requestId)) throw new Error('Another cleanup owns this account.');
    transaction.update(requestRef, { status: 'processing', actor, updatedAt: serverTimestamp() });
    transaction.set(stateRef, { status: 'deleting', requestId, updatedAt: serverTimestamp() });
    transaction.set(auditRef, { uid, actor, status: 'processing', updatedAt: serverTimestamp() });
  });
  try {
    // Freeze first, then scan: the user cannot create a new owned community during this inventory.
    const societies = await all(database, 'societies');
    const platform = (await getDoc(doc(database, 'platformRoles', uid))).data();
    const memberships = [];
    let blocked = platform?.role === 'superadmin' && platform.status === 'active';
    for (const society of societies) {
      const reference = doc(database, 'societies', society.id, 'members', uid);
      const member = await getDoc(reference);
      if (society.data().ownerUid === uid || member.data()?.role === 'owner') blocked = true;
      if (member.exists()) memberships.push(reference);
    }
    if (blocked) {
      await setDoc(stateRef, { status: 'active', requestId, updatedAt: serverTimestamp() });
      await updateDoc(requestRef, { status: 'blocked', reason: 'ownership_or_platform_review', updatedAt: serverTimestamp() });
      await updateDoc(auditRef, { status: 'blocked', updatedAt: serverTimestamp() });
      return { status: 'blocked' };
    }
    const identity = await auth.lookupUser(uid);
    if (identity) await auth.disableUser(uid);
    let redacted = 0;
    for (const society of societies) {
      if (!identity?.email) continue;
      const invitations = await all(database, `societies/${society.id}/invitations`, where('email', '==', identity.email));
      for (const invitation of invitations) {
        await updateDoc(invitation.ref, { email: null, ...(invitation.data().status === 'pending' ? { status: 'cancelled' } : {}), cleanupRequestId: requestId, updatedAt: serverTimestamp() });
        redacted++;
      }
    }
    for (const membership of memberships) await deleteDoc(membership);
    await deleteDoc(doc(database, 'users', uid));
    if (identity) await auth.deleteUser(uid);
    await setDoc(stateRef, { status: 'deleted', requestId, updatedAt: serverTimestamp() });
    await updateDoc(auditRef, { status: 'completed', membershipsRemoved: memberships.length, invitationsRedacted: redacted, updatedAt: serverTimestamp() });
    await updateDoc(requestRef, { status: 'completed', updatedAt: serverTimestamp() });
    return { status: 'completed' };
  } catch (failure) {
    // Keep access frozen after partial work. A reviewed retry may finish; never silently restore access.
    await updateDoc(requestRef, { status: 'failed', reason: 'worker_failure', updatedAt: serverTimestamp() });
    await updateDoc(auditRef, { status: 'failed', updatedAt: serverTimestamp() });
    throw failure;
  }
}
