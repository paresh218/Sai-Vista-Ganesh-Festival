import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createUserWithEmailAndPassword, getIdToken, onAuthStateChanged, reload, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { authErrorMessage } from './errors';
import { ProfilePanel } from './ProfilePanel';
import { PlatformPanel } from '../platform/PlatformPanel';
import { AccountCleanupPanel } from './AccountCleanupPanel';

export function AccountPage({ auth, database = null, societyId = '' }: { auth: Auth | null; database?: Firestore | null; societyId?: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup' | 'recovery'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, current => { setUser(current); setVerified(current?.emailVerified ?? false); setReady(true); setPassword(''); });
  }, [auth]);

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (failure) { setError(authErrorMessage(failure)); }
    finally { setBusy(false); setPassword(''); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || busy) return;
    await run(async () => {
      if (mode === 'recovery') {
        await sendPasswordResetEmail(auth, email.trim());
        setMessage('If this address has an account, a reset link is available in the local emulator output.');
      } else if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        setMessage('Local account created. Request a verification link below.');
        setUser(credential.user);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        setMessage('Signed in locally. Community access requires a separately approved membership.');
      }
    });
  }

  return <section aria-labelledby="account-title">
    <div className="section-heading"><div><p className="eyebrow">Your community identity</p><h1 id="account-title">Account preview.</h1></div><span className="pill">Local only</span></div>
    <p className="section-note">Use invented details and a test password. This preview never connects to a live Firebase project. Full local mode reads public events from the emulators; web-only demo events remain synthetic.</p>
    {!auth ? <div className="empty-state">Local login is disabled in this preview. Start the Firebase emulators, then run <code>npm run dev:emulator</code> from the app folder to test accounts.</div> : !ready ? <p role="status">Checking local session…</p> : user ? <div className="account-panel">
      <h2>Your local account</h2><p>{user.email}</p><p className="pill">{verified ? 'Email verified' : 'Email verification required'}</p>
      <p className="section-note">A verified email does not grant community access. Request approval or accept an invitation from its owner. Ownership transfer requires nomination and acceptance. Account cleanup remains under development.</p>
      {verified && database && <PlatformPanel key={user.uid} database={database} uid={user.uid} />}
      {verified && database && <ProfilePanel key={`${user.uid}:${societyId}`} database={database} uid={user.uid} societyId={societyId} email={user.email ?? ''} />}
      {verified && database && <AccountCleanupPanel key={`cleanup:${user.uid}`} database={database} uid={user.uid} />}
      <div className="account-buttons">
        {!verified && <><button disabled={busy} onClick={() => run(async () => { await sendEmailVerification(user); setMessage('Verification link created in the local emulator output. No real email was sent.'); })}>Request verification link</button><button disabled={busy} onClick={() => run(async () => { await reload(user); await getIdToken(user, true); setVerified(user.emailVerified); setMessage(user.emailVerified ? 'Email verified locally.' : 'Verification is still pending. Open the local verification link first.'); })}>Check verification</button></>}
        <button disabled={busy} onClick={() => run(async () => { await signOut(auth); setMessage('Signed out. The local session was cleared.'); })}>Sign out</button>
      </div>
    </div> : <div className="account-panel">
      <div className="account-buttons" aria-label="Account actions">{(['signin', 'signup', 'recovery'] as const).map(item => <button key={item} type="button" aria-pressed={mode === item} disabled={busy} onClick={() => { setMode(item); setPassword(''); setError(''); setMessage(''); }}>{item === 'signin' ? 'Sign in' : item === 'signup' ? 'Create account' : 'Reset password'}</button>)}</div>
      <form onSubmit={submit} className="account-form">
        <label>Email address<input type="email" required autoComplete="email" value={email} maxLength={254} onChange={e => setEmail(e.target.value)} disabled={busy} /></label>
        {mode !== 'recovery' && <label>Password<input type="password" required minLength={mode === 'signup' ? 12 : 1} maxLength={128} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></label>}
        <button className="submit-button" disabled={busy} type="submit">{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in locally' : mode === 'signup' ? 'Create local account' : 'Request reset link'}</button>
      </form>
    </div>}
    {message && <p role="status" className="save-status">{message}</p>}{error && <p role="alert" className="form-error">{error}</p>}
  </section>;
}
