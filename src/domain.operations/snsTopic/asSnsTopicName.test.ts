import { asSnsTopicName } from './asSnsTopicName';

/**
 * .what = unit coverage for the sns-topic name extraction (the arn's last segment)
 * .why = a by-primary get carries only the arn; the name must round-trip back out of it
 */
const cases = [
  {
    description: 'extracts the name from a standard arn',
    given: { arn: 'arn:aws:sns:us-east-1:123456789012:mail-events' },
    expect: 'mail-events',
  },
  {
    description: 'extracts a name that itself contains no colon',
    given: { arn: 'arn:aws:sns:eu-west-1:000000000000:alerts' },
    expect: 'alerts',
  },
];

describe('asSnsTopicName', () => {
  cases.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asSnsTopicName(thisCase.given)).toEqual(thisCase.expect);
    }),
  );

  test('round-trips: a name that becomes an arn extracts back to the name', () => {
    const arn = 'arn:aws:sns:us-west-2:111111111111:notifications';
    expect(asSnsTopicName({ arn })).toEqual('notifications');
  });
});
