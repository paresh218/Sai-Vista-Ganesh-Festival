import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Firestore } from 'firebase/firestore';
import { beforeEach, expect, it, vi } from 'vitest';
import { CommunityDirectory } from '../web/src/features/communities/CommunityDirectory';
import { RegisterCommunityForm } from '../web/src/features/communities/RegisterCommunityForm';
import { CommunityError } from '../web/src/features/communities/model';

const mock = vi.hoisted(() => ({ register: vi.fn(), query: vi.fn(), next: null as null | ((snapshot: unknown) => void), fail: null as null | (() => void), stop: vi.fn() }));
vi.mock('../web/src/features/communities/data', () => ({ registerCommunity: (...args: unknown[]) => mock.register(...args), directoryQuery: (...args: unknown[]) => mock.query(...args) }));
vi.mock('firebase/firestore', () => ({ onSnapshot: (_query: unknown, _options: unknown, next: (snapshot: unknown) => void, fail: () => void) => { mock.next = next; mock.fail = fail; return mock.stop; } }));
const database = {} as Firestore;
const user = { uid: 'organizer', email: 'organizer@example.test' };
const community = { id: 'new-id', name: 'New mandal', city: 'Pune', location: 'Rahatani', kind: 'ganesh_mandal' as const, registrationStatus: 'self_declared' };
const snapshot = (count = 1, cached = false) => ({ empty: count === 0, metadata: { fromCache: cached }, docs: Array.from({ length: count }, (_, i) => ({ id: `community-${i}`, data: () => ({ ...community, name: `Mandal ${i}` }) })) });
beforeEach(() => { vi.clearAllMocks(); mock.register.mockResolvedValue(community); });
function fillRegistration() {
  fireEvent.change(screen.getByLabelText('Community name'), { target: { value: 'New mandal' } });
  fireEvent.change(screen.getByLabelText('Community type'), { target: { value: 'ganesh_mandal' } });
  fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Pune' } });
  fireEvent.change(screen.getByLabelText('Area / locality'), { target: { value: 'Rahatani' } });
}

it('lets visitors discover public communities but requires a verified account to register one', () => {
  render(<CommunityDirectory database={database} user={null} onSelect={vi.fn()} />);
  act(() => mock.next?.(snapshot()));
  expect(screen.getByText('Mandal 0')).toBeTruthy();
  expect(screen.getByText('Create an account or sign in')).toBeTruthy();
  expect(screen.queryByLabelText('Community name')).toBeNull();
});
it('searches only on submission and supports bounded paging and directory errors', () => {
  render(<CommunityDirectory database={database} user={null} onSelect={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Name starts with'), { target: { value: 'Mandal' } });
  expect(mock.query).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Find communities' }));
  expect(mock.query).toHaveBeenLastCalledWith(database, { name: 'Mandal', city: '', kind: '' }, undefined);
  act(() => mock.next?.(snapshot(21)));
  expect(screen.queryByText('Mandal 20')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'More communities' }));
  expect(mock.query).toHaveBeenLastCalledWith(database, expect.anything(), expect.objectContaining({ id: 'community-19' }));
  act(() => mock.fail?.());
  expect(screen.queryByText('Mandal 0')).toBeNull();
});
it('chooses an existing community without granting membership and clears cached results', () => {
  const selected = vi.fn();
  render(<CommunityDirectory database={database} user={null} onSelect={selected} />);
  act(() => mock.next?.(snapshot()));
  fireEvent.click(screen.getByRole('button', { name: 'Choose Mandal 0' }));
  expect(selected).toHaveBeenCalledWith(expect.objectContaining({ id: 'community-0', kind: 'ganesh_mandal' }));
  expect(mock.register).not.toHaveBeenCalled();
  act(() => mock.next?.(snapshot(1, true)));
  expect(screen.queryByText('Mandal 0')).toBeNull();
});
it('registers once, disables pending actions and selects the new community only after success', async () => {
  let resolve: (value: unknown) => void = () => {};
  mock.register.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const selected = vi.fn();
  render(<RegisterCommunityForm database={database} user={user} onSelect={selected} />);
  fillRegistration();
  fireEvent.click(screen.getByRole('button', { name: 'Register community' }));
  expect((screen.getByRole('button', { name: 'Registering…' }) as HTMLButtonElement).disabled).toBe(true);
  expect(selected).not.toHaveBeenCalled();
  await act(async () => resolve(community));
  expect(selected).toHaveBeenCalledWith(community);
  expect(mock.register).toHaveBeenCalledOnce();
});
it('retains input after duplicate/backend errors and never selects a failed community', async () => {
  mock.register.mockRejectedValueOnce(new CommunityError('Already listed: request to join.'));
  const selected = vi.fn();
  render(<RegisterCommunityForm database={database} user={user} onSelect={selected} />);
  fillRegistration();
  fireEvent.click(screen.getByRole('button', { name: 'Register community' }));
  await screen.findByText('Already listed: request to join.');
  expect((screen.getByLabelText('Community name') as HTMLInputElement).value).toBe('New mandal');
  mock.register.mockRejectedValueOnce(new Error('private backend details'));
  fireEvent.click(screen.getByRole('button', { name: 'Register community' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Community was not registered'));
  expect(screen.getByRole('alert').textContent).not.toContain('private backend details');
  expect(selected).not.toHaveBeenCalled();
});
