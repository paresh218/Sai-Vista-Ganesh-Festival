import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

export interface CommunityBrand { name: string; tagline: string; announcement: string }
export function brandContent(draft: CommunityBrand) {
  const value = { name: draft.name.trim(), tagline: draft.tagline.trim(), announcement: draft.announcement.trim() };
  if (value.name.length < 2 || value.name.length > 120 || value.tagline.length < 2 || value.tagline.length > 160 || value.announcement.length > 500) throw new Error('Check community name, tagline and announcement lengths.');
  return value;
}
export function BrandSettings({ database, societyId }: { database: Firestore; societyId: string }) {
  const [draft, setDraft] = useState<CommunityBrand>({ name: '', tagline: '', announcement: '' });
  const dirty = useRef(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => onSnapshot(doc(database, 'societies', societyId, 'settings', 'public'), { includeMetadataChanges: true }, snapshot => {
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) { setReady(false); return; }
    const data = snapshot.data(); if (!dirty.current) setDraft({ name: data?.name ?? '', tagline: data?.tagline ?? '', announcement: data?.announcement ?? '' }); setReady(true);
  }, () => { setReady(false); setMessage('Brand settings are unavailable. Check your community access.'); }), [database, societyId]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!ready || busy) return;
    let content;
    try { content = brandContent(draft); } catch { setMessage('Check community name, tagline and announcement lengths.'); return; }
    setBusy(true); setMessage('');
    try { await setDoc(doc(database, 'societies', societyId, 'settings', 'public'), { ...content, schemaVersion: 1, updatedAt: serverTimestamp() }); dirty.current = false; setDraft(content); setMessage('Community branding saved. Public screens refresh automatically.'); }
    catch { setMessage('Branding was not saved. Keep your changes and retry when connected.'); }
    finally { setBusy(false); }
  }
  return <section className="profile-panel"><h3>Community appearance</h3><p className="section-note">These public texts use the existing festival theme. Display name changes do not rename the directory listing or transfer ownership. Keep private contact details out of announcements.</p><form className="account-form" onSubmit={save}>{(['name', 'tagline', 'announcement'] as const).map(field => <label key={field}>Public {field}<input required={field !== 'announcement'} maxLength={field === 'name' ? 120 : field === 'tagline' ? 160 : 500} value={draft[field]} disabled={!ready || busy} onChange={event => { dirty.current = true; setDraft({ ...draft, [field]: event.target.value }); }} /></label>)}<button disabled={!ready || busy}>Save community appearance</button></form><p role="status">{message}</p></section>;
}
