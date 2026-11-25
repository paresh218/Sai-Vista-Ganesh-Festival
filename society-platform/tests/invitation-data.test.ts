import { beforeEach, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';
import { acceptInvitation, cancelInvitation, createInvitation } from '../web/src/features/invitations/data';

const mock = vi.hoisted(() => ({ save: vi.fn(), update: vi.fn(), get: vi.fn(), set: vi.fn(), consume: vi.fn(), transaction: vi.fn() }));
vi.mock('firebase/firestore', () => {
  class Timestamp { constructor(private value: number) {} static fromMillis(value: number) { return new Timestamp(value); } toMillis() { return this.value; } }
  return { Timestamp, collection: (_db: unknown, ...parts: string[]) => parts.join('/'), doc: (...args: unknown[]) => args.length === 1 ? { id: 'code', path: `${args[0]}/code` } : { id: args.at(-1), path: args.slice(1).join('/') }, serverTimestamp: () => 'server-time', setDoc: (...args: unknown[]) => mock.save(...args), updateDoc: (...args: unknown[]) => mock.update(...args), runTransaction: (_db: unknown, callback: (tx: unknown) => Promise<void>) => { mock.transaction(); return callback({ get: mock.get, set: mock.set, update: mock.consume }); } };
});
import { Timestamp } from 'firebase/firestore';
const database = {} as Firestore;
const user = { uid: 'guest', email: 'guest@example.test' };
const invite = (changes = {}) => ({ data: () => ({ email: user.email, role: 'admin', status: 'pending', expiresAt: Timestamp.fromMillis(Date.now() + 86400000), ...changes }) });
const member = (data?: object) => ({ exists: () => !!data, data: () => data });
beforeEach(() => { vi.clearAllMocks(); mock.save.mockResolvedValue(undefined); mock.update.mockResolvedValue(undefined); mock.get.mockResolvedValueOnce(invite()).mockResolvedValueOnce(member()); });

it('issues only member/admin invitations with normalized email and bounded expiry after successful save', async () => {
  const now = Date.now();
  expect(await createInvitation(database, 'alpha', 'owner', ' Guest@Example.Test ', 'admin')).toBe('code');
  const data = mock.save.mock.calls[0][1];
  expect(data).toMatchObject({ email: user.email, role: 'admin', status: 'pending', createdBy: 'owner', createdAt: 'server-time' });
  expect(data.expiresAt.toMillis()).toBeGreaterThanOrEqual(now + 3 * 86400000);
  expect(data.expiresAt.toMillis()).toBeLessThanOrEqual(Date.now() + 3 * 86400000);
  await expect(createInvitation(database, 'alpha', 'owner', 'invalid', 'resident')).rejects.toThrow('valid invitation email');
  await expect(createInvitation(database, 'alpha', 'owner', user.email, 'owner')).rejects.toThrow('member or admin');
  mock.save.mockRejectedValueOnce(new Error('offline'));
  await expect(createInvitation(database, 'alpha', 'owner', user.email, 'resident')).rejects.toThrow('offline');
});
it('accepts with one transaction and consumes the matching invitation together with active membership', async () => {
  await acceptInvitation(database, 'alpha', user, ' code ');
  expect(mock.transaction).toHaveBeenCalledOnce();
  expect(mock.set).toHaveBeenCalledWith({ id: 'guest', path: 'societies/alpha/members/guest' }, { schemaVersion: 1, email: user.email, role: 'admin', status: 'active', invitationId: 'code', createdAt: 'server-time', updatedAt: 'server-time' });
  expect(mock.consume).toHaveBeenCalledWith({ id: 'code', path: 'societies/alpha/invitations/code' }, { status: 'accepted', acceptedBy: 'guest', updatedAt: 'server-time' });
});
it('preserves a pending membership creation time and refuses active or revoked membership replacement', async () => {
  for (const status of ['active', 'revoked']) {
    mock.get.mockReset().mockResolvedValueOnce(invite()).mockResolvedValueOnce(member({ role: 'resident', status }));
    await expect(acceptInvitation(database, 'alpha', user, 'code')).rejects.toThrow('already has a membership');
  }
  expect(mock.set).not.toHaveBeenCalled();
  mock.get.mockReset().mockResolvedValueOnce(invite()).mockResolvedValueOnce(member({ role: 'resident', status: 'pending', createdAt: 'original-time' }));
  await acceptInvitation(database, 'alpha', user, 'code');
  expect(mock.set.mock.calls[0][1].createdAt).toBe('original-time');
});
it('rejects expired, mismatched, consumed, missing or malformed invitations without writing', async () => {
  for (const changes of [{ expiresAt: Timestamp.fromMillis(1) }, { email: 'other@example.test' }, { status: 'accepted' }, { role: 'owner' }, { expiresAt: null }]) {
    mock.get.mockReset().mockResolvedValueOnce(invite(changes)).mockResolvedValueOnce(member());
    await expect(acceptInvitation(database, 'alpha', user, 'code')).rejects.toThrow('unavailable');
  }
  mock.get.mockReset().mockResolvedValueOnce({ data: () => undefined }).mockResolvedValueOnce(member());
  await expect(acceptInvitation(database, 'alpha', user, 'code')).rejects.toThrow('unavailable');
  await expect(acceptInvitation(database, 'alpha', user, '../bad')).rejects.toThrow('valid invitation code');
  expect(mock.set).not.toHaveBeenCalled(); expect(mock.consume).not.toHaveBeenCalled();
});
it('cancels only the selected community code and propagates backend rejection', async () => {
  await cancelInvitation(database, 'alpha', ' code ');
  expect(mock.update).toHaveBeenCalledWith({ id: 'code', path: 'societies/alpha/invitations/code' }, { status: 'cancelled', updatedAt: 'server-time' });
  await expect(cancelInvitation(database, 'alpha', 'a/b')).rejects.toThrow('valid invitation code');
  mock.update.mockRejectedValueOnce(new Error('denied'));
  await expect(cancelInvitation(database, 'alpha', 'code')).rejects.toThrow('denied');
});
