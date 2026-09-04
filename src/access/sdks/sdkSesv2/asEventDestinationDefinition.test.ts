import { asEventDestinationDefinition } from './asEventDestinationDefinition';

/**
 * .what = unit coverage for the friendly-sink -> aws EventDestinationDefinition builder
 * .why = the two sinks (cloudwatch OR sns) are mutually exclusive; this pins that only the
 *   declared sink materializes and the other stays undefined
 */
describe('asEventDestinationDefinition', () => {
  test('a cloudwatch sink builds DimensionConfigurations and no sns destination', () => {
    const def = asEventDestinationDefinition({
      enabled: true,
      eventTypes: ['SEND', 'BOUNCE', 'COMPLAINT'],
      cloudwatch: [
        {
          name: 'ses:configuration-set',
          source: 'messageTag',
          defaultValue: 'default',
        },
      ],
      snsTopicArn: null,
    });
    expect(def.Enabled).toEqual(true);
    expect(def.MatchingEventTypes).toEqual(['SEND', 'BOUNCE', 'COMPLAINT']);
    expect(def.CloudWatchDestination?.DimensionConfigurations).toEqual([
      {
        DimensionName: 'ses:configuration-set',
        DimensionValueSource: 'messageTag',
        DefaultDimensionValue: 'default',
      },
    ]);
    expect(def.SnsDestination).toBeUndefined();
  });

  test('an sns sink builds SnsDestination and no cloudwatch destination', () => {
    const def = asEventDestinationDefinition({
      enabled: false,
      eventTypes: ['DELIVERY'],
      cloudwatch: null,
      snsTopicArn: 'arn:aws:sns:us-east-1:123456789012:mail-events',
    });
    expect(def.Enabled).toEqual(false);
    expect(def.SnsDestination).toEqual({
      TopicArn: 'arn:aws:sns:us-east-1:123456789012:mail-events',
    });
    expect(def.CloudWatchDestination).toBeUndefined();
  });
});
