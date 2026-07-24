import { BadRequestError } from 'helpful-errors';
import { given, then } from 'test-fns';

import { COST_METRIC_NAMES } from '../costReport/COST_METRIC_NAMES';
import { asAwsForecastMetric } from './asAwsForecastMetric';

describe('asAwsForecastMetric', () => {
  given('[case1] a supported canonical metric name', () => {
    then('it maps to the SCREAMING_SNAKE AWS forecast Metric enum', () => {
      expect(asAwsForecastMetric({ metric: 'UnblendedCost' })).toEqual(
        'UNBLENDED_COST',
      );
      expect(asAwsForecastMetric({ metric: 'NetUnblendedCost' })).toEqual(
        'NET_UNBLENDED_COST',
      );
    });

    then(
      'the full positive-path metric map matches the contract snapshot',
      () => {
        const mapped = Object.fromEntries(
          COST_METRIC_NAMES.map((metric) => [
            metric,
            asAwsForecastMetric({ metric }),
          ]),
        );
        expect(mapped).toMatchSnapshot();
      },
    );
  });

  given('[case2] an unknown metric name (a typo)', () => {
    then('it fails loud with a BadRequestError', () => {
      expect(() => asAwsForecastMetric({ metric: 'UnblendedCosts' })).toThrow(
        BadRequestError,
      );
    });

    then('the user-directed fail-loud message matches the snapshot', () => {
      expect(() =>
        asAwsForecastMetric({ metric: 'UnblendedCosts' }),
      ).toThrowErrorMatchingSnapshot();
    });
  });
});
