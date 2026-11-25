import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';
import { PlatformPanel } from '../web/src/features/platform/PlatformPanel';

const mock = vi.hoisted(() => ({ callback: null as null | ((value: unknown) => void), fail: null as null | (() => void), stop: vi.fn() }));
vi.mock('firebase/firestore', () => ({
  doc: (...parts: unknown[]) => parts,
  onSnapshot: (_ref: unknown, _options: unknown, next: (value: unknown) => void, fail: () => void) => { mock.callback = next; mock.fail = fail; return mock.stop; },
}));
vi.mock('../web/src/features/platform/RecordBrowser', () => ({ RecordBrowser: ({ title, onSelect }: { title: string; onSelect?: (id: string, name: string) => void }) => <div>{title}{onSelect && <button onClick={() => onSelect('beta', 'Hidden society')}>Choose test society</button>}</div> }));
const database = {} as Firestore;
const role = (status = 'active', fromCache = false, name = 'superadmin') => ({ metadata: { fromCache }, data: () => ({ role: name, status }) });
beforeEach(() => { mock.callback = null; mock.fail = null; mock.stop.mockClear(); });

it('requires a fresh server-controlled role and removes all platform content on revocation', () => {
  render(<PlatformPanel database={database} uid="super" />);
  act(() => mock.callback?.(role('active', true)));
  expect(screen.queryByText('All communities')).toBeNull();
  act(() => mock.callback?.({ ...role(), metadata: { fromCache: false, hasPendingWrites: true } }));
  expect(screen.queryByText('All communities')).toBeNull();
  act(() => mock.callback?.(role()));
  fireEvent.click(screen.getByText('Choose test society'));
  expect(screen.getByText('Hidden society · Events')).toBeTruthy();
  act(() => mock.callback?.(role('revoked')));
  expect(screen.queryByText('All communities')).toBeNull();
  expect(screen.queryByText('Hidden society · Events')).toBeNull();
  act(() => mock.callback?.(role()));
  expect(screen.getByText('Community directory')).toBeTruthy();
});

it('does not promote a society owner and clears platform content on errors or offline cache', () => {
  const result = render(<PlatformPanel database={database} uid="owner" />);
  act(() => mock.callback?.(role('active', false, 'owner')));
  expect(screen.queryByText('All communities')).toBeNull();
  act(() => mock.callback?.(role()));
  act(() => mock.fail?.());
  expect(screen.queryByText('All communities')).toBeNull();
  act(() => mock.callback?.(role()));
  act(() => mock.callback?.(role('active', true)));
  expect(screen.queryByText('All communities')).toBeNull();
  result.unmount();
  expect(mock.stop).toHaveBeenCalledOnce();
});

it('supports profiles, view history and selected society record areas without granting edit controls', async () => {
  render(<PlatformPanel database={database} uid="super" />);
  act(() => mock.callback?.(role()));
  fireEvent.click(screen.getByRole('button', { name: 'User profiles' }));
  expect(screen.getAllByText('User profiles').length).toBe(2);
  fireEvent.click(screen.getByRole('button', { name: 'Platform view history' }));
  expect(screen.getByText('Dashboard view requests')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Cleanup requests' }));
  expect(screen.getByText('Account cleanup requests')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Communities' }));
  fireEvent.click(screen.getByText('Choose test society'));
  fireEvent.change(screen.getByLabelText('Records to view'), { target: { value: 'ledgerEntries' } });
  await waitFor(() => expect(screen.getByText('Hidden society · Accounts')).toBeTruthy());
  fireEvent.change(screen.getByLabelText('Records to view'), { target: { value: 'ownershipTransfers' } });
  await waitFor(() => expect(screen.getByText('Hidden society · Ownership transfers')).toBeTruthy());
});
