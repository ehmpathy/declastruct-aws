import type { GetCostAndUsageCommandOutput as SdkAwsGetCostAndUsageCommandOutput } from '@aws-sdk/client-cost-explorer';
import { asIsoTimeStamp } from 'iso-time';
import { given, then } from 'test-fns';

import { castIntoDeclaredAwsCostReportSpendObserved } from './castIntoDeclaredAwsCostReportSpendObserved';

describe('castIntoDeclaredAwsCostReportSpendObserved', () => {
  const baseUnique = {
    range: {
      since: asIsoTimeStamp('2026-07-01T00:00:00.000Z'),
      until: asIsoTimeStamp('2026-08-01T00:00:00.000Z'),
    },
    granularity: 'MONTHLY' as const,
    groupBy: { dimension: 'SERVICE' },
    filter: null,
    metric: 'UnblendedCost',
  };

  given('[case1] a grouped result with a Total present', () => {
    const result: SdkAwsGetCostAndUsageCommandOutput = {
      $metadata: {},
      ResultsByTime: [
        {
          TimePeriod: { Start: '2026-07-01', End: '2026-08-01' },
          Total: { UnblendedCost: { Amount: '16.42', Unit: 'USD' } },
          Estimated: false,
          Groups: [
            {
              Keys: ['Amazon Elastic Compute Cloud - Compute'],
              Metrics: { UnblendedCost: { Amount: '12.10', Unit: 'USD' } },
            },
            {
              Keys: ['Amazon Simple Storage Service'],
              Metrics: { UnblendedCost: { Amount: '4.32', Unit: 'USD' } },
            },
          ],
        },
      ],
    };

    then('it maps buckets, groups, and preserves amounts as strings', () => {
      const report = castIntoDeclaredAwsCostReportSpendObserved({
        unique: baseUnique,
        result,
      });

      expect(report.buckets).toHaveLength(1);
      const bucket = report.buckets?.[0];
      expect(bucket?.total.amount).toBe('16.42');
      expect(bucket?.total.unit).toBe('USD');
      expect(bucket?.estimated).toBe(false);
      expect(bucket?.range).toEqual({
        since: asIsoTimeStamp('2026-07-01'),
        until: asIsoTimeStamp('2026-08-01'),
      });
      expect(bucket?.groups).toHaveLength(2);
      expect(bucket?.groups[0]?.keys).toEqual([
        'Amazon Elastic Compute Cloud - Compute',
      ]);
      expect(bucket?.groups[0]?.cost.amount).toBe('12.10');
    });

    then('it rolls up the report total across buckets', () => {
      const report = castIntoDeclaredAwsCostReportSpendObserved({
        unique: baseUnique,
        result,
      });
      expect(report.total?.amount).toBe('16.42');
    });

    then('it matches the contract snapshot', () => {
      expect(
        castIntoDeclaredAwsCostReportSpendObserved({
          unique: baseUnique,
          result,
        }),
      ).toMatchSnapshot();
    });
  });

  given(
    '[case2] a grouped result with NO Total (grouped queries omit it)',
    () => {
      const result: SdkAwsGetCostAndUsageCommandOutput = {
        $metadata: {},
        ResultsByTime: [
          {
            TimePeriod: { Start: '2026-07-01', End: '2026-08-01' },
            Estimated: true,
            Groups: [
              {
                Keys: ['A'],
                Metrics: { UnblendedCost: { Amount: '3', Unit: 'USD' } },
              },
              {
                Keys: ['B'],
                Metrics: { UnblendedCost: { Amount: '2', Unit: 'USD' } },
              },
            ],
          },
        ],
      };

      then('it rolls the bucket total up from the groups', () => {
        const report = castIntoDeclaredAwsCostReportSpendObserved({
          unique: baseUnique,
          result,
        });
        expect(report.buckets?.[0]?.total.amount).toBe('5');
        expect(report.buckets?.[0]?.estimated).toBe(true);
      });

      then('it matches the contract snapshot', () => {
        expect(
          castIntoDeclaredAwsCostReportSpendObserved({
            unique: baseUnique,
            result,
          }),
        ).toMatchSnapshot();
      });
    },
  );

  given('[case3] an empty result', () => {
    const result: SdkAwsGetCostAndUsageCommandOutput = {
      $metadata: {},
      ResultsByTime: [],
    };

    then('it reads to empty buckets and a zero total', () => {
      const report = castIntoDeclaredAwsCostReportSpendObserved({
        unique: baseUnique,
        result,
      });
      expect(report.buckets).toHaveLength(0);
      expect(report.total?.amount).toBe('0');
    });

    then('it matches the contract snapshot', () => {
      expect(
        castIntoDeclaredAwsCostReportSpendObserved({
          unique: baseUnique,
          result,
        }),
      ).toMatchSnapshot();
    });
  });

  given('[case4] any result', () => {
    const result: SdkAwsGetCostAndUsageCommandOutput = {
      $metadata: {},
      ResultsByTime: [],
    };

    then('it preserves the unique key fields', () => {
      const report = castIntoDeclaredAwsCostReportSpendObserved({
        unique: baseUnique,
        result,
      });
      expect(report.range).toEqual(baseUnique.range);
      expect(report.granularity).toBe('MONTHLY');
      expect(report.groupBy).toEqual({ dimension: 'SERVICE' });
      expect(report.filter).toBeNull();
      expect(report.metric).toBe('UnblendedCost');
    });
  });
});
