import type { SocietyEvent } from '../events/model';

interface Props {
  events: SocietyEvent[];
  onChange: (event: SocietyEvent, status: SocietyEvent['status'], pinned: boolean) => void;
}

export function AdminPage({ events, onChange }: Props) {
  return <section aria-labelledby="admin-title">
    <div className="section-heading"><div><p className="eyebrow">Committee workspace</p><h2 id="admin-title">Make room for what’s next.</h2></div><span className="pill">Demo admin</span></div>
    <p className="section-note">Try publishing, featuring or archiving an event. Changes stay in this tab and reset on reload. This preview has no login or real records.</p>
    <div className="admin-list">{events.map(event => <article className="admin-card" key={event.id}>
      <div><span className={`status ${event.status}`}>{event.status}</span><h3>{event.title}</h3><p>{event.venue}</p></div>
      <div className="admin-actions">
        <label>Visibility for {event.title}<select value={event.status} onChange={e => onChange(event, e.target.value as SocietyEvent['status'], event.pinned)}>
          <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
        </select></label>
        <label className="checkbox-label"><input type="checkbox" checked={event.pinned} onChange={e => onChange(event, event.status, e.target.checked)} />Feature {event.title}</label>
      </div>
    </article>)}</div>
  </section>;
}
