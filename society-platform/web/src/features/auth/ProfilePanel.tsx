import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { MemberRequests } from '../members/MemberRequests';
import { InvitationPanel } from '../invitations/InvitationPanel';
import { AdminAccess } from '../members/AdminAccess';
import { OwnershipPanel } from '../ownership/OwnershipPanel';
import { EventWorkspace } from '../events/EventWorkspace';
import { BrandSettings } from '../branding/BrandSettings';

export function ProfilePanel({ database, uid, societyId, email }: { database: Firestore; uid: string; societyId: string; email: string }) {
  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState('en');
  const [membership, setMembership] = useState('Checking community membership…');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [memberState, setMemberState] = useState<{ exists: boolean; role: string; status: string } | null>(null);

  useEffect(() => {
    return onSnapshot(doc(database, 'users', uid), snapshot => {
      setDisplayName(snapshot.data()?.displayName ?? '');
      setLanguage(snapshot.data()?.language ?? 'en');
      setReady(true);
    }, () => { setReady(false); setStatus('Profile is unavailable. Check your verification and local service connection.'); });
  }, [database, uid]);

  useEffect(() => {
    setMembership('Checking community membership…');
    return onSnapshot(doc(database, 'societies', societyId, 'members', uid), { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) { setMemberState(null); setMembership('Waiting for verified community access…'); return; }
      const record = snapshot.data();
      setMemberState({ exists: snapshot.exists(), role: record?.role ?? '', status: record?.status ?? '' });
      setMembership(record?.status === 'active' ? `Active ${record.role === 'resident' ? 'member' : record.role} membership` : record?.status === 'revoked' ? 'Community access revoked' : 'No approved membership for this community');
      if (record?.status === 'pending') setMembership('Membership request awaiting committee approval');
    }, () => { setMemberState(null); setMembership('Membership could not be checked. Community access is unavailable.'); });
  }, [database, uid, societyId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !ready) return;
    const name = displayName.trim();
    if (name.length < 1 || name.length > 80) { setStatus('Enter a display name between 1 and 80 characters.'); return; }
    setBusy(true); setStatus('');
    try {
      await setDoc(doc(database, 'users', uid), { schemaVersion: 1, displayName: name, language, updatedAt: serverTimestamp() });
      setStatus('Profile saved to the local database.');
    } catch { setStatus('Profile could not be saved. Your changes have not been confirmed.'); }
    finally { setBusy(false); }
  }

  async function requestMembership() {
    if (busy || !memberState || memberState.exists) return;
    setBusy(true); setStatus('');
    try {
      await setDoc(doc(database, 'societies', societyId, 'members', uid), { schemaVersion: 1, role: 'resident', status: 'pending', email, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      setStatus('Request sent to the local committee queue. It does not grant access yet.');
    } catch { setStatus('Could not request membership. The community may not accept requests or the service may be unavailable.'); }
    finally { setBusy(false); }
  }

  return <div className="profile-panel"><h3>Your profile</h3><p role="status">{membership}</p>
    {memberState && !memberState.exists && <div className="account-buttons"><button disabled={busy} onClick={requestMembership}>Request to join this community</button></div>}
    <form className="account-form" onSubmit={save}>
    <label>Display name<input value={displayName} maxLength={80} required disabled={!ready || busy} autoComplete="nickname" onChange={e => setDisplayName(e.target.value)} /></label>
    <label>Preferred language<select value={language} disabled={!ready || busy} onChange={e => setLanguage(e.target.value)}><option value="en">English</option><option value="hi">Hindi</option><option value="mr">Marathi</option></select></label>
    <p className="section-note">Language preference is saved for later translated screens. It does not change this prototype’s language yet.</p>
    <button className="submit-button" disabled={!ready || busy}>Save local profile</button>
  </form><p role="status" className="save-status">{status}</p>
    {memberState?.status === 'active' && ['owner', 'admin'].includes(memberState.role) && <MemberRequests key={societyId} database={database} societyId={societyId} />}
    {memberState?.status === 'active' && ['owner', 'admin'].includes(memberState.role) && <BrandSettings key={`brand:${societyId}`} database={database} societyId={societyId} />}
    {memberState?.status === 'active' && memberState.role === 'owner' && <AdminAccess key={`admins:${societyId}`} database={database} societyId={societyId} />}
    {memberState?.status === 'active' && ['owner', 'admin'].includes(memberState.role) && <OwnershipPanel key={`ownership:${societyId}:${memberState.role}`} database={database} societyId={societyId} uid={uid} owner={memberState.role === 'owner'} />}
    {memberState && (!memberState.exists || memberState.status === 'pending' || (memberState.status === 'active' && memberState.role === 'owner')) && <InvitationPanel key={`${societyId}:${memberState.role}:${memberState.status}`} database={database} societyId={societyId} uid={uid} email={email} owner={memberState.status === 'active' && memberState.role === 'owner'} />}
    {memberState?.status === 'active' && ['owner', 'admin'].includes(memberState.role) && <EventWorkspace key={`events:${societyId}`} database={database} societyId={societyId} />}
  </div>;
}
