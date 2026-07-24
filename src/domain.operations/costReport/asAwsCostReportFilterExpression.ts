import type { Dimension, Expression } from '@aws-sdk/client-cost-explorer';

import type { DeclaredAwsCostReportFilter } from '@src/domain.objects/DeclaredAwsCostReportFilter';

import { assertCostReportFilterDimensionValid } from './assertCostReportFilterDimensionValid';

/**
 * .what = maps the shared domain filter to the AWS Filter Expression (or undefined)
 * .why = every cost-report read takes the same optional dimension predicate — a null
 *        filter scopes the read to the whole account, a set filter narrows it to the
 *        matched dimension values. shared by all 4 report composites (one source of
 *        truth so the four can never drift), per rule.prefer.most-common-denominator
 */
export const asAwsCostReportFilterExpression = (input: {
  filter: DeclaredAwsCostReportFilter | null;
}): Expression | undefined => {
  if (!input.filter) return undefined;

  // fail loud on an unaccepted dimension key BEFORE the billed request — the same
  // pit-of-success guard every peer AWS-enum input already has (one seam covers all 4)
  assertCostReportFilterDimensionValid({ dimension: input.filter.dimension });

  return {
    Dimensions: {
      // aws boundary: the SDK types Key as the `Dimension` string-enum; our domain
      // carries it as a string, so we cast at this external boundary. removal path:
      // when the domain `dimension` field is typed to the SDK's `Dimension` (or a
      // shared string-literal union the SDK accepts), this cast drops
      Key: input.filter.dimension as Dimension,
      Values: input.filter.values,
    },
  };
};
