import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { App } from '../web/src/app/App';
vi.mock('../web/src/features/communities/CommunityRoute', () => ({ default: ({ onSelect }: { onSelect: (community: unknown) => void }) => <button onClick={() => onSelect({ id: 'new-mandal', name: 'New Ganesh Mandal', city: 'Pune', location: 'Rahatani', kind: 'ganesh_mandal' })}>Choose new community</button> }));
vi.mock('../web/src/features/auth/AccountRoute', () => ({ default: ({ societyId }: { societyId: string }) => <h1>Account for {societyId}</h1> }));
it('opens a discovered community in account selection even when it is not one of the hardcoded demo choices', async () => {
  window.location.hash = '#communities';
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Choose new community' }));
  expect(await screen.findByRole('heading', { name: 'Account for new-mandal' })).toBeTruthy();
  expect((screen.getByLabelText('Your community') as HTMLSelectElement).value).toBe('new-mandal');
});
