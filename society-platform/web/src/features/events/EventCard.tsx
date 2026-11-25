import type { SocietyEvent } from './model';

export function EventCard({ event }: { event: SocietyEvent }) {
  const date = new Date(event.startsAt);
  const day = new Intl.DateTimeFormat('en-IN', { day: '2-digit', timeZone: 'Asia/Kolkata' }).format(date);
  const month = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }).format(date);
  const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(date);
  return <article className={`event-card ${event.pinned ? 'featured' : ''}`}>
    <div className="date-tile" aria-label={`${day} ${month}`}><span>{month}</span><strong>{day}</strong></div>
    <div className="event-content">
      <div className="eyebrow">{event.category}{event.pinned && <span className="pin">Featured</span>}</div>
      <h3>{event.title}</h3>
      <p>{event.description}</p>
      <p className="event-meta"><time dateTime={event.startsAt}>{time} IST</time><span aria-hidden="true"> · </span>{event.venue}</p>
    </div>
  </article>;
}
