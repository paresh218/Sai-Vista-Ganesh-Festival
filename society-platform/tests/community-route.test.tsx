import { act, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import CommunityRoute from '../web/src/features/communities/CommunityRoute';

const mock = vi.hoisted(() => ({ next: null as null | ((user: unknown) => void), stop: vi.fn() }));
vi.mock('firebase/auth', () => ({ onAuthStateChanged: (_auth: unknown, next: (user: unknown) => void) => { mock.next = next; return mock.stop; } }));
vi.mock('../web/src/services/firebase', () => ({ localAuth: {}, localDatabase: {} }));
vi.mock('../web/src/features/communities/CommunityDirectory', () => ({ CommunityDirectory: ({ user }: { user: { uid: string } | null }) => <p>{user ? `Registration enabled for ${user.uid}` : 'Public discovery only'}</p> }));
beforeEach(() => vi.clearAllMocks());

it('enables registration only for a verified identity with an email, and clears it on logout', () => {
  const view = render(<CommunityRoute onSelect={vi.fn()} />);
  for (const user of [null, { uid: 'u', email: 'u@example.test', emailVerified: false }, { uid: 'u', email: null, emailVerified: true }]) {
    act(() => mock.next?.(user));
    expect(screen.getByText('Public discovery only')).toBeTruthy();
  }
  act(() => mock.next?.({ uid: 'u', email: 'u@example.test', emailVerified: true }));
  expect(screen.getByText('Registration enabled for u')).toBeTruthy();
  act(() => mock.next?.(null));
  expect(screen.getByText('Public discovery only')).toBeTruthy();
  view.unmount();
  expect(mock.stop).toHaveBeenCalledOnce();
});
