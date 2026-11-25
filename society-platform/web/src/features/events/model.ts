export type EventStatus = 'draft' | 'published' | 'archived';

export interface SocietyEvent {
  id: string;
  societyId: string;
  title: string;
  description: string;
  startsAt: string;
  venue: string;
  category: string;
  status: EventStatus;
  pinned: boolean;
}

// shortcut: this selects synthetic demo content only; Firestore rules must enforce real tenant access in S03.
export function selectEvents(events: readonly SocietyEvent[], societyId: string, view: 'home' | 'archive' | 'admin') {
  return events.filter(event => event.societyId === societyId && (
    view === 'admin' || event.status === (view === 'archive' ? 'archived' : 'published')
  )).sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
}

export function updateDemoEvent(events: readonly SocietyEvent[], societyId: string, id: string, changes: Pick<SocietyEvent, 'status' | 'pinned'>) {
  return events.map(event => event.societyId === societyId && event.id === id ? { ...event, ...changes } : event);
}
