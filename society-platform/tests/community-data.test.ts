import { beforeEach, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';
import { directoryQuery, registerCommunity } from '../web/src/features/communities/data';

const mock = vi.hoisted(() => ({ read: vi.fn(), set: vi.fn(), commit: vi.fn(), batch: vi.fn() }));
vi.mock('firebase/firestore', () => ({
  collection: (_database: unknown, name: string) => name,
  doc: (...args: unknown[]) => args.length === 1 ? { id: 'new-id', path: `${args[0]}/new-id` } : { path: args.slice(1).join('/') },
  query: (...args: unknown[]) => args,
  where: (...args: unknown[]) => ['where', ...args], orderBy: (...args: unknown[]) => ['order', ...args],
  startAt: (...args: unknown[]) => ['startAt', ...args], startAfter: (...args: unknown[]) => ['startAfter', ...args], endAt: (...args: unknown[]) => ['endAt', ...args], limit: (size: number) => ['limit', size],
  getDocs: (...args: unknown[]) => mock.read(...args), serverTimestamp: () => 'server-time',
  writeBatch: () => { mock.batch(); return { set: mock.set, commit: mock.commit }; },
}));
const database = {} as Firestore;
const draft = { name: ' New Mandal ', city: ' Pune ', location: ' Rahatani ', kind: 'ganesh_mandal' as const };
beforeEach(() => { vi.clearAllMocks(); mock.read.mockResolvedValue({ empty: true }); mock.commit.mockResolvedValue(undefined); });

it('builds a bounded public directory search by normalized prefix, city and type', () => {
  const constraints = directoryQuery(database, { name: ' NEW ', city: ' PUNE ', kind: 'ganesh_mandal' });
  expect(constraints).toEqual(['societies', ['where', 'directoryVisible', '==', true], ['where', 'kind', '==', 'ganesh_mandal'], ['where', 'cityKey', '==', 'pune'], ['order', 'nameKey'], ['startAt', 'new'], ['endAt', 'new\uf8ff'], ['limit', 21]]);
});
it('uses the page cursor instead of a second start bound when paging a prefix search', () => {
  const cursor = { id: 'last' } as never;
  const constraints = directoryQuery(database, { name: 'new', city: '', kind: '' }, cursor);
  expect(constraints).toContainEqual(['startAfter', cursor]);
  expect(constraints).not.toContainEqual(['startAt', 'new']);
});
it('commits a new community and initial owner together, using only public fields in the directory', async () => {
  const result = await registerCommunity(database, { uid: 'organizer', email: 'organizer@example.test' }, draft);
  expect(result.id).toBe('new-id');
  expect(mock.set).toHaveBeenCalledTimes(2);
  expect(mock.set.mock.calls[0][1]).toMatchObject({ name: 'New Mandal', nameKey: 'new mandal', cityKey: 'pune', kind: 'ganesh_mandal', ownerUid: 'organizer', registrationStatus: 'self_declared' });
  expect(mock.set.mock.calls[0][1]).not.toHaveProperty('email');
  expect(mock.set.mock.calls[1]).toEqual([{ path: 'societies/new-id/members/organizer' }, { schemaVersion: 1, role: 'owner', status: 'active', email: 'organizer@example.test', createdAt: 'server-time', updatedAt: 'server-time' }]);
  expect(mock.commit).toHaveBeenCalledOnce();
});
it('guides exact duplicates toward joining and never attempts a write', async () => {
  mock.read.mockResolvedValue({ empty: false });
  await expect(registerCommunity(database, { uid: 'organizer', email: 'organizer@example.test' }, draft)).rejects.toThrow('already listed');
  expect(mock.batch).not.toHaveBeenCalled();
});
it('does not report successful registration when the atomic commit is rejected', async () => {
  mock.commit.mockRejectedValueOnce(new Error('permission-denied'));
  await expect(registerCommunity(database, { uid: 'organizer', email: 'organizer@example.test' }, draft)).rejects.toThrow('permission-denied');
});
