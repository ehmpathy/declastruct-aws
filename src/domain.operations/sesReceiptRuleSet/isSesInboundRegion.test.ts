import { isSesInboundRegion } from './isSesInboundRegion';

/**
 * .what = unit coverage for the SES-inbound-region capability check
 * .why = the receipt-rule-set set op fails loud on a false result; a wrong verdict would
 *   either block a valid region or let a cryptic deep-SES error through
 */
describe('isSesInboundRegion', () => {
  test('a receive-capable region reads true', () => {
    expect(isSesInboundRegion({ region: 'us-east-1' })).toEqual(true);
    expect(isSesInboundRegion({ region: 'eu-west-1' })).toEqual(true);
    expect(isSesInboundRegion({ region: 'us-east-2' })).toEqual(true);
  });

  test('a non-receive region reads false', () => {
    expect(isSesInboundRegion({ region: 'us-west-1' })).toEqual(false);
    expect(isSesInboundRegion({ region: 'af-south-1' })).toEqual(false);
  });
});
