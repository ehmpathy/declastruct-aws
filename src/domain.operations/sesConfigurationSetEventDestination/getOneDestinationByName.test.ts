import { getOneDestinationByName } from './getOneDestinationByName';

/**
 * .what = unit coverage for the in-memory event-destination pick-by-name
 * .why = getOneSesConfigurationSetEventDestination leans on this to drift-check ONE destination
 *   off the full set read; a wrong pick would mis-report drift
 */
const destinations = [
  {
    name: 'to-cloudwatch',
    enabled: true,
    eventTypes: ['SEND'],
    cloudwatch: null,
    snsTopicArn: null,
  },
  {
    name: 'to-sns',
    enabled: false,
    eventTypes: ['BOUNCE'],
    cloudwatch: null,
    snsTopicArn: 'arn:aws:sns:us-east-1:123456789012:mail-events',
  },
];

describe('getOneDestinationByName', () => {
  test('returns the destination whose name matches', () => {
    expect(getOneDestinationByName({ destinations, name: 'to-sns' })).toEqual(
      destinations[1],
    );
  });

  test('returns null when no destination matches', () => {
    expect(getOneDestinationByName({ destinations, name: 'absent' })).toEqual(
      null,
    );
  });
});
