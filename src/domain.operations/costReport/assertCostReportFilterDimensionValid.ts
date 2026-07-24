import { Dimension } from '@aws-sdk/client-cost-explorer';
import { BadRequestError } from 'helpful-errors';

/**
 * .what = the dimension keys AWS Cost Explorer accepts for a Filter predicate
 * .why = derived straight from the SDK's own `Dimension` value-enum so the allowlist
 *        can never drift from what AWS accepts — a new SDK version that adds a key
 *        carries it here for free (no hand-maintained list to forget to update)
 */
const COST_REPORT_FILTER_DIMENSIONS: string[] = Object.values(Dimension);

/**
 * .what = asserts a cost-report `filter.dimension` is a key AWS accepts
 * .why = this is the ONE shared filter seam for all 4 report composites, yet its
 *        `dimension` was the lone AWS-enum-ish input with no client-side guard — a
 *        typo'd key silently reached AWS and burned a $0.01 request for an opaque 400.
 *        this closes that gap for the whole family at once (per
 *        rule.prefer.most-common-denominator), a fail-loud-before-the-billed-request
 *        guard like every peer input already has (asAwsObservedMetric,
 *        assertRightsizeServiceValid, assertForecastStartFuture, ...)
 */
export const assertCostReportFilterDimensionValid = (input: {
  dimension: string;
}): void => {
  if (!COST_REPORT_FILTER_DIMENSIONS.includes(input.dimension))
    BadRequestError.throw(
      'cost report filter dimension is invalid: not a key AWS Cost Explorer accepts',
      {
        dimension: input.dimension,
        supported: COST_REPORT_FILTER_DIMENSIONS,
      },
    );
};
