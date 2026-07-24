import type { GetCostAndUsageWithResourcesCommandOutput as SdkAwsGetCostAndUsageWithResourcesCommandOutput } from '@aws-sdk/client-cost-explorer';
import { asIsoTimeStamp } from 'iso-time';
import { given, then } from 'test-fns';

import { castIntoDeclaredAwsCostReportSpendObservedByResource } from './castIntoDeclaredAwsCostReportSpendObservedByResource';

describe('castIntoDeclaredAwsCostReportSpendObservedByResource', () => {
  const baseUnique = {
    range: {
      since: asIsoTimeStamp('2026-07-10T00:00:00.000Z'),
      until: asIsoTimeStamp('2026-07-12T00:00:00.000Z'),
    },
    granularity: 'DAILY' as const,
    filter: {
      dimension: 'SERVICE',
      values: ['Amazon Elastic Compute Cloud - Compute'],
    },
    metric: 'UnblendedCost',
  };

  given('[case1] a per-resource result grouped by RESOURCE_ID', () => {
    const result: SdkAwsGetCostAndUsageWithResourcesCommandOutput = {
      $metadata: {},
      ResultsByTime: [
        {
          TimePeriod: { Start: '2026-07-10', End: '2026-07-11' },
          Estimated: true,
          Groups: [
            {
              Keys: ['i-0aaa111'],
              Metrics: { UnblendedCost: { Amount: '0.5300', Unit: 'USD' } },
            },
            {
              Keys: ['i-0bbb222'],
              Metrics: { UnblendedCost: { Amount: '0.1200', Unit: 'USD' } },
            },
          ],
        },
      ],
    };

    then(
      'it maps each group to a per-resource cost, amounts as strings',
      () => {
        const report = castIntoDeclaredAwsCostReportSpendObservedByResource({
          unique: baseUnique,
          result,
        });
        const bucket = report.buckets?.[0];
        expect(bucket?.groups).toHaveLength(2);
        expect(bucket?.groups[0]?.keys).toEqual(['i-0aaa111']);
        expect(bucket?.groups[0]?.cost.amount).toBe('0.5300');
        expect(bucket?.groups[1]?.keys).toEqual(['i-0bbb222']);
      },
    );

    then('it rolls the bucket total up from the per-resource groups', () => {
      const report = castIntoDeclaredAwsCostReportSpendObservedByResource({
        unique: baseUnique,
        result,
      });
      expect(report.buckets?.[0]?.total.amount).toBe('0.6500');
      expect(report.buckets?.[0]?.estimated).toBe(true);
    });

    then('it matches the contract snapshot', () => {
      expect(
        castIntoDeclaredAwsCostReportSpendObservedByResource({
          unique: baseUnique,
          result,
        }),
      ).toMatchSnapshot();
    });
  });

  given('[case2] an empty result (opt-in off degrades to this)', () => {
    const result: SdkAwsGetCostAndUsageWithResourcesCommandOutput = {
      $metadata: {},
      ResultsByTime: [],
    };

    then('it reads to empty buckets and a zero total', () => {
      const report = castIntoDeclaredAwsCostReportSpendObservedByResource({
        unique: baseUnique,
        result,
      });
      expect(report.buckets).toHaveLength(0);
      expect(report.total?.amount).toBe('0');
    });

    then(
      'it preserves the unique key fields (incl. the required filter)',
      () => {
        const report = castIntoDeclaredAwsCostReportSpendObservedByResource({
          unique: baseUnique,
          result,
        });
        expect(report.range).toEqual(baseUnique.range);
        expect(report.granularity).toBe('DAILY');
        expect(report.filter).toEqual(baseUnique.filter);
        expect(report.metric).toBe('UnblendedCost');
      },
    );
  });
});
