import { castIntoDeclaredAwsSesConfigurationSet } from './castIntoDeclaredAwsSesConfigurationSet';

/**
 * .what = unit coverage for the raw ses configuration set → domain cast
 * .why = pure boundary transform; pins name pass-through + the null-vs-populated tags shape
 */
describe('castIntoDeclaredAwsSesConfigurationSet', () => {
  test('populated tags → DeclaredAwsTags', () => {
    const set = castIntoDeclaredAwsSesConfigurationSet({
      name: 'ehmpathy-mail-events',
      tags: { managedBy: 'declastruct', purpose: 'mail' },
    });
    expect(set.name).toEqual('ehmpathy-mail-events');
    expect(set.tags).toEqual({ managedBy: 'declastruct', purpose: 'mail' });
  });

  test('null tags → null', () => {
    const set = castIntoDeclaredAwsSesConfigurationSet({
      name: 'ehmpathy-mail-events',
      tags: null,
    });
    expect(set.tags).toEqual(null);
  });
});
