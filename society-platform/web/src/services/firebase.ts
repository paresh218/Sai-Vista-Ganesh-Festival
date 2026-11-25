import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, inMemoryPersistence, initializeAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

// shortcut: S04 supports local identity only; hosted config and native persistence need a separate verified release.
export function createLocalAuth() {
  if (import.meta.env.MODE !== 'emulator') return null;
  if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) return null;
  const app = initializeApp({ apiKey: 'local-demo-key', projectId: 'demo-society-platform', authDomain: 'localhost' }, 'local-identity');
  initializeAuth(app, { persistence: inMemoryPersistence });
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  return auth;
}

export const localAuth = createLocalAuth();
export const localDatabase = localAuth ? getFirestore(localAuth.app) : null;
if (localDatabase) connectFirestoreEmulator(localDatabase, '127.0.0.1', 8085);
