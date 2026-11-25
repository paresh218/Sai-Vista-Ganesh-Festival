import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { RecordBrowser } from './RecordBrowser';

const areas = { events: 'Events', members: 'Members', invitations: 'Invitations', ownershipTransfers: 'Ownership transfers', households: 'Households', seasons: 'Seasons', content: 'Content', settings: 'Settings', formVersions: 'Forms', registrations: 'Registrations', slotBookings: 'Bookings', ledgerEntries: 'Accounts', mediaAssets: 'Media', auditLog: 'Society audit history' };

export function PlatformPanel({ database, uid }: { database: Firestore; uid: string }) {
  const [access, setAccess] = useState<'checking' | 'active' | 'denied'>('checking');
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [area, setArea] = useState<keyof typeof areas>('events');
  const [view, setView] = useState<'societies' | 'profiles' | 'audit' | 'cleanup'>('societies');
  useEffect(() => onSnapshot(doc(database, 'platformRoles', uid), { includeMetadataChanges: true }, snapshot => {
    const role = snapshot.data();
    const active = !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites && role?.role === 'superadmin' && role?.status === 'active';
    setAccess(active ? 'active' : 'denied');
    if (!active) { setSelected(null); setView('societies'); }
  }, () => { setAccess('denied'); setSelected(null); }), [database, uid]);

  if (access === 'checking') return <p role="status">Checking platform access…</p>;
  if (access !== 'active') return null;
  return <section className="platform-panel" aria-labelledby="platform-title"><p className="eyebrow">Platform superadmin</p><h2 id="platform-title">All communities</h2><p className="section-note">Read-only platform visibility. Community permissions still govern changes. Only local sample data is available in this development build.</p>
    <div className="account-buttons">{(['societies', 'profiles', 'audit', 'cleanup'] as const).map(item => <button key={item} aria-pressed={view === item} onClick={() => { setView(item); setSelected(null); }}>{item === 'societies' ? 'Communities' : item === 'profiles' ? 'User profiles' : item === 'cleanup' ? 'Cleanup requests' : 'Platform view history'}</button>)}</div>
    {view === 'societies' && (selected ? <><div className="account-buttons"><button onClick={() => setSelected(null)}>Back to all communities</button></div><h3>{selected.name}</h3><label>Records to view<select value={area} onChange={e => setArea(e.target.value as keyof typeof areas)}>{Object.entries(areas).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><RecordBrowser key={`${selected.id}:${area}`} database={database} path={`societies/${selected.id}/${area}`} title={`${selected.name} · ${areas[area]}`} auditUid={uid} /></> : <RecordBrowser key="societies" database={database} path="societies" title="Community directory" auditUid={uid} onSelect={(id, name) => setSelected({ id, name })} />)}
    {view === 'profiles' && <RecordBrowser key="profiles" database={database} path="users" title="User profiles" auditUid={uid} />}
    {view === 'audit' && <RecordBrowser key="audit" database={database} path="platformAudit" title="Dashboard view requests" auditUid={uid} />}
    {view === 'cleanup' && <RecordBrowser key="cleanup" database={database} path="accountCleanupRequests" title="Account cleanup requests" auditUid={uid} />}
  </section>;
}
