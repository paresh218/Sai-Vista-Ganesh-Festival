import { useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { RecordBrowser } from '../platform/RecordBrowser';

export function AdminAccess({ database, societyId }: { database: Firestore; societyId: string }) {
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function revoke() {
    if (!selected || !confirmed || busy) return;
    setBusy(true); setMessage('');
    try {
      await updateDoc(doc(database, 'societies', societyId, 'members', selected.id), { status: 'revoked', updatedAt: serverTimestamp() });
      setSelected(null); setConfirmed(false); setMessage('Admin access revoked for this community.');
    } catch { setMessage('Access was not changed. Select an active admin and check your owner permissions.'); }
    finally { setBusy(false); }
  }
  return <section className="profile-panel" aria-label="Admin access"><h3>Manage admin access</h3><p className="section-note">Open an active admin record below to revoke its community access. Owner accounts cannot be revoked here. Other communities are unaffected. Restoring revoked access requires a separate reviewed process.</p>
    <RecordBrowser database={database} path={`societies/${societyId}/members`} title="Community membership history" onSelect={(id, name) => { if (!busy) { setSelected({ id, name }); setConfirmed(false); setMessage(''); } }} />
    {selected && <><p>Selected: {selected.name}</p><label className="checkbox-label"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />I confirm revoking this admin’s access.</label><button disabled={!confirmed || busy} onClick={() => void revoke()}>Revoke admin access</button></>}
    <p role="status">{message}</p>
  </section>;
}
