import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { acceptTransfer, cancelTransfer, requestTransfer } from '../web/src/features/ownership/data';
import { OwnershipPanel } from '../web/src/features/ownership/OwnershipPanel';
const mock = vi.hoisted(() => ({ save: vi.fn(), update: vi.fn(), get: vi.fn(), txUpdate: vi.fn() }));
vi.mock('firebase/firestore', async importOriginal => ({ ...await importOriginal<object>(), collection: (_db: unknown, ...parts: string[]) => parts.join('/'), doc: (...args: unknown[]) => args.length === 1 ? { id: 'code', path: `${args[0]}/code` } : { id: args.at(-1), path: args.slice(1).join('/') }, serverTimestamp: () => 'server-time', setDoc: (...args: unknown[]) => mock.save(...args), updateDoc: (...args: unknown[]) => mock.update(...args), runTransaction: (_db: unknown, callback: (transaction: unknown) => Promise<void>) => callback({ get: mock.get, update: mock.txUpdate }) }));
vi.mock('../web/src/features/platform/RecordBrowser', () => ({ RecordBrowser: ({ onSelect, title }: { onSelect: (id: string, name: string) => void; title: string }) => <button onClick={() => onSelect(title.includes('history') ? 'code' : 'admin', 'Test admin')}>{title}</button> }));
const database = {} as Firestore;
const transfer = { fromUid: 'owner', toUid: 'admin', status: 'pending', expiresAt: Timestamp.fromMillis(Date.now() + 86400000) };
function prepare(changes = {}, root = { ownerUid: 'owner' }) { mock.get.mockReset().mockResolvedValueOnce({ data: () => ({ ...transfer, ...changes }) }).mockResolvedValueOnce({ data: () => root }).mockResolvedValueOnce({ data: () => ({ role: 'owner', status: 'active' }) }).mockResolvedValueOnce({ data: () => ({ role: 'admin', status: 'active' }) }); }
beforeEach(() => { vi.clearAllMocks(); mock.save.mockResolvedValue(undefined); mock.update.mockResolvedValue(undefined); prepare(); });
it('creates expiring nomination and scoped cancellation; failures propagate', async () => {
  expect(await requestTransfer(database, 'alpha', 'owner', 'admin')).toBe('code');
  expect(mock.save.mock.calls[0][1]).toMatchObject({ fromUid: 'owner', toUid: 'admin', status: 'pending', createdAt: 'server-time' });
  await cancelTransfer(database, 'alpha', ' code ');
  expect(mock.update).toHaveBeenCalledWith({ id: 'code', path: 'societies/alpha/ownershipTransfers/code' }, { status: 'cancelled', updatedAt: 'server-time' });
  await expect(cancelTransfer(database, 'alpha', '../bad')).rejects.toThrow();
  mock.save.mockRejectedValueOnce(new Error('offline'));
  await expect(requestTransfer(database, 'alpha', 'owner', 'admin')).rejects.toThrow('offline');
});
it('accepts all four documents together and rejects expired, wrong-user, consumed or stale-owner requests', async () => {
  await acceptTransfer(database, 'alpha', 'admin', 'code');
  expect(mock.txUpdate).toHaveBeenCalledTimes(4);
  expect(mock.txUpdate.mock.calls[0][1]).toMatchObject({ ownerUid: 'admin', ownershipTransferId: 'code' });
  expect(mock.txUpdate.mock.calls[1][1].role).toBe('admin');
  expect(mock.txUpdate.mock.calls[2][1].role).toBe('owner');
  mock.txUpdate.mockClear();
  for (const changes of [{ toUid: 'other' }, { status: 'accepted' }, { expiresAt: Timestamp.fromMillis(1) }]) {
    prepare(changes); await expect(acceptTransfer(database, 'alpha', 'admin', 'code')).rejects.toThrow('unavailable');
  }
  prepare({}, { ownerUid: 'someone-else' });
  await expect(acceptTransfer(database, 'alpha', 'admin', 'code')).rejects.toThrow('Ownership changed');
  expect(mock.txUpdate).not.toHaveBeenCalled();
});
it('requires owner nomination and confirmation, shows code only after save and supports cancellation', async () => {
  render(<OwnershipPanel database={database} societyId="alpha" uid="owner" owner />);
  expect((screen.getByText('Request ownership transfer') as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByText('Choose the next owner')); fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByText('Request ownership transfer'));
  await screen.findByText('Transfer requested. Share the code with the nominated admin. No roles have changed yet.');
  expect(screen.getByText('code')).toBeTruthy();
  fireEvent.click(screen.getByText('Ownership transfer history')); fireEvent.click(screen.getByText('Cancel ownership transfer'));
  await screen.findByText('Transfer cancelled. Ownership is unchanged.');
});
it('nominee must confirm; failed acceptance keeps code and never claims success', async () => {
  prepare({ status: 'cancelled' });
  render(<OwnershipPanel database={database} societyId="alpha" uid="admin" owner={false} />);
  fireEvent.change(screen.getByLabelText('Transfer code'), { target: { value: 'code' } });
  expect((screen.getByText('Accept ownership transfer') as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByText('Accept ownership transfer'));
  await screen.findByText('Ownership was not changed. Check the code, active roles, expiry and community. Older communities need trusted owner metadata setup.');
  expect((screen.getByLabelText('Transfer code') as HTMLInputElement).value).toBe('code');
  expect(screen.queryByText('Ownership transferred successfully.')).toBeNull();
});
