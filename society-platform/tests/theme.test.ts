import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const css = readFileSync('web/src/styles/global.css', 'utf8');
const html = readFileSync('web/index.html', 'utf8');
const color = (name: string) => {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`));
  if (!match) throw new Error(`Missing theme color: ${name}`);
  return match[1];
};
function luminance(hex: string) {
  const channels = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
const contrast = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);

it('preserves original festival plum/gold/cream identity and aligns the browser theme', () => {
  expect(color('primary')).toBe('#641847'); expect(color('gold')).toBe('#c69b52'); expect(color('canvas')).toBe('#fffaf3');
  expect(html).toContain(`name="theme-color" content="${color('primary')}"`);
  expect(css).toContain("'Poppins', system-ui, sans-serif");
});
it('bundles Poppins locally with its license rather than loading a remote font stylesheet', () => {
  const entry = readFileSync('web/src/main.tsx', 'utf8');
  for (const weight of [400, 500, 600, 700, 800]) expect(entry).toContain(`@fontsource/poppins/${weight}.css`);
  expect(readFileSync('web/public/licenses/Poppins-OFL.txt', 'utf8')).toContain('SIL OPEN FONT LICENSE');
  expect(html).not.toContain('fonts.googleapis.com');
});
it('keeps normal text, muted copy and primary button labels above 4.5:1 contrast', () => {
  for (const background of [color('canvas'), '#ffffff', color('soft')]) {
    expect(contrast(color('text'), background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color('muted'), background)).toBeGreaterThanOrEqual(4.5);
  }
  expect(contrast(color('primary'), '#ffffff')).toBeGreaterThanOrEqual(4.5);
  expect(contrast(color('focus'), color('canvas'))).toBeGreaterThanOrEqual(3);
});
