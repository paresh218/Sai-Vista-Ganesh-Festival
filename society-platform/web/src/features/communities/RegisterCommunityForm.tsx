import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Firestore } from 'firebase/firestore';
import { communityKinds, CommunityError } from './model';
import type { Community, CommunityDraft } from './model';
import { registerCommunity } from './data';

export function RegisterCommunityForm({ database, user, onSelect }: { database: Firestore; user: { uid: string; email: string } | null; onSelect: (community: Community) => void }) {
  const [draft, setDraft] = useState<CommunityDraft>({ name: '', city: '', location: '', kind: 'society' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || busy) return;
    setBusy(true); setError('');
    try { onSelect(await registerCommunity(database, user, draft)); }
    catch (failure) { setError(failure instanceof CommunityError ? failure.message : 'Community was not registered. Check your verified account and connection, then try again.'); }
    finally { setBusy(false); }
  }
  return <section className="account-panel" aria-labelledby="register-community-title"><h2 id="register-community-title">Bring your community here.</h2><p className="section-note">Societies, mandals and festival committees are welcome. Search first to avoid duplicates. Your community name, type, city and locality will be public. New listings are organizer-submitted and are not independently verified.</p>
    {!user ? <p><a href="#account">Create an account or sign in</a>, then verify your email to register a community.</p> : <form className="account-form" onSubmit={submit}>
      <label>Community name<input value={draft.name} required minLength={2} maxLength={120} disabled={busy} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
      <label>Community type<select value={draft.kind} disabled={busy} onChange={e => setDraft({ ...draft, kind: e.target.value as CommunityDraft['kind'] })}>{Object.entries(communityKinds).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label>City<input value={draft.city} required minLength={2} maxLength={80} disabled={busy} autoComplete="address-level2" onChange={e => setDraft({ ...draft, city: e.target.value })} /></label>
      <label>Area / locality<input value={draft.location} required minLength={2} maxLength={200} disabled={busy} onChange={e => setDraft({ ...draft, location: e.target.value })} /></label>
      <p className="section-note">You will be the initial owner of this new community. Other users must request membership; registering does not grant access to any existing community.</p>
      <button type="submit" className="submit-button" disabled={busy}>{busy ? 'Registering…' : 'Register community'}</button>
    </form>}{error && <p role="alert" className="form-error">{error}</p>}
  </section>;
}
