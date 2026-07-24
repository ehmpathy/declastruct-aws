/**
 * .what = the canonical PascalCase cost-metric names both spend reports accept
 * .why = GetCostAndUsage takes these keys verbatim; GetCostForecast maps them to
 *        its SCREAMING_SNAKE `Metric` enum. one shared source of truth so the two
 *        reports can never drift on which metric names are valid
 */
export const COST_METRIC_NAMES = [
  'UnblendedCost',
  'BlendedCost',
  'NetUnblendedCost',
  'AmortizedCost',
  'NetAmortizedCost',
  'UsageQuantity',
  'NormalizedUsageAmount',
] as const;
