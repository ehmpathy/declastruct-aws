import { BadRequestError } from 'helpful-errors';

import { COST_METRIC_NAMES } from '../costReport/COST_METRIC_NAMES';

/**
 * .what = validates the observed-report metric name and returns it verbatim
 * .why = GetCostAndUsage takes the PascalCase metric key directly (no translation),
 *        so a typo like 'UnblendedCosts' would reach AWS and come back as an opaque
 *        wrap. this fails loud early with the supported set — symmetric with the
 *        forecast's asAwsForecastMetric (pit of success)
 */
export const asAwsObservedMetric = (input: { metric: string }): string => {
  const supported: readonly string[] = COST_METRIC_NAMES;
  if (!supported.includes(input.metric))
    BadRequestError.throw(
      'unknown cost metric name for observed spend; expected a canonical PascalCase metric',
      { metric: input.metric, supported: COST_METRIC_NAMES },
    );
  return input.metric;
};
