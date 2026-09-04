import { DeclaredAwsSesCloudwatchDimension } from '@src/domain.objects/DeclaredAwsSesCloudwatchDimension';

import { asCloudwatchDimensionParams } from './asCloudwatchDimensionParams';

/**
 * .what = unit coverage for the declared-dimension -> event-destination param cast
 * .why = the sesv2 communicator wants a plain `{ name, source, defaultValue }[]`; this pins
 *   that each domain dimension collapses to the flat shape, order held
 */
describe('asCloudwatchDimensionParams', () => {
  test('casts each dimension to the flat sdk shape', () => {
    const params = asCloudwatchDimensionParams({
      dimensions: [
        new DeclaredAwsSesCloudwatchDimension({
          name: 'ses:configuration-set',
          source: 'MESSAGE_TAG',
          defaultValue: 'default',
        }),
        new DeclaredAwsSesCloudwatchDimension({
          name: 'ses:from-domain',
          source: 'EMAIL_HEADER',
          defaultValue: 'none',
        }),
      ],
    });
    expect(params).toEqual([
      {
        name: 'ses:configuration-set',
        source: 'MESSAGE_TAG',
        defaultValue: 'default',
      },
      { name: 'ses:from-domain', source: 'EMAIL_HEADER', defaultValue: 'none' },
    ]);
  });

  test('casts an empty dimension list to an empty array', () => {
    expect(asCloudwatchDimensionParams({ dimensions: [] })).toEqual([]);
  });
});
