import { useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

interface Request { id: string; email: string }

export function MemberRequests({ database, societyId }: { database: Firestore; societyId: string }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [message, setMessage] = useState('Loading membership requests…');
  const [busy, setBusy] = useState(false);
  useEffect(() => onSnapshot(query(collection(database, 'societies', societyId, 'members'), where('status', '==', 'pending'), limit(20)), { includeMetadataChanges: true }, snapshot => {
    if (snapshot.metadata.fromCache) { setRequests([]); setMessage('Waiting for a verified committee connection…'); return; }
    setRequests(snapshot.docs.map(item => ({ id: item.id, email: item.data().email ?? 'Contact unavailable' })));
    setMessage(snapshot.empty ? 'No pending requests.' : 'Showing up to 20 pending requests.');
  }, () => { setRequests([]); setMessage('Requests are unavailable. Check your committee access.'); }), [database, societyId]);

  async function decide(id: string, status: 'active' | 'revoked') {
    if (busy) return;
    setBusy(true);
    try {
      await updateDoc(doc(database, 'societies', societyId, 'members', id), { status, updatedAt: serverTimestamp() });
      setMessage(status === 'active' ? 'Community membership approved locally.' : 'Membership request declined locally.');
    } catch { setMessage('The request could not be updated. Access may have changed.'); }
    finally { setBusy(false); }
  }

  return <section className="profile-panel" aria-labelledby="members-title"><h3 id="members-title">Pending members</h3><p className="section-note">Approve only members whose community membership you have checked.</p><p role="status">{message}</p>{requests.map(request => <div className="member-request" key={request.id}><span>{request.email}</span><div className="account-buttons"><button disabled={busy} onClick={() => decide(request.id, 'active')}>Approve {request.email}</button><button disabled={busy} onClick={() => decide(request.id, 'revoked')}>Decline {request.email}</button></div></div>)}</section>;
}
