import { AccountPage } from './AccountPage';
import { localAuth, localDatabase } from '../../services/firebase';

export default function AccountRoute({ societyId }: { societyId: string }) {
  return <AccountPage auth={localAuth} database={localDatabase} societyId={societyId} />;
}
