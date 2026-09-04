import { getError } from 'test-fns';

import { castIntoDeclaredAwsSesConfigurationSetEventDestination } from './castIntoDeclaredAwsSesConfigurationSetEventDestination';

/**
 * .what = unit coverage for the raw ses event destination → domain cast, both sink variants
 * .why = pure boundary transform; the sink is a discriminated union (cloudwatch dims XOR an sns
 *   topic ref) — a mis-cast sink or an un-reversed sns arn would false-drift a re-plan
 */
describe('castIntoDeclaredAwsSesConfigurationSetEventDestination', () => {
  test('cloudwatch sink → dimensions rebuilt', () => {
    const dest = castIntoDeclaredAwsSesConfigurationSetEventDestination({
      configurationSetName: 'ehmpathy-mail-events',
      name: 'to-cloudwatch',
      enabled: true,
      eventTypes: ['SEND', 'BOUNCE'],
      cloudwatch: [
        {
          name: 'ses:configuration-set',
          source: 'MESSAGE_TAG',
          defaultValue: 'ehmpathy-mail-events',
        },
      ],
      snsTopicArn: null,
    });
    expect(dest.configurationSet.name).toEqual('ehmpathy-mail-events');
    expect(dest.name).toEqual('to-cloudwatch');
    expect(dest.enabled).toEqual(true);
    // the cast canonically sorts eventTypes (a SET compared order-sensitively by declastruct),
    // so 'SEND','BOUNCE' in → 'BOUNCE','SEND' out — this is the idempotency-driven sort, not drift
    expect(dest.eventTypes).toEqual(['BOUNCE', 'SEND']);
    expect(dest.sink.cloudwatch).toEqual([
      {
        name: 'ses:configuration-set',
        source: 'MESSAGE_TAG',
        defaultValue: 'ehmpathy-mail-events',
      },
    ]);
    expect(dest.sink.sns).toEqual(null);
  });

  test('sns sink → topic arn reversed to a name ref', () => {
    const dest = castIntoDeclaredAwsSesConfigurationSetEventDestination({
      configurationSetName: 'ehmpathy-mail-events',
      name: 'to-sns',
      enabled: true,
      eventTypes: ['DELIVERY'],
      cloudwatch: null,
      snsTopicArn: 'arn:aws:sns:us-east-1:111122223333:mail-events',
    });
    expect(dest.sink.cloudwatch).toEqual(null);
    expect(dest.sink.sns?.name).toEqual('mail-events');
  });

  test('an event type outside the modeled union fails loud (assure)', () => {
    const error = getError(() =>
      castIntoDeclaredAwsSesConfigurationSetEventDestination({
        configurationSetName: 'ehmpathy-mail-events',
        name: 'to-cloudwatch',
        enabled: true,
        eventTypes: ['SEND', 'WAT_UNMODELED'],
        cloudwatch: [
          {
            name: 'ses:configuration-set',
            source: 'MESSAGE_TAG',
            defaultValue: 'ehmpathy-mail-events',
          },
        ],
        snsTopicArn: null,
      }),
    );
    expect(error.message).toContain('isSesEventType');
    expect(error.message).toMatchSnapshot();
  });

  test('a cloudwatch dimension source outside the modeled union fails loud (assure)', () => {
    const error = getError(() =>
      castIntoDeclaredAwsSesConfigurationSetEventDestination({
        configurationSetName: 'ehmpathy-mail-events',
        name: 'to-cloudwatch',
        enabled: true,
        eventTypes: ['SEND'],
        cloudwatch: [
          {
            name: 'ses:configuration-set',
            source: 'WAT_UNMODELED_SOURCE',
            defaultValue: 'ehmpathy-mail-events',
          },
        ],
        snsTopicArn: null,
      }),
    );
    expect(error.message).toContain('isSesCloudwatchDimensionSource');
    expect(error.message).toMatchSnapshot();
  });
});
