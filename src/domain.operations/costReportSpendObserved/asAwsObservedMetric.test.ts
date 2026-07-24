import { BadRequestError } from 'helpful-errors';
import { given, then } from 'test-fns';

import { COST_METRIC_NAMES } from '../costReport/COST_METRIC_NAMES';
import { asAwsObservedMetric } from './asAwsObservedMetric';

describe('asAwsObservedMetric', () => {
  given('[case1] a supported canonical metric name', () => {
    then(
      'it returns the name verbatim (PascalCase, GetCostAndUsage takes it raw)',
      () => {
        expect(asAwsObservedMetric({ metric: 'UnblendedCost' })).toEqual(
          'UnblendedCost',
        );
        expect(asAwsObservedMetric({ metric: 'NetUnblendedCost' })).toEqual(
          'NetUnblendedCost',
        );
        expect(asAwsObservedMetric({ metric: 'AmortizedCost' })).toEqual(
          'AmortizedCost',
        );
      },
    );

    then(
      'the full positive-path metric map matches the contract snapshot',
      () => {
        const mapped = Object.fromEntries(
          COST_METRIC_NAMES.map((metric) => [
            metric,
            asAwsObservedMetric({ metric }),
          ]),
        );
        expect(mapped).toMatchSnapshot();
      },
    );
  });

  given('[case2] an unknown metric name (a typo)', () => {
    then('it fails loud with a BadRequestError', () => {
      expect(() => asAwsObservedMetric({ metric: 'UnblendedCosts' })).toThrow(
        BadRequestError,
      );
    });

    then('the user-directed fail-loud message matches the snapshot', () => {
      expect(() =>
        asAwsObservedMetric({ metric: 'UnblendedCosts' }),
      ).toThrowErrorMatchingSnapshot();
    });
  });
});
