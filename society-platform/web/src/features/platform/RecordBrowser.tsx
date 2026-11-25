import { useEffect, useState } from 'react';
import { addDoc, collection, doc, documentId, limit, onSnapshot, orderBy, query, serverTimestamp, startAfter, updateDoc } from 'firebase/firestore';
import type { Firestore, QueryDocumentSnapshot } from 'firebase/firestore';

interface Props {
  database: Firestore;
  path: string;
  title: string;
  auditUid?: string;
  manageEvents?: boolean;
  onSelect?: (id: string, name: string) => void;
}

function display(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate().toLocaleString();
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function RecordBrowser({ database, path, title, auditUid, manageEvents = false, onSelect }: Props) {
  const [records, setRecords] = useState<QueryDocumentSnapshot[]>([]);
  const [cursors, setCursors] = useState<QueryDocumentSnapshot[]>([]);
  const [message, setMessage] = useState('Loading…');
  const [hasNext, setHasNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const cursor = cursors.at(-1);

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    setRecords([]); setHasNext(false); setMessage('Loading…');
    const criteria = [orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(21)];
    async function subscribe() {
      try {
        // Records of dashboard view requests are append-only. Direct API reads still need server-side auditing before production.
        if (auditUid) await addDoc(collection(database, 'platformAudit'), { actorUid: auditUid, action: 'view', target: path, createdAt: serverTimestamp() });
        if (disposed) return;
        unsubscribe = onSnapshot(query(collection(database, path), ...criteria), { includeMetadataChanges: true }, snapshot => {
          if (snapshot.metadata.fromCache) { setRecords([]); setHasNext(false); setMessage('Waiting for a verified connection…'); return; }
          setRecords(snapshot.docs.slice(0, 20)); setHasNext(snapshot.docs.length > 20);
          setMessage(snapshot.empty ? 'No records here yet.' : 'Showing up to 20 records per page.');
        }, () => { setRecords([]); setHasNext(false); setMessage('Access is unavailable or has been revoked.'); });
      } catch { if (!disposed) { setRecords([]); setMessage('Could not verify access or record this view.'); } }
    }
    void subscribe();
    return () => { disposed = true; unsubscribe?.(); };
  }, [database, path, auditUid, cursor]);

  async function edit(record: QueryDocumentSnapshot, change: { status?: string; pinned?: boolean; audience?: string }) {
    if (busy) return;
    setBusy(true);
    try { await updateDoc(doc(database, path, record.id), { ...change, updatedAt: serverTimestamp() }); setMessage('Event saved to the local database.'); }
    catch { setMessage('Event was not saved. Check your society permissions and connection.'); }
    finally { setBusy(false); }
  }

  return <section className="profile-panel" aria-label={title}><h3>{title}</h3><p role="status">{message}</p>
    <div className="admin-list">{records.map(record => {
      const data = record.data();
      const name = String(data.title ?? data.name ?? data.displayName ?? data.email ?? record.id);
      return <article className="admin-card" key={record.id}><div><h4>{name}</h4>
        <dl className="record-fields">{Object.entries(data).filter(([key]) => !['schemaVersion', 'title', 'name', 'displayName', 'email'].includes(key)).map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, ' $1')}</dt><dd>{display(value)}</dd></div>)}</dl>
        {onSelect && <button onClick={() => onSelect(record.id, name)}>Open {name}</button>}
      </div>{manageEvents && <div className="admin-actions"><label>Audience for {name}<select disabled={busy} value={data.audience ?? 'members'} onChange={e => void edit(record, { audience: e.target.value })}><option value="members">Members only</option><option value="public">Public visitors</option></select></label><label>Visibility for {name}<select disabled={busy} value={data.status} onChange={e => void edit(record, { status: e.target.value })}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><label className="checkbox-label"><input type="checkbox" disabled={busy} checked={data.pinned === true} onChange={e => void edit(record, { pinned: e.target.checked })} />Feature {name}</label></div>}</article>;
    })}</div>
    <div className="account-buttons"><button disabled={cursors.length === 0} onClick={() => setCursors(current => current.slice(0, -1))}>Previous page</button><button disabled={!hasNext || records.length === 0} onClick={() => setCursors(current => [...current, records[records.length - 1]])}>Next page</button></div>
  </section>;
}
