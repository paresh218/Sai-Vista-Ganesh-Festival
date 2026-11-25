import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { localDatabase } from '../../services/firebase';
import type { CommunityBrand } from './BrandSettings';
export type SelectedBrand = CommunityBrand & { societyId: string };
export default function LiveBrand({ societyId, onChange }: { societyId: string; onChange: (brand: SelectedBrand | null) => void }) {
  useEffect(() => {
    if (!localDatabase) return;
    let disposed = false;
    const stop = onSnapshot(doc(localDatabase, 'societies', societyId, 'settings', 'public'), { includeMetadataChanges: true }, snapshot => {
      if (disposed) return;
      const data = snapshot.data();
      onChange(!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites && data ? { societyId, name: data.name, tagline: data.tagline, announcement: data.announcement } : null);
    }, () => { if (!disposed) onChange(null); });
    return () => { disposed = true; stop(); };
  }, [societyId, onChange]);
  return null;
}
