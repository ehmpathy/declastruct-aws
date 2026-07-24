import type { Metric } from '@aws-sdk/client-cost-explorer';
import { BadRequestError } from 'helpful-errors';

import type { COST_METRIC_NAMES } from '../costReport/COST_METRIC_NAMES';

/**
 * .what = maps the canonical PascalCase cost metric to the AWS forecast `Metric` enum
 * .why = the domain object exposes ONE canonical `metric` name (PascalCase, e.g.
 *        'UnblendedCost') across both spend reports; GetCostAndUsage takes that
 *        PascalCase key verbatim, but GetCostForecast takes the SCREAMING_SNAKE
 *        `Metric` enum ('UNBLENDED_COST'). this maps the one canonical name to the
 *        forecast enum so `metric: 'UnblendedCost'` works on BOTH reports (no surprise)
 * .note = fails loud with a BadRequestError on an unknown name (invalid user input, NOT
 *         a code-path bug) rather than pass a bad value to AWS — symmetric with the
 *         observed-side asAwsObservedMetric. the `byName` map is keyed on
 *         COST_METRIC_NAMES itself (the shared observed-side allowlist), so a metric
 *         added to that list WITHOUT a forecast enum entry here is a COMPILE error — the
 *         two stay in lockstep by construction, not by comment
 */
export const asAwsForecastMetric = (input: { metric: string }): Metric => {
  const byName: Record<(typeof COST_METRIC_NAMES)[number], Metric> = {
    UnblendedCost: 'UNBLENDED_COST',
    BlendedCost: 'BLENDED_COST',
    NetUnblendedCost: 'NET_UNBLENDED_COST',
    AmortizedCost: 'AMORTIZED_COST',
    NetAmortizedCost: 'NET_AMORTIZED_COST',
    UsageQuantity: 'USAGE_QUANTITY',
    NormalizedUsageAmount: 'NORMALIZED_USAGE_AMOUNT',
  };
  return (
    byName[input.metric as (typeof COST_METRIC_NAMES)[number]] ??
    BadRequestError.throw(
      'unknown cost metric name for forecast; expected a canonical PascalCase metric',
      { metric: input.metric, supported: Object.keys(byName) },
    )
  );
};
