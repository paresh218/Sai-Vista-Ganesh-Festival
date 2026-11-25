import { useEffect, useState } from 'react';
import { addDoc, collection, doc, limit, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

export function AccountCleanupPanel({ database, uid }: { database: Firestore; uid: string }) {
  const [requests, setRequests] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => onSnapshot(query(collection(database, 'accountCleanupRequests'), where('uid', '==', uid), where('status', '==', 'pending'), limit(20)), { includeMetadataChanges: true }, snapshot => {
    if (snapshot.metadata.fromCache) { setReady(false); setRequests([]); return; }
    setRequests(snapshot.docs.map(record => record.id)); setReady(true);
  }, () => { setReady(false); setRequests([]); setMessage('Cleanup requests are unavailable. Check your connection.'); }), [database, uid]);
  async function run(action: () => Promise<void>) {
    if (busy || !ready) return;
    setBusy(true); setMessage('');
    try { await action(); setConfirmed(false); }
    catch { setMessage('Your request was not confirmed. Please retry when connected.'); }
    finally { setBusy(false); }
  }
  return <section className="profile-panel" aria-label="Account cleanup"><h3>Account cleanup request</h3><p className="section-note">This local preview records a request only. It does not delete your login or data. A trusted cleanup worker is still under development. Owners must transfer ownership first; shared records and audit history require review.</p>
    {requests.length === 0 && <><label className="checkbox-label"><input type="checkbox" checked={confirmed} disabled={!ready || busy} onChange={event => setConfirmed(event.target.checked)} />I want to request account cleanup.</label><button disabled={!ready || !confirmed || busy} onClick={() => void run(async () => { await addDoc(collection(database, 'accountCleanupRequests'), { uid, status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); setMessage('Cleanup requested for review. No data has been deleted.'); })}>Request account cleanup</button></>}
    {requests.length > 0 && <p>Showing up to 20 pending requests. Cancelled records remain in the request history.</p>}
    {requests.map(id => <div className="account-buttons" key={id}><span>Pending request: {id}</span><button disabled={!ready || busy} onClick={() => void run(async () => { await updateDoc(doc(database, 'accountCleanupRequests', id), { status: 'cancelled', updatedAt: serverTimestamp() }); setMessage('Cleanup request cancelled. No data was deleted.'); })}>Cancel cleanup request {id}</button></div>)}
    <p role="status">{message}</p>
  </section>;
}
