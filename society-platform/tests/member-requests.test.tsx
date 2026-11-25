import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Firestore } from 'firebase/firestore';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemberRequests } from '../web/src/features/members/MemberRequests';

const mock = vi.hoisted(() => ({ next: null as null | ((value: unknown) => void), fail: null as null | (() => void), update: vi.fn(), stop: vi.fn(), limit: vi.fn() }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...parts: string[]) => parts.join('/'), doc: (_db: unknown, ...parts: string[]) => parts.join('/'),
  query: (...args: unknown[]) => args, where: () => 'pending', limit: (size: number) => mock.limit(size), serverTimestamp: () => 'server-time',
  updateDoc: (...args: unknown[]) => mock.update(...args),
  onSnapshot: (_query: unknown, ...args: unknown[]) => { const callbacks = args.filter(arg => typeof arg === 'function') as [((value: unknown) => void), (() => void)]; mock.next = callbacks[0]; mock.fail = callbacks[1]; return mock.stop; },
}));
const database = {} as Firestore;
const snapshot = (cached = false) => ({ empty: false, docs: [{ id: 'applicant', data: () => ({ email: 'applicant@example.test' }) }], metadata: { fromCache: cached } });
beforeEach(() => { vi.clearAllMocks(); mock.update.mockResolvedValue(undefined); });

it('approves or declines only the selected pending member and reports rejected writes', async () => {
  render(<MemberRequests database={database} societyId="alpha" />);
  act(() => mock.next?.(snapshot()));
  fireEvent.click(screen.getByRole('button', { name: 'Approve applicant@example.test' }));
  await screen.findByText('Community membership approved locally.');
  expect(mock.update).toHaveBeenCalledWith('societies/alpha/members/applicant', { status: 'active', updatedAt: 'server-time' });
  mock.update.mockRejectedValueOnce(new Error('denied'));
  fireEvent.click(screen.getByRole('button', { name: 'Decline applicant@example.test' }));
  await screen.findByText('The request could not be updated. Access may have changed.');
  expect(mock.update).toHaveBeenLastCalledWith('societies/alpha/members/applicant', { status: 'revoked', updatedAt: 'server-time' });
  expect(mock.limit).toHaveBeenCalledWith(20);
});

it('clears personal request details when permission fails or only cached data is available', () => {
  const result = render(<MemberRequests database={database} societyId="alpha" />);
  act(() => mock.next?.(snapshot()));
  expect(screen.getByRole('button', { name: 'Approve applicant@example.test' })).toBeTruthy();
  act(() => mock.next?.(snapshot(true)));
  expect(screen.queryByRole('button', { name: 'Approve applicant@example.test' })).toBeNull();
  act(() => mock.next?.(snapshot()));
  act(() => mock.fail?.());
  expect(screen.queryByRole('button', { name: 'Approve applicant@example.test' })).toBeNull();
  result.unmount();
  expect(mock.stop).toHaveBeenCalledOnce();
});
