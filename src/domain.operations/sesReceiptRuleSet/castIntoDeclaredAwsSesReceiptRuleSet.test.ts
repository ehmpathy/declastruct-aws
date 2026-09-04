import { castIntoDeclaredAwsSesReceiptRuleSet } from './castIntoDeclaredAwsSesReceiptRuleSet';

/**
 * .what = unit coverage for the raw ses receipt rule set → domain cast
 * .why = pure boundary transform; pins name + the active flag round-trip both ways
 */
describe('castIntoDeclaredAwsSesReceiptRuleSet', () => {
  test('active rule set', () => {
    const set = castIntoDeclaredAwsSesReceiptRuleSet({
      name: 'ehmpathy-mail-inbound',
      active: true,
    });
    expect(set.name).toEqual('ehmpathy-mail-inbound');
    expect(set.active).toEqual(true);
  });

  test('inactive rule set', () => {
    const set = castIntoDeclaredAwsSesReceiptRuleSet({
      name: 'ehmpathy-mail-inbound',
      active: false,
    });
    expect(set.active).toEqual(false);
  });
});
