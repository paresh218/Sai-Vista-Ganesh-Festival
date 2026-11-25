import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { localAuth, localDatabase } from '../../services/firebase';
import { CommunityDirectory } from './CommunityDirectory';
import type { Community } from './model';

export default function CommunityRoute({ onSelect }: { onSelect: (community: Community) => void }) {
  const [user, setUser] = useState<{ uid: string; email: string } | null>(null);
  useEffect(() => {
    if (!localAuth) return;
    return onAuthStateChanged(localAuth, current => setUser(current?.emailVerified && current.email ? { uid: current.uid, email: current.email } : null));
  }, []);
  if (!localDatabase) return <section><h1>Find or register your community.</h1><p>Start run-local.cmd to use the local community directory and registration. This web-only preview has no database connection.</p><a href="#account">Go to account</a></section>;
  return <CommunityDirectory database={localDatabase} user={user} onSelect={onSelect} />;
}
