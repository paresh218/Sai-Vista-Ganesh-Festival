import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Firestore } from 'firebase/firestore';
import { beforeEach, expect, it, vi } from 'vitest';
import { ProfilePanel } from '../web/src/features/auth/ProfilePanel';

const mock = vi.hoisted(() => ({ listeners: new Map<string, { next: (value: unknown) => void; fail: () => void }>(), save: vi.fn(), stop: vi.fn() }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...parts: string[]) => parts.join('/'), serverTimestamp: () => 'server-time',
  setDoc: (...args: unknown[]) => mock.save(...args),
  onSnapshot: (path: string, ...args: unknown[]) => {
    const callbacks = args.filter(arg => typeof arg === 'function') as [((value: unknown) => void), (() => void)];
    mock.listeners.set(path, { next: callbacks[0], fail: callbacks[1] });
    return mock.stop;
  },
}));
vi.mock('../web/src/features/members/MemberRequests', () => ({ MemberRequests: () => <p>Committee controls</p> }));
vi.mock('../web/src/features/members/AdminAccess', () => ({ AdminAccess: () => <p>Owner revocation controls</p> }));
vi.mock('../web/src/features/ownership/OwnershipPanel', () => ({ OwnershipPanel: () => <p>Ownership controls</p> }));
vi.mock('../web/src/features/events/CreateEvent', () => ({ CreateEvent: () => <p>Event creation controls</p> }));
vi.mock('../web/src/features/events/EventWorkspace', () => ({ EventWorkspace: () => <p>Event workspace controls</p> }));
vi.mock('../web/src/features/branding/BrandSettings', () => ({ BrandSettings: () => <p>Brand settings controls</p> }));
vi.mock('../web/src/features/platform/RecordBrowser', () => ({ RecordBrowser: () => <p>Event workspace controls</p> }));
vi.mock('../web/src/features/invitations/InvitationPanel', () => ({ InvitationPanel: ({ owner }: { owner: boolean }) => <p>{owner ? 'Owner invitation controls' : 'Accept invitation controls'}</p> }));
const database = {} as Firestore;
const profile = (name = 'Synthetic name') => ({ data: () => ({ displayName: name, language: 'en' }), metadata: { fromCache: false } });
const member = (role = 'resident', status = 'active', cached = false) => ({ exists: () => true, data: () => ({ role, status }), metadata: { fromCache: cached } });
const emit = (path: string, snapshot: unknown) => act(() => mock.listeners.get(path)?.next(snapshot));
beforeEach(() => { mock.listeners.clear(); vi.clearAllMocks(); mock.save.mockResolvedValue(undefined); });

it('saves a minimal trimmed profile, keeps edits after rejection and validates blank names', async () => {
  render(<ProfilePanel database={database} uid="resident" societyId="alpha" email="resident@example.test" />);
  emit('users/resident', profile());
  fireEvent.change(screen.getByLabelText('Display name'), { target: { value: '  New name  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save local profile' }));
  await screen.findByText('Profile saved to the local database.');
  expect(mock.save).toHaveBeenCalledWith('users/resident', { schemaVersion: 1, displayName: 'New name', language: 'en', updatedAt: 'server-time' });
  mock.save.mockRejectedValueOnce(new Error('unavailable'));
  fireEvent.click(screen.getByRole('button', { name: 'Save local profile' }));
  await screen.findByText('Profile could not be saved. Your changes have not been confirmed.');
  expect((screen.getByLabelText('Display name') as HTMLInputElement).value).toBe('  New name  ');
  fireEvent.change(screen.getByLabelText('Display name'), { target: { value: '   ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save local profile' }));
  await screen.findByText('Enter a display name between 1 and 80 characters.');
  expect(mock.save).toHaveBeenCalledTimes(2);
});

it('join requests can request only pending resident access in the selected society', async () => {
  render(<ProfilePanel database={database} uid="resident" societyId="alpha" email="resident@example.test" />);
  emit('societies/alpha/members/resident', { exists: () => false, data: () => undefined, metadata: { fromCache: false } });
  fireEvent.click(screen.getByRole('button', { name: 'Request to join this community' }));
  await screen.findByText('Request sent to the local committee queue. It does not grant access yet.');
  expect(mock.save).toHaveBeenCalledWith('societies/alpha/members/resident', expect.objectContaining({ role: 'resident', status: 'pending', email: 'resident@example.test' }));
  emit('societies/alpha/members/resident', member('resident', 'pending'));
  expect(screen.queryByRole('button', { name: 'Request to join this community' })).toBeNull();
});

it('committee controls disappear after revocation, permission errors and a cached membership snapshot', () => {
  const result = render(<ProfilePanel database={database} uid="admin" societyId="alpha" email="admin@example.test" />);
  emit('societies/alpha/members/admin', member('admin'));
  expect(screen.getByText('Committee controls')).toBeTruthy();
  emit('societies/alpha/members/admin', { ...member('admin'), metadata: { fromCache: false, hasPendingWrites: true } });
  expect(screen.queryByText('Committee controls')).toBeNull();
  emit('societies/alpha/members/admin', member('admin'));
  emit('societies/alpha/members/admin', member('admin', 'revoked'));
  expect(screen.queryByText('Committee controls')).toBeNull();
  emit('societies/alpha/members/admin', member('admin'));
  emit('societies/alpha/members/admin', member('admin', 'active', true));
  expect(screen.queryByText('Committee controls')).toBeNull();
  emit('societies/alpha/members/admin', member('admin'));
  act(() => mock.listeners.get('societies/alpha/members/admin')?.fail());
  expect(screen.queryByText('Committee controls')).toBeNull();
  result.unmount();
  expect(mock.stop).toHaveBeenCalledTimes(2);
});

it('switching account keys removes the previous user profile and listeners', () => {
  const result = render(<ProfilePanel key="one" database={database} uid="one" societyId="alpha" email="one@example.test" />);
  emit('users/one', profile('Private first profile'));
  result.rerender(<ProfilePanel key="two" database={database} uid="two" societyId="beta" email="two@example.test" />);
  expect((screen.getByLabelText('Display name') as HTMLInputElement).value).toBe('');
  expect(mock.stop).toHaveBeenCalledTimes(2);
});

it('shows owner invitation controls only with fresh active ownership and acceptance only before membership', () => {
  render(<ProfilePanel database={database} uid="owner" societyId="alpha" email="owner@example.test" />);
  emit('societies/alpha/members/owner', member('owner'));
  expect(screen.getByText('Owner invitation controls')).toBeTruthy();
  expect(screen.getByText('Owner revocation controls')).toBeTruthy();
  for (const state of [member('owner', 'active', true), member('owner', 'revoked'), member('admin'), member('resident')]) {
    emit('societies/alpha/members/owner', state);
    expect(screen.queryByText('Owner invitation controls')).toBeNull();
    expect(screen.queryByText('Owner revocation controls')).toBeNull();
    expect(screen.queryByText('Accept invitation controls')).toBeNull();
  }
  emit('societies/alpha/members/owner', member('resident', 'pending'));
  expect(screen.getByText('Accept invitation controls')).toBeTruthy();
  emit('societies/alpha/members/owner', { exists: () => false, data: () => undefined, metadata: { fromCache: false } });
  expect(screen.getByText('Accept invitation controls')).toBeTruthy();
  act(() => mock.listeners.get('societies/alpha/members/owner')?.fail());
  expect(screen.queryByText('Accept invitation controls')).toBeNull();
});
