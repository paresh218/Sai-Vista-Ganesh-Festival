import { useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import { RecordBrowser } from '../platform/RecordBrowser';
import { acceptTransfer, cancelTransfer, requestTransfer } from './data';

export function OwnershipPanel({ database, societyId, uid, owner }: { database: Firestore; societyId: string; uid: string; owner: boolean }) {
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [code, setCode] = useState('');
  const [issued, setIssued] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await action(); }
    catch { setMessage('Ownership was not changed. Check the code, active roles, expiry and community. Older communities need trusted owner metadata setup.'); }
    finally { setBusy(false); }
  }
  return <section className="profile-panel" aria-label="Community ownership"><h3>Community ownership</h3><p className="section-note">The current owner nominates an active admin. That admin must accept within three days. Acceptance makes the previous owner an admin and keeps one active owner. Platform privileges are unaffected.</p>
    {owner ? <><RecordBrowser database={database} path={`societies/${societyId}/members`} title="Choose the next owner" onSelect={(id, name) => { if (!busy) { setTarget({ id, name }); setConfirmed(false); } }} />{target && <p>Nominee: {target.name}</p>}</> : <p>Enter the transfer code shared by your community owner.</p>}
    <label className="checkbox-label"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />{owner ? 'I confirm nominating this admin as the next owner.' : 'I accept ownership and responsibility for this community.'}</label>
    {owner ? <button disabled={!target || !confirmed || busy} onClick={() => void run(async () => { const result = await requestTransfer(database, societyId, uid, target!.id); setIssued(result); setConfirmed(false); setMessage('Transfer requested. Share the code with the nominated admin. No roles have changed yet.'); })}>Request ownership transfer</button> : null}
    {issued && <p>Transfer code: <code>{issued}</code></p>}
    <label>{owner ? 'Transfer code to cancel' : 'Transfer code'}<input maxLength={128} value={code} disabled={busy} onChange={event => setCode(event.target.value)} /></label>
    {owner ? <><RecordBrowser database={database} path={`societies/${societyId}/ownershipTransfers`} title="Ownership transfer history" onSelect={id => { if (!busy) setCode(id); }} /><button disabled={!code.trim() || busy} onClick={() => void run(async () => { await cancelTransfer(database, societyId, code); setCode(''); setMessage('Transfer cancelled. Ownership is unchanged.'); })}>Cancel ownership transfer</button></> : <button disabled={!code.trim() || !confirmed || busy} onClick={() => void run(async () => { await acceptTransfer(database, societyId, uid, code); setCode(''); setConfirmed(false); setMessage('Ownership transferred successfully.'); })}>Accept ownership transfer</button>}
    <p role="status">{message}</p>
  </section>;
}
