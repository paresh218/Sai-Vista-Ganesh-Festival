import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, startAfter, where } from 'firebase/firestore';
import type { Firestore, QueryDocumentSnapshot } from 'firebase/firestore';
import { localDatabase } from '../../services/firebase';
import { EventCard } from './EventCard';
import type { SocietyEvent } from './model';

export function PublicEventFeed({ database, societyId, status }: { database: Firestore; societyId: string; status: 'published' | 'archived' }) {
  const [records, setRecords] = useState<QueryDocumentSnapshot[]>([]);
  const [cursors, setCursors] = useState<QueryDocumentSnapshot[]>([]);
  const [more, setMore] = useState(false);
  const [message, setMessage] = useState('Loading public events…');
  const cursor = cursors.at(-1);
  useEffect(() => {
    setRecords([]); setMore(false); setMessage('Loading public events…');
    return onSnapshot(query(collection(database, 'societies', societyId, 'events'), where('audience', '==', 'public'), where('status', '==', status), orderBy('pinned', 'desc'), orderBy('startsAt'), ...(cursor ? [startAfter(cursor)] : []), limit(21)), { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) { setRecords([]); setMore(false); setMessage('Waiting for current public events…'); return; }
      setRecords(snapshot.docs.slice(0, 20)); setMore(snapshot.docs.length > 20);
      setMessage(snapshot.empty ? 'No public events yet. Only events explicitly shared publicly appear here.' : 'Showing up to 20 public events per page.');
    }, () => { setRecords([]); setMore(false); setMessage('Public events are unavailable. Check the local database connection.'); });
  }, [database, societyId, status, cursor]);
  return <><p role="status">{message}</p>{records.map(record => {
    const data = record.data();
    const event: SocietyEvent = { id: record.id, societyId, title: data.title, description: data.description, startsAt: data.startsAt.toDate().toISOString(), venue: data.venue, category: data.category, status, pinned: data.pinned };
    return <EventCard key={record.id} event={event} />;
  })}<div className="account-buttons"><button disabled={!cursors.length} onClick={() => setCursors(current => current.slice(0, -1))}>Previous events</button><button disabled={!more || !records.length} onClick={() => setCursors(current => [...current, records.at(-1)!])}>More events</button></div></>;
}
export default function PublicEventsRoute(props: { societyId: string; status: 'published' | 'archived' }) {
  return localDatabase ? <PublicEventFeed key={`${props.societyId}:${props.status}`} database={localDatabase} {...props} /> : <p>Start the full local app to view database events.</p>;
}
