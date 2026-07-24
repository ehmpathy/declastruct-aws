import type { GroupDefinition } from '@aws-sdk/client-cost-explorer';

import type { DeclaredAwsCostReportSpendObservedGroupBy } from '@src/domain.objects/DeclaredAwsCostReportSpendObserved';

/**
 * .what = maps the domain groupBy to the AWS GroupDefinition
 * .why = GetCostAndUsage groups spend by a dimension or a tag; this picks the
 *        exact GroupDefinition shape AWS expects for each branch
 */
export const asAwsObservedGroupDefinition = (input: {
  groupBy: DeclaredAwsCostReportSpendObservedGroupBy;
}): GroupDefinition =>
  'dimension' in input.groupBy
    ? { Type: 'DIMENSION', Key: input.groupBy.dimension }
    : { Type: 'TAG', Key: input.groupBy.tag };
