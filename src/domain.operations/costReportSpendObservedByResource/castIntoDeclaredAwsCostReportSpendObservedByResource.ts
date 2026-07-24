import type { GetCostAndUsageWithResourcesCommandOutput as SdkAwsGetCostAndUsageWithResourcesCommandOutput } from '@aws-sdk/client-cost-explorer';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { asIsoTimeStamp } from 'iso-time';
import { assure } from 'type-fns';

import { DeclaredAwsCostAmount } from '@src/domain.objects/DeclaredAwsCostAmount';
import type { DeclaredAwsCostReportFilter } from '@src/domain.objects/DeclaredAwsCostReportFilter';
import {
  DeclaredAwsCostReportSpendObservedByResource,
  DeclaredAwsCostReportSpendObservedByResourceBucket,
  DeclaredAwsCostReportSpendObservedByResourceGroup,
} from '@src/domain.objects/DeclaredAwsCostReportSpendObservedByResource';

import { sumDecimalStrings } from '../costReport/sumDecimalStrings';

/**
 * .what = transforms a GetCostAndUsageWithResources response into the domain report
 * .why = maps AWS ResultsByTime[] (trend) + Groups[] (per-resource composition, where
 *        each group Key is a resource id) into the by-resource report shape; amounts
 *        kept as strings. same wire shape as GetCostAndUsage, so this mirrors the plain
 *        SpendObserved cast, but its groups are per-RESOURCE_ID rather than per-dimension
 */
export const castIntoDeclaredAwsCostReportSpendObservedByResource = (input: {
  unique: {
    range: DeclaredAwsCostReportSpendObservedByResource['range'];
    granularity: DeclaredAwsCostReportSpendObservedByResource['granularity'];
    filter: DeclaredAwsCostReportFilter;
    metric: string;
  };
  result: SdkAwsGetCostAndUsageWithResourcesCommandOutput;
}): HasReadonly<typeof DeclaredAwsCostReportSpendObservedByResource> => {
  const { unique, result } = input;

  // build one bucket per ResultsByTime entry
  const buckets = (result.ResultsByTime ?? []).map((byTime) => {
    // read the bucket window
    const start =
      byTime.TimePeriod?.Start ??
      UnexpectedCodePathError.throw('ResultsByTime lacks TimePeriod.Start', {
        byTime,
      });
    const end =
      byTime.TimePeriod?.End ??
      UnexpectedCodePathError.throw('ResultsByTime lacks TimePeriod.End', {
        byTime,
      });

    // read the bucket total for the requested metric
    const totalMetric = byTime.Total?.[unique.metric];
    const totalAmount = totalMetric?.Amount ?? '0';
    const totalUnit = totalMetric?.Unit ?? 'USD';

    // build the per-resource composition (one group per resource id)
    const groups = (byTime.Groups ?? []).map((group) => {
      const groupMetric = group.Metrics?.[unique.metric];
      return DeclaredAwsCostReportSpendObservedByResourceGroup.as({
        keys: group.Keys ?? [],
        cost: DeclaredAwsCostAmount.as({
          amount: groupMetric?.Amount ?? '0',
          unit: groupMetric?.Unit ?? totalUnit,
        }),
      });
    });

    // when AWS returns no Total (grouped queries omit it), roll up the groups
    const rolledTotalAmount =
      totalMetric?.Amount !== undefined
        ? totalAmount
        : sumDecimalStrings({
            amounts: groups.map((group) => group.cost.amount),
          });

    return DeclaredAwsCostReportSpendObservedByResourceBucket.as({
      range: {
        since: asIsoTimeStamp(start),
        until: asIsoTimeStamp(end),
      },
      total: DeclaredAwsCostAmount.as({
        amount: rolledTotalAmount,
        unit: totalUnit,
      }),
      estimated: byTime.Estimated ?? false,
      groups,
    });
  });

  // roll up the report total across all buckets
  const unit = buckets[0]?.total.unit ?? 'USD';
  const total = DeclaredAwsCostAmount.as({
    amount: sumDecimalStrings({
      amounts: buckets.map((bucket) => bucket.total.amount),
    }),
    unit,
  });

  // cast and assure all readonly fields are present
  return assure(
    DeclaredAwsCostReportSpendObservedByResource.as({
      range: unique.range,
      granularity: unique.granularity,
      filter: unique.filter,
      metric: unique.metric,
      total,
      buckets,
    }),
    hasReadonly({ of: DeclaredAwsCostReportSpendObservedByResource }),
  );
};
