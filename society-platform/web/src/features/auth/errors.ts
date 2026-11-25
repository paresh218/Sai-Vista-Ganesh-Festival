export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : '';
  switch (code) {
    case 'auth/invalid-email': return 'Enter a valid email address.';
    case 'auth/weak-password': return 'Choose a password with at least 12 characters.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait before trying again.';
    case 'auth/network-request-failed': return 'Cannot reach the local login service. Check that the emulators are running.';
    case 'auth/requires-recent-login': return 'Sign in again before changing sensitive account details.';
    case 'auth/email-already-in-use': return 'Account creation could not be completed. Try signing in or resetting your password.';
    default: return 'Sign-in could not be completed. Check your details or reset your password.';
  }
}
