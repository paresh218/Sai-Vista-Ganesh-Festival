import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';
import { RecordBrowser } from '../web/src/features/platform/RecordBrowser';

const mock = vi.hoisted(() => ({ next: null as null | ((value: unknown) => void), fail: null as null | (() => void), subscribe: vi.fn(), audit: vi.fn(), update: vi.fn(), stop: vi.fn(), limit: vi.fn(), after: vi.fn() }));
vi.mock('firebase/firestore', () => ({
  collection: (...parts: unknown[]) => parts, doc: (...parts: unknown[]) => parts,
  documentId: () => 'id', orderBy: () => 'order', query: (...parts: unknown[]) => parts,
  limit: (size: number) => mock.limit(size), startAfter: (cursor: unknown) => mock.after(cursor), serverTimestamp: () => 'server-time',
  addDoc: (...args: unknown[]) => mock.audit(...args), updateDoc: (...args: unknown[]) => mock.update(...args),
  onSnapshot: (_query: unknown, _options: unknown, next: (value: unknown) => void, fail: () => void) => { mock.subscribe(); mock.next = next; mock.fail = fail; return mock.stop; },
}));
const database = {} as Firestore;
const record = (id: string) => ({ id, data: () => ({ title: `Event ${id}`, status: 'draft', pinned: false }) });
const snapshot = (count = 1, cached = false) => ({ metadata: { fromCache: cached }, empty: count === 0, docs: Array.from({ length: count }, (_, i) => record(String(i))) });
beforeEach(() => { vi.clearAllMocks(); mock.audit.mockResolvedValue({}); mock.update.mockResolvedValue({}); mock.next = null; mock.fail = null; });

it('records a platform view before querying and clears displayed records on cached snapshots or denied access', async () => {
  render(<RecordBrowser database={database} path="societies/alpha/events" title="Events" auditUid="super" />);
  await waitFor(() => expect(mock.subscribe).toHaveBeenCalledOnce());
  expect(mock.audit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ actorUid: 'super', target: 'societies/alpha/events' }));
  act(() => mock.next?.(snapshot()));
  expect(screen.getByText('Event 0')).toBeTruthy();
  expect(screen.queryByLabelText('Visibility for Event 0')).toBeNull();
  act(() => mock.next?.(snapshot(1, true)));
  expect(screen.queryByText('Event 0')).toBeNull();
  act(() => mock.next?.(snapshot()));
  act(() => mock.fail?.());
  expect(screen.queryByText('Event 0')).toBeNull();
});

it('does not query records when the view audit cannot be recorded', async () => {
  mock.audit.mockRejectedValueOnce(new Error('denied'));
  render(<RecordBrowser database={database} path="users" title="Profiles" auditUid="super" />);
  await screen.findByText('Could not verify access or record this view.');
  expect(mock.subscribe).not.toHaveBeenCalled();
});

it('paginates bounded queries and releases old subscriptions', async () => {
  render(<RecordBrowser database={database} path="societies" title="Directory" auditUid="super" />);
  await waitFor(() => expect(mock.subscribe).toHaveBeenCalledOnce());
  act(() => mock.next?.(snapshot(21)));
  expect(screen.queryByText('Event 20')).toBeNull();
  fireEvent.click(screen.getByText('Next page'));
  await waitFor(() => expect(mock.subscribe).toHaveBeenCalledTimes(2));
  expect(mock.after).toHaveBeenCalledWith(expect.objectContaining({ id: '19' }));
  expect(mock.limit).toHaveBeenCalledWith(21);
  expect(mock.stop).toHaveBeenCalledOnce();
});

it('saves only scoped event fields and reports backend rejection', async () => {
  render(<RecordBrowser database={database} path="societies/alpha/events" title="Events" manageEvents />);
  await waitFor(() => expect(mock.subscribe).toHaveBeenCalledOnce());
  act(() => mock.next?.(snapshot()));
  fireEvent.change(screen.getByLabelText('Visibility for Event 0'), { target: { value: 'published' } });
  await screen.findByText('Event saved to the local database.');
  expect(mock.update).toHaveBeenCalledWith([database, 'societies/alpha/events', '0'], { status: 'published', updatedAt: 'server-time' });
  fireEvent.change(screen.getByLabelText('Audience for Event 0'), { target: { value: 'public' } });
  await waitFor(() => expect(mock.update).toHaveBeenLastCalledWith([database, 'societies/alpha/events', '0'], { audience: 'public', updatedAt: 'server-time' }));
  mock.update.mockRejectedValueOnce(new Error('revoked'));
  fireEvent.click(screen.getByLabelText('Feature Event 0'));
  await screen.findByText('Event was not saved. Check your society permissions and connection.');
});
