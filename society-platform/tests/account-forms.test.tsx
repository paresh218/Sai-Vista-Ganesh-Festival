import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Auth } from 'firebase/auth';
import { beforeEach, expect, it, vi } from 'vitest';
import { AccountPage } from '../web/src/features/auth/AccountPage';

const mock = vi.hoisted(() => ({
  login: vi.fn(), signup: vi.fn(), reset: vi.fn(), verify: vi.fn(), reload: vi.fn(), token: vi.fn(), logout: vi.fn(), stop: vi.fn(),
  observer: null as null | ((user: unknown) => void),
}));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, next: (user: unknown) => void) => { mock.observer = next; next(null); return mock.stop; },
  signInWithEmailAndPassword: (...args: unknown[]) => mock.login(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => mock.signup(...args),
  sendPasswordResetEmail: (...args: unknown[]) => mock.reset(...args),
  sendEmailVerification: (...args: unknown[]) => mock.verify(...args),
  reload: (...args: unknown[]) => mock.reload(...args), getIdToken: (...args: unknown[]) => mock.token(...args),
  signOut: (...args: unknown[]) => mock.logout(...args),
}));
const auth = {} as Auth;
const user = { uid: 'local-user', email: 'synthetic@example.test', emailVerified: false };
beforeEach(() => {
  vi.clearAllMocks();
  for (const fn of [mock.login, mock.reset, mock.verify, mock.reload, mock.token, mock.logout]) fn.mockResolvedValue(undefined);
  mock.signup.mockResolvedValue({ user: { ...user } });
});

function fill() {
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'synthetic@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'local-test-password' } });
}

it('prevents a second sign-in while pending, clears the password after failure and restores controls', async () => {
  let reject: (error: unknown) => void = () => {};
  mock.login.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
  render(<AccountPage auth={auth} />);
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Sign in locally' }));
  expect((screen.getByRole('button', { name: 'Please wait…' }) as HTMLButtonElement).disabled).toBe(true);
  expect(mock.login).toHaveBeenCalledOnce();
  await act(async () => reject({ code: 'auth/invalid-credential' }));
  expect(screen.getByRole('alert').textContent).toContain('Sign-in could not be completed');
  expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
  expect((screen.getByRole('button', { name: 'Sign in locally' }) as HTMLButtonElement).disabled).toBe(false);
});

it('creates an unverified account, requests verification and refreshes verification before further access', async () => {
  render(<AccountPage auth={auth} />);
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Create local account' }));
  await screen.findByText('Email verification required');
  fireEvent.click(screen.getByRole('button', { name: 'Request verification link' }));
  await screen.findByText('Verification link created in the local emulator output. No real email was sent.');
  mock.reload.mockImplementationOnce(async current => { current.emailVerified = true; });
  fireEvent.click(screen.getByRole('button', { name: 'Check verification' }));
  await screen.findByText('Email verified');
  expect(mock.token).toHaveBeenCalledWith(expect.objectContaining({ uid: user.uid }), true);
});

it('recovery requests no password and returns a non-identifying result', async () => {
  render(<AccountPage auth={auth} />);
  fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  expect(screen.queryByLabelText('Password')).toBeNull();
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: user.email } });
  fireEvent.click(screen.getByRole('button', { name: 'Request reset link' }));
  await screen.findByText('If this address has an account, a reset link is available in the local emulator output.');
  expect(mock.reset).toHaveBeenCalledWith(auth, user.email);
});

it('logout removes the signed-in view and releases the identity observer on unmount', async () => {
  const result = render(<AccountPage auth={auth} />);
  act(() => mock.observer?.({ ...user, emailVerified: true }));
  mock.logout.mockImplementationOnce(async () => { mock.observer?.(null); });
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(screen.queryByText('Your local account')).toBeNull());
  expect(screen.getByRole('button', { name: 'Sign in locally' })).toBeTruthy();
  result.unmount();
  expect(mock.stop).toHaveBeenCalledOnce();
});
