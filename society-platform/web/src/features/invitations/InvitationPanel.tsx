import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Firestore } from 'firebase/firestore';
import { acceptInvitation, cancelInvitation, createInvitation, InvitationError } from './data';
import { RecordBrowser } from '../platform/RecordBrowser';

export function InvitationPanel({ database, societyId, uid, email, owner }: { database: Firestore; societyId: string; uid: string; email: string; owner: boolean }) {
  const [address, setAddress] = useState('');
  const [role, setRole] = useState('resident');
  const [code, setCode] = useState('');
  const [issued, setIssued] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await action(); }
    catch (failure) { setMessage(failure instanceof InvitationError ? failure.message : 'Invitation could not be updated. Check your account, community, code and connection.'); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      if (owner) {
        const result = await createInvitation(database, societyId, uid, address, role);
        setIssued(result); setMessage('Invitation created for three days. Share the community name and code with its recipient. No email was sent.');
      } else {
        await acceptInvitation(database, societyId, { uid, email }, code);
        setCode(''); setMessage('Invitation accepted. Membership is now active in this community.');
      }
    });
  }
  return <section className="profile-panel" aria-label="Community invitations"><h3>{owner ? 'Invite your committee' : 'Have an invitation?'}</h3>
    <p className="section-note">Invitations apply to the selected community. Only the named, verified email can accept. Owners can invite members or admins; ownership changes use a separate process.</p>
    <form className="account-form" onSubmit={submit}>
      {owner ? <><label>Recipient email<input type="email" required maxLength={254} value={address} disabled={busy} onChange={event => setAddress(event.target.value)} /></label><label>Invitation access<select value={role} disabled={busy} onChange={event => setRole(event.target.value)}><option value="resident">Member</option><option value="admin">Admin</option></select></label></> : <label>Invitation code<input required maxLength={128} value={code} disabled={busy} onChange={event => setCode(event.target.value)} /></label>}
      <button disabled={busy}>{owner ? 'Create invitation' : 'Accept invitation'}</button>
    </form>
    {issued && <p>Created invitation code: <code>{issued}</code></p>}
    {owner && <><RecordBrowser database={database} path={`societies/${societyId}/invitations`} title="Invitation history" onSelect={(id) => setCode(id)} /><p className="section-note">Open a history record to select its code, or enter the code below. Only pending invitations can be cancelled.</p><label>Code to cancel<input maxLength={128} value={code} disabled={busy} onChange={event => setCode(event.target.value)} /></label><button disabled={busy || !code.trim()} onClick={() => void run(async () => { await cancelInvitation(database, societyId, code); setCode(''); setMessage('Invitation cancelled. It can no longer be accepted.'); })}>Cancel invitation</button></>}
    <p role="status">{message}</p>
  </section>;
}
