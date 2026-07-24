import type { GetCostAndUsageCommandOutput as SdkAwsGetCostAndUsageCommandOutput } from '@aws-sdk/client-cost-explorer';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { asIsoTimeStamp } from 'iso-time';
import { assure } from 'type-fns';

import { DeclaredAwsCostAmount } from '@src/domain.objects/DeclaredAwsCostAmount';
import type { DeclaredAwsCostReportFilter } from '@src/domain.objects/DeclaredAwsCostReportFilter';
import {
  DeclaredAwsCostReportSpendObserved,
  DeclaredAwsCostReportSpendObservedBucket,
  DeclaredAwsCostReportSpendObservedGroup,
  type DeclaredAwsCostReportSpendObservedGroupBy,
} from '@src/domain.objects/DeclaredAwsCostReportSpendObserved';

import { sumDecimalStrings } from '../costReport/sumDecimalStrings';

/**
 * .what = transforms a GetCostAndUsage response into the domain report
 * .why = maps AWS ResultsByTime[] (trend) + Groups[] (composition) into the
 *        DeclaredAwsCostReportSpendObserved shape, amounts kept as strings
 */
export const castIntoDeclaredAwsCostReportSpendObserved = (input: {
  unique: {
    range: DeclaredAwsCostReportSpendObserved['range'];
    granularity: DeclaredAwsCostReportSpendObserved['granularity'];
    groupBy: DeclaredAwsCostReportSpendObservedGroupBy;
    filter: DeclaredAwsCostReportFilter | null;
    metric: string;
  };
  result: SdkAwsGetCostAndUsageCommandOutput;
}): HasReadonly<typeof DeclaredAwsCostReportSpendObserved> => {
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

    // build the per-group composition
    const groups = (byTime.Groups ?? []).map((group) => {
      const groupMetric = group.Metrics?.[unique.metric];
      return DeclaredAwsCostReportSpendObservedGroup.as({
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

    return DeclaredAwsCostReportSpendObservedBucket.as({
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
    DeclaredAwsCostReportSpendObserved.as({
      range: unique.range,
      granularity: unique.granularity,
      groupBy: unique.groupBy,
      filter: unique.filter,
      metric: unique.metric,
      total,
      buckets,
    }),
    hasReadonly({ of: DeclaredAwsCostReportSpendObserved }),
  );
};
