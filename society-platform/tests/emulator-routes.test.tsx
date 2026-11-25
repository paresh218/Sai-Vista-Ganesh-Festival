import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from '../web/src/app/App';
vi.mock('../web/src/features/events/PublicEventsRoute', () => ({ default: ({ societyId, status }: { societyId: string; status: string }) => <p>Live feed {societyId} {status}</p> }));
vi.mock('../web/src/features/auth/AccountRoute', () => ({ default: () => <p>Database administration</p> }));
vi.mock('../web/src/features/branding/LiveBrand', () => ({ default: () => null }));
afterEach(() => vi.unstubAllEnvs());
it('emulator mode renders live public feeds and real administration instead of editable fixture events', async () => {
  vi.stubEnv('MODE', 'emulator'); window.location.hash = '#home'; render(<App />);
  await screen.findByText('Live feed sai-vista published');
  expect(screen.queryByText('An evening of lights')).toBeNull();
  fireEvent.change(screen.getByLabelText('Your community'), { target: { value: 'maple-grove' } });
  await screen.findByText('Live feed maple-grove published');
  window.location.hash = '#archive'; fireEvent(window, new HashChangeEvent('hashchange'));
  await screen.findByText('Live feed maple-grove archived');
  window.location.hash = '#admin'; fireEvent(window, new HashChangeEvent('hashchange'));
  await screen.findByText('Database administration');
  expect(screen.queryByLabelText('Visibility for The garden gathering')).toBeNull();
});
