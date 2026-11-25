import { expect, it } from 'vitest';
import { communityKinds, normalizeCommunity, readCommunity } from '../web/src/features/communities/model';

it('supports every community type and normalizes public name/city keys without losing local-language names', () => {
  for (const kind of Object.keys(communityKinds) as Array<keyof typeof communityKinds>) {
    const result = normalizeCommunity({ name: '  श्री गणेश   मंडळ ', city: '  Pune  ', location: ' Rahatani ', kind });
    expect(result).toMatchObject({ name: 'श्री गणेश मंडळ', city: 'Pune', cityKey: 'pune', location: 'Rahatani', kind });
  }
});
it('rejects blank, oversized and unsupported registration data', () => {
  const draft = { name: 'New mandal', city: 'Pune', location: 'Rahatani', kind: 'ganesh_mandal' as const };
  for (const change of [{ name: '  ' }, { city: 'x' }, { location: 'x'.repeat(201) }, { kind: 'unknown' }]) {
    expect(() => normalizeCommunity({ ...draft, ...change } as typeof draft)).toThrow();
  }
});
it('reads old directory records with compatible defaults without copying arbitrary public fields into selected metadata', () => {
  expect(readCommunity('old', { name: 'Old society', location: 'Pune', privateField: 'unused' })).toEqual({ id: 'old', name: 'Old society', city: '', location: 'Pune', kind: 'society', registrationStatus: '' });
});
