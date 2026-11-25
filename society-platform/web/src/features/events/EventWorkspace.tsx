import { useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import { CreateEvent } from './CreateEvent';
import { RecordBrowser } from '../platform/RecordBrowser';
export function EventWorkspace({ database, societyId }: { database: Firestore; societyId: string }) {
  const [selected, setSelected] = useState<string>();
  const [message, setMessage] = useState('');
  return <><CreateEvent key={selected ?? 'new'} database={database} societyId={societyId} eventId={selected} onNew={() => setSelected(undefined)} onSaved={() => { setSelected(undefined); setMessage('Event changes saved to the local database.'); }} /><p role="status">{message}</p><p className="section-note">Open an event below to edit its text, venue and date. Save edits before opening another record.</p><RecordBrowser database={database} path={`societies/${societyId}/events`} title="Community event workspace" manageEvents onSelect={id => { setSelected(id); setMessage(''); }} /></>;
}
