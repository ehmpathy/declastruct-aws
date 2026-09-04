import { asSnsTopicArn } from './asSnsTopicArn';

/**
 * .what = unit coverage for the deterministic sns-topic arn derivation
 * .why = the arn shape is depended on by ses receipt-rule + event-dest casts; a drift in the
 *   format would silently mis-reference the topic
 */
const cases = [
  {
    description: 'composes the standard arn from name + account + region',
    given: {
      name: 'mail-events',
      account: '123456789012',
      region: 'us-east-1',
    },
    expect: 'arn:aws:sns:us-east-1:123456789012:mail-events',
  },
  {
    description: 'honors a non-default region',
    given: { name: 'alerts', account: '000000000000', region: 'eu-west-1' },
    expect: 'arn:aws:sns:eu-west-1:000000000000:alerts',
  },
];

describe('asSnsTopicArn', () => {
  cases.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asSnsTopicArn(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
