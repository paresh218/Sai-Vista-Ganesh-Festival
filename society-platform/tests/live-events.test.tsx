import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';
import { CreateEvent, eventContent, saveEventChanges } from '../web/src/features/events/CreateEvent';
import { Timestamp } from 'firebase/firestore';
import { PublicEventFeed } from '../web/src/features/events/PublicEventsRoute';
const mock = vi.hoisted(() => ({ add: vi.fn(), get: vi.fn(), txGet: vi.fn(), txUpdate: vi.fn(), query: vi.fn(), next: null as null | ((snapshot: unknown) => void), fail: null as null | (() => void), stop: vi.fn() }));
vi.mock('../web/src/services/firebase', () => ({ localDatabase: null }));
vi.mock('firebase/firestore', async importOriginal => ({ ...await importOriginal<object>(), collection: (_db: unknown, ...parts: string[]) => parts.join('/'), doc: (_db: unknown, ...parts: string[]) => parts.join('/'), getDocFromServer: (...args: unknown[]) => mock.get(...args), runTransaction: (_db: unknown, callback: (tx: unknown) => Promise<void>) => callback({ get: mock.txGet, update: mock.txUpdate }), where: (...args: unknown[]) => ['where', ...args], orderBy: (...args: unknown[]) => ['order', ...args], startAfter: (cursor: unknown) => ['after', cursor], limit: (size: number) => ['limit', size], query: (...args: unknown[]) => { mock.query(...args); return args; }, serverTimestamp: () => 'server-time', addDoc: (...args: unknown[]) => mock.add(...args), onSnapshot: (_q: unknown, _options: unknown, next: (snapshot: unknown) => void, fail: () => void) => { mock.next = next; mock.fail = fail; return mock.stop; } }));
const database = {} as Firestore;
beforeEach(() => { vi.clearAllMocks(); mock.add.mockResolvedValue({ id: 'new' }); });
const draft = { title: ' Gathering ', description: 'Shared celebration', startsAt: '2026-11-01T12:00', venue: ' Lawn ', category: ' Community ', status: 'draft', audience: 'members', pinned: false };
function fill() {
  for (const [label, value] of [['Event title', draft.title], ['Event venue', draft.venue], ['Event category', draft.category], ['Event date and time', draft.startsAt]]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
const snapshot = (count = 1, cached = false) => ({ empty: count === 0, metadata: { fromCache: cached }, docs: Array.from({ length: count }, (_, index) => ({ id: `event-${index}`, data: () => ({ title: `Database event ${index}`, description: 'Public text', startsAt: { toDate: () => new Date('2026-11-01T12:00:00Z') }, venue: 'Lawn', category: 'Community', pinned: false }) })) });
it('normalizes valid drafts and rejects invalid dates, lengths and publication choices', () => {
  expect(eventContent(draft)).toMatchObject({ title: 'Gathering', venue: 'Lawn', category: 'Community', audience: 'members', status: 'draft' });
  for (const changes of [{ title: ' ' }, { title: 'x'.repeat(161) }, { startsAt: 'bad' }, { audience: 'everyone' }, { status: 'secret' }, { venue: '' }, { category: '' }, { description: 'x'.repeat(5001) }]) expect(() => eventContent({ ...draft, ...changes })).toThrow();
});
it('creates a default private draft, retains rejected inputs, and only clears after confirmed save', async () => {
  render(<CreateEvent database={database} societyId="alpha" />); fill();
  expect((screen.getByLabelText('Event audience') as HTMLSelectElement).value).toBe('members');
  mock.add.mockRejectedValueOnce(new Error('offline'));
  fireEvent.click(screen.getByText('Save community event'));
  await screen.findByText('Event was not saved. Your inputs are retained. Check your admin access and connection.');
  expect((screen.getByLabelText('Event title') as HTMLInputElement).value).toBe(draft.title);
  fireEvent.change(screen.getByLabelText('Event audience'), { target: { value: 'public' } });
  fireEvent.change(screen.getByLabelText('Event visibility'), { target: { value: 'published' } });
  fireEvent.click(screen.getByText('Save community event'));
  await screen.findByText('Event saved. Published public events appear on the home page without redeployment.');
  expect(mock.add).toHaveBeenLastCalledWith('societies/alpha/events', expect.objectContaining({ title: 'Gathering', audience: 'public', status: 'published', createdAt: 'server-time' }));
  expect((screen.getByLabelText('Event title') as HTMLInputElement).value).toBe('');
});
it('subscribes to explicitly public scoped events with bounded ordering and cursor navigation', () => {
  render(<PublicEventFeed database={database} societyId="alpha" status="published" />);
  expect(mock.query).toHaveBeenCalledWith('societies/alpha/events', ['where', 'audience', '==', 'public'], ['where', 'status', '==', 'published'], ['order', 'pinned', 'desc'], ['order', 'startsAt'], ['limit', 21]);
  act(() => mock.next?.(snapshot(21)));
  expect(screen.queryByText('Database event 20')).toBeNull();
  fireEvent.click(screen.getByText('More events'));
  expect(mock.query.mock.lastCall).toContainEqual(['after', expect.objectContaining({ id: 'event-19' })]);
  expect(screen.queryByText('Database event 0')).toBeNull();
  fireEvent.click(screen.getByText('Previous events'));
  expect(mock.query.mock.lastCall).not.toContainEqual(['after', expect.anything()]);
});
it('clears rendered events after cache/error changes and reports an empty archive', () => {
  const view = render(<PublicEventFeed database={database} societyId="alpha" status="archived" />);
  act(() => mock.next?.(snapshot())); expect(screen.getByText('Database event 0')).toBeTruthy();
  act(() => mock.next?.(snapshot(1, true))); expect(screen.queryByText('Database event 0')).toBeNull();
  act(() => mock.next?.(snapshot())); act(() => mock.fail?.()); expect(screen.queryByText('Database event 0')).toBeNull();
  act(() => mock.next?.(snapshot(0))); expect(screen.getByText('No public events yet. Only events explicitly shared publicly appear here.')).toBeTruthy();
  view.unmount(); expect(mock.stop).toHaveBeenCalledOnce();
});
it('updates event text transactionally, preserves createdAt and rejects a concurrent admin change', async () => {
  const version = Timestamp.fromMillis(1);
  mock.txGet.mockResolvedValue({ data: () => ({ updatedAt: version }) });
  await saveEventChanges(database, 'alpha', 'record', version, draft);
  expect(mock.txUpdate).toHaveBeenCalledWith('societies/alpha/events/record', expect.objectContaining({ title: 'Gathering', updatedAt: 'server-time' }));
  expect(mock.txUpdate.mock.calls[0][1]).not.toHaveProperty('createdAt');
  mock.txUpdate.mockClear();
  mock.txGet.mockResolvedValue({ data: () => ({ updatedAt: Timestamp.fromMillis(2) }) });
  await expect(saveEventChanges(database, 'alpha', 'record', version, draft)).rejects.toThrow('Event changed');
  expect(mock.txUpdate).not.toHaveBeenCalled();
});
it('loads an existing event, retains conflicted edits and reports a later confirmed save', async () => {
  const version = Timestamp.fromMillis(1);
  mock.get.mockResolvedValue({ data: () => ({ ...draft, title: 'Original event', startsAt: Timestamp.fromDate(new Date('2026-11-01T12:00:00Z')), updatedAt: version }) });
  mock.txGet.mockResolvedValue({ data: () => ({ updatedAt: Timestamp.fromMillis(2) }) });
  const saved = vi.fn();
  render(<CreateEvent database={database} societyId="alpha" eventId="record" onSaved={saved} />);
  await screen.findByDisplayValue('Original event');
  fireEvent.change(screen.getByLabelText('Event title'), { target: { value: 'Edited event' } });
  fireEvent.click(screen.getByText('Save community event'));
  await screen.findByText('Another admin changed this event. Your edits are retained; reopen the record before retrying.');
  expect((screen.getByLabelText('Event title') as HTMLInputElement).value).toBe('Edited event');
  expect(saved).not.toHaveBeenCalled();
  mock.txGet.mockResolvedValue({ data: () => ({ updatedAt: version }) });
  fireEvent.click(screen.getByText('Save community event'));
  await screen.findByText('Event saved. Published public events appear on the home page without redeployment.');
  expect(saved).toHaveBeenCalledOnce();
});
