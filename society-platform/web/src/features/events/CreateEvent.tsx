import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { addDoc, collection, doc, getDocFromServer, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

export interface EventDraft { title: string; description: string; startsAt: string; venue: string; category: string; audience: string; status: string; pinned: boolean }
const empty: EventDraft = { title: '', description: '', startsAt: '', venue: '', category: '', audience: 'members', status: 'draft', pinned: false };
export function eventContent(draft: EventDraft) {
  const title = draft.title.trim(), venue = draft.venue.trim(), category = draft.category.trim();
  const date = new Date(draft.startsAt);
  if (!title || title.length > 160 || !venue || venue.length > 250 || !category || category.length > 80 || draft.description.length > 5000 || !Number.isFinite(date.getTime()) || !['members', 'public'].includes(draft.audience) || !['draft', 'published', 'archived'].includes(draft.status) || typeof draft.pinned !== 'boolean') throw new Error('Check the event fields, date, audience and visibility.');
  return { schemaVersion: 1, title, description: draft.description.trim(), startsAt: Timestamp.fromDate(date), venue, category, audience: draft.audience, status: draft.status, pinned: draft.pinned };
}
export async function saveEventChanges(database: Firestore, societyId: string, id: string, version: Timestamp, draft: EventDraft) {
  const content = eventContent(draft);
  const reference = doc(database, 'societies', societyId, 'events', id);
  await runTransaction(database, async transaction => {
    const current = (await transaction.get(reference)).data();
    if (!current?.updatedAt?.isEqual(version)) throw new Error('Event changed. Reopen it before saving.');
    transaction.update(reference, { ...content, updatedAt: serverTimestamp() });
  });
}
export function CreateEvent({ database, societyId, eventId, onSaved, onNew }: { database: Firestore; societyId: string; eventId?: string; onSaved?: () => void; onNew?: () => void }) {
  const [draft, setDraft] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(!eventId);
  const [version, setVersion] = useState<Timestamp | null>(null);
  useEffect(() => {
    if (!eventId) { setDraft(empty); setLoaded(true); setVersion(null); return; }
    let disposed = false;
    setLoaded(false); setDraft(empty);
    void getDocFromServer(doc(database, 'societies', societyId, 'events', eventId)).then(snapshot => {
      if (disposed) return;
      const data = snapshot.data();
      if (!data) throw new Error('Event missing');
      const date = data.startsAt.toDate();
      const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setDraft({ title: data.title, description: data.description, startsAt: localTime, venue: data.venue, category: data.category, audience: data.audience ?? 'members', status: data.status, pinned: data.pinned });
      setVersion(data.updatedAt); setLoaded(true);
    }).catch(() => { if (!disposed) setMessage('Event could not be loaded from the server. Reopen it when connected.'); });
    return () => { disposed = true; };
  }, [database, societyId, eventId]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !loaded) return;
    let content;
    try { content = eventContent(draft); } catch { setMessage('Check the event fields, date, audience and visibility.'); return; }
    setBusy(true); setMessage('');
    try {
      if (eventId && version) await saveEventChanges(database, societyId, eventId, version, draft);
      else if (!eventId) await addDoc(collection(database, 'societies', societyId, 'events'), { ...content, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      else throw new Error('Missing event version');
      if (!eventId) setDraft(empty);
      setMessage('Event saved. Published public events appear on the home page without redeployment.'); onSaved?.();
    }
    catch (failure) { setMessage(failure instanceof Error && failure.message === 'Event changed. Reopen it before saving.' ? 'Another admin changed this event. Your edits are retained; reopen the record before retrying.' : 'Event was not saved. Your inputs are retained. Check your admin access and connection.'); }
    finally { setBusy(false); }
  }
  return <section className="profile-panel"><h3>{eventId ? 'Edit community event' : 'Create community event'}</h3>{eventId && <button type="button" disabled={busy} onClick={onNew}>New event</button>}<p className="section-note">Public events expose all event text, date and venue to visitors. Keep private contacts and registrations out of the event. Drafts and member-only events stay off the public home page.</p><fieldset disabled={!loaded || busy}><form className="account-form" onSubmit={submit}>
    {(['title', 'venue', 'category'] as const).map(field => <label key={field}>Event {field}<input required maxLength={field === 'title' ? 160 : field === 'venue' ? 250 : 80} disabled={busy} value={draft[field]} onChange={event => setDraft({ ...draft, [field]: event.target.value })} /></label>)}
    <label>Event description<textarea maxLength={5000} disabled={busy} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /></label>
    <label>Event date and time<input type="datetime-local" required disabled={busy} value={draft.startsAt} onChange={event => setDraft({ ...draft, startsAt: event.target.value })} /></label><p className="section-note">Enter time in this device’s timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Event cards display India Standard Time.</p>
    <label>Event audience<select value={draft.audience} disabled={busy} onChange={event => setDraft({ ...draft, audience: event.target.value })}><option value="members">Members only</option><option value="public">Public visitors</option></select></label>
    <label>Event visibility<select value={draft.status} disabled={busy} onChange={event => setDraft({ ...draft, status: event.target.value })}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
    <label><input type="checkbox" checked={draft.pinned} disabled={busy} onChange={event => setDraft({ ...draft, pinned: event.target.checked })} />Feature this event</label><button disabled={busy}>Save community event</button>
  </form></fieldset><p role="status">{message}</p></section>;
}
