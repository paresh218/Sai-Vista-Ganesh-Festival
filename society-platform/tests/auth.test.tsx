import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { AccountPage } from '../web/src/features/auth/AccountPage';
import { authErrorMessage } from '../web/src/features/auth/errors';
import { App } from '../web/src/app/App';

it('fails closed without a local auth configuration and never presents a live login form', () => {
  render(<AccountPage auth={null} />);
  expect(screen.getByText(/Local login is disabled/)).toBeTruthy();
  expect(screen.queryByLabelText('Password')).toBeNull();
});

it('offers a reachable account route without granting any membership', async () => {
  window.location.hash = '#home';
  render(<App />);
  window.location.hash = '#account';
  fireEvent(window, new HashChangeEvent('hashchange'));
  expect(await screen.findByRole('heading', { name: 'Account preview.' })).toBeTruthy();
});

it('keeps auth failure messages useful without exposing raw backend details', () => {
  expect(authErrorMessage({ code: 'auth/network-request-failed' })).toContain('local login service');
  expect(authErrorMessage({ code: 'auth/user-not-found', message: 'secret detail' })).not.toContain('secret');
  expect(authErrorMessage({ code: 'auth/user-not-found' })).toBe(authErrorMessage({ code: 'auth/wrong-password' }));
});
