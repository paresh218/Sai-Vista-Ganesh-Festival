import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { onSnapshot } from 'firebase/firestore';
import type { Firestore, QueryDocumentSnapshot } from 'firebase/firestore';
import { directoryQuery } from './data';
import { communityKinds, readCommunity } from './model';
import type { Community, DirectoryFilters } from './model';
import { RegisterCommunityForm } from './RegisterCommunityForm';

const emptyFilters: DirectoryFilters = { name: '', city: '', kind: '' };
export function CommunityDirectory({ database, user, onSelect }: { database: Firestore; user: { uid: string; email: string } | null; onSelect: (community: Community) => void }) {
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [records, setRecords] = useState<QueryDocumentSnapshot[]>([]);
  const [cursors, setCursors] = useState<QueryDocumentSnapshot[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [message, setMessage] = useState('Loading communities…');
  const cursor = cursors.at(-1);
  useEffect(() => {
    setRecords([]); setHasNext(false); setMessage('Loading communities…');
    return onSnapshot(directoryQuery(database, filters, cursor), { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache) { setRecords([]); setHasNext(false); setMessage('Waiting for a current community directory…'); return; }
      setRecords(snapshot.docs.slice(0, 20)); setHasNext(snapshot.docs.length > 20);
      setMessage(snapshot.empty ? 'No matching communities found. Try another search or register a new community below.' : 'Showing up to 20 listed communities per page.');
    }, () => { setRecords([]); setHasNext(false); setMessage('Community directory could not be loaded. Check your connection and try again.'); });
  }, [database, filters, cursor]);
  function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setCursors([]); setFilters({ ...draft }); }

  return <><section aria-labelledby="community-directory-title"><p className="eyebrow">Find your people</p><h1 id="community-directory-title">Your community belongs here.</h1><p className="section-note">Find a society, Ganesh mandal, Durga mandal or festival committee. Choose an existing community, then request to join from your account.</p>
    <form className="directory-filters" onSubmit={search}>
      <label>Name starts with<input value={draft.name} maxLength={120} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
      <label>City to search<input value={draft.city} maxLength={80} onChange={e => setDraft({ ...draft, city: e.target.value })} placeholder="Any city" /></label>
      <label>Type to search<select value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value as DirectoryFilters['kind'] })}><option value="">All community types</option>{Object.entries(communityKinds).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <button className="submit-button">Find communities</button>
    </form><p role="status">{message}</p>
    <div className="event-list">{records.map(record => {
      const community = readCommunity(record.id, record.data());
      return <article className="admin-card" key={community.id}><div><span className="eyebrow">{communityKinds[community.kind]}</span><h2>{community.name}</h2><p>{[community.location, community.city].filter(Boolean).join(', ')}</p>{community.registrationStatus === 'self_declared' && <p className="section-note">Organizer-submitted listing</p>}<button onClick={() => onSelect(community)}>Choose {community.name}</button></div></article>;
    })}</div><div className="account-buttons"><button disabled={cursors.length === 0} onClick={() => setCursors(current => current.slice(0, -1))}>Previous communities</button><button disabled={!hasNext || records.length === 0} onClick={() => setCursors(current => [...current, records[records.length - 1]])}>More communities</button></div>
  </section><RegisterCommunityForm database={database} user={user} onSelect={onSelect} /></>;
}
