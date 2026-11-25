import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { App } from '../web/src/app/App';

beforeEach(() => { window.location.hash = '#home'; });

it('switches societies without leaking their event cards into the selected demo view', () => {
  render(<App />);
  expect(screen.queryByText('Creative weekend')).toBeNull();
  expect(screen.getByText('An evening of lights')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Your community'), { target: { value: 'maple-grove' } });
  expect(screen.getByText('The garden gathering')).toBeTruthy();
  expect(screen.queryByText('An evening of lights')).toBeNull();
});

it('supports direct admin route, archives an event, and announces the change', async () => {
  window.location.hash = '#admin';
  render(<App />);
  fireEvent.change(screen.getByLabelText('Visibility for An evening of lights'), { target: { value: 'archived' } });
  expect(screen.getByRole('status').textContent).toContain('An evening of lights updated');
  window.location.hash = '#archive';
  fireEvent(window, new HashChangeEvent('hashchange'));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Community archive.' })).toBeTruthy());
  expect(screen.getByText('An evening of lights')).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole('main'));
});
