import type { Society } from '../features/societies/types';
import type { SocietyEvent } from '../features/events/model';

export const societies: readonly Society[] = [
  { id: 'sai-vista', name: 'Sai Vista', location: 'Rahatani, Pune', initials: 'SV', tagline: 'Good neighbours. Great moments.' },
  { id: 'maple-grove', name: 'Maple Grove', location: 'Demo community', initials: 'MG', tagline: 'A place to belong, together.' },
];

export const demoEvents: readonly SocietyEvent[] = [
  { id: 'lights', societyId: 'sai-vista', title: 'An evening of lights', description: 'Come together for music, festive treats and a little neighbourhood sparkle.', startsAt: '2026-11-07T18:00:00+05:30', venue: 'Community lawn', category: 'Celebration', status: 'published', pinned: true },
  { id: 'run', societyId: 'sai-vista', title: 'Sunday community run', description: 'An easy morning outdoors. Walk, jog or cheer your neighbours along.', startsAt: '2026-11-01T07:00:00+05:30', venue: 'Main entrance', category: 'Wellbeing', status: 'published', pinned: false },
  { id: 'workshop', societyId: 'sai-vista', title: 'Creative weekend', description: 'A neighbourhood workshop being planned by the committee.', startsAt: '2026-11-14T10:00:00+05:30', venue: 'Clubhouse', category: 'Workshop', status: 'draft', pinned: false },
  { id: 'ganesh', societyId: 'sai-vista', title: 'Ganesh festival memories', description: 'A place to revisit a wonderful season together.', startsAt: '2026-09-14T19:00:00+05:30', venue: 'Festival pandal', category: 'Celebration', status: 'archived', pinned: false },
  { id: 'garden', societyId: 'maple-grove', title: 'The garden gathering', description: 'Meet the neighbours and share ideas for our community garden.', startsAt: '2026-11-08T09:00:00+05:30', venue: 'Garden courtyard', category: 'Community', status: 'published', pinned: true },
];
