import type { GetMetricDataCommandOutput as SdkAwsGetMetricDataCommandOutput } from '@aws-sdk/client-cloudwatch';
import type { UniDateTime } from '@ehmpathy/uni-time';
import { given, then } from 'test-fns';

import { castIntoDeclaredAwsLogGroupReportCostOfIngestion } from './castIntoDeclaredAwsLogGroupReportCostOfIngestion';

describe('castIntoDeclaredAwsLogGroupReportCostOfIngestion', () => {
  const baseUnique = {
    logGroupFilter: { prefix: '/aws/lambda/' },
    range: {
      since: '2024-11-01T00:00:00.000Z' as UniDateTime,
      until: '2024-11-30T23:59:59.000Z' as UniDateTime,
    },
  };

  given('metrics with multiple log groups', () => {
    then('it should match metrics to log groups correctly', () => {
      const logGroupNames = ['/aws/lambda/func-a', '/aws/lambda/func-b'];

      const metrics: SdkAwsGetMetricDataCommandOutput = {
        $metadata: {},
        MetricDataResults: [
          { Id: 'bytes_0', Values: [1073741824] }, // 1 GB
          { Id: 'events_0', Values: [1000] },
          { Id: 'bytes_1', Values: [536870912] }, // 0.5 GB
          { Id: 'events_1', Values: [500] },
        ],
      };

      const result = castIntoDeclaredAwsLogGroupReportCostOfIngestion({
        unique: baseUnique,
        logGroupNames,
        metrics,
      });

      expect(result.rows).toHaveLength(2);
      expect(result.rows?.[0]?.logGroupName).toBe('/aws/lambda/func-a'); // sorted by bytes desc
      expect(result.rows?.[0]?.ingestedBytes).toBe(1073741824);
      expect(result.rows?.[1]?.logGroupName).toBe('/aws/lambda/func-b');
      expect(result.rows?.[1]?.ingestedBytes).toBe(536870912);
    });
  });

  given('metrics', () => {
    then('it should calculate cost correctly at $0.50/GB', () => {
      const logGroupNames = ['/aws/lambda/func-a'];
      const oneGB = 1073741824;

      const metrics: SdkAwsGetMetricDataCommandOutput = {
        $metadata: {},
        MetricDataResults: [
          { Id: 'bytes_0', Values: [oneGB] },
          { Id: 'events_0', Values: [1000] },
        ],
      };

      const result = castIntoDeclaredAwsLogGroupReportCostOfIngestion({
        unique: baseUnique,
        logGroupNames,
        metrics,
      });

      expect(result.rows?.[0]?.estimatedCostUsd).toBe(0.5);
      expect(result.totalEstimatedCostUsd).toBe(0.5);
    });
  });

  given('metrics', () => {
    then('it should calculate totals correctly', () => {
      const logGroupNames = [
        '/aws/lambda/func-a',
        '/aws/lambda/func-b',
        '/aws/lambda/func-c',
      ];

      const metrics: SdkAwsGetMetricDataCommandOutput = {
        $metadata: {},
        MetricDataResults: [
          { Id: 'bytes_0', Values: [1000] },
          { Id: 'events_0', Values: [10] },
          { Id: 'bytes_1', Values: [2000] },
          { Id: 'events_1', Values: [20] },
          { Id: 'bytes_2', Values: [3000] },
          { Id: 'events_2', Values: [30] },
        ],
      };

      const result = castIntoDeclaredAwsLogGroupReportCostOfIngestion({
        unique: baseUnique,
        logGroupNames,
        metrics,
      });

      expect(result.totalIngestedBytes).toBe(6000);
      expect(result.totalLogEvents).toBe(60);
    });
  });

  given('metrics', () => {
    then('it should calculate percentOfTotal correctly', () => {
      const logGroupNames = ['/aws/lambda/func-a', '/aws/lambda/func-b'];

      const metrics: SdkAwsGetMetricDataCommandOutput = {
        $metadata: {},
        MetricDataResults: [
          { Id: 'bytes_0', Values: [75] },
          { Id: 'events_0', Values: [30] },
          { Id: 'bytes_1', Values: [25] },
          { Id: 'events_1', Values: [70] },
        ],
      };

      const result = castIntoDeclaredAwsLogGroupReportCostOfIngestion({
        unique: baseUnique,
        logGroupNames,
        metrics,
      });

      // sorted by bytes, so func-a (75 bytes) comes first
      expect(result.rows?.[0]?.percentOfTotal.bytes).toBe(75); // 75/100
      expect(result.rows?.[0]?.percentOfTotal.events).toBe(30); // 30/100
      expect(result.rows?.[1]?.percentOfTotal.bytes).toBe(25); // 25/100
      expect(result.rows?.[1]?.percentOfTotal.events).toBe(70); // 70/100
    });
  });

  given('metrics', () => {
    then('it should sort by ingestedBytes descending', () => {
      const logGroupNames = [
        '/aws/lambda/small',
        '/aws/lambda/large',
        '/aws/lambda/medium',
      ];

      const metrics: SdkAwsGetMetricDataCommandOutput = {
        $metadata: {},
        MetricDataResults: [
          { Id: 'bytes_0', Values: [100] }, // small
          { Id: 'events_0', Values: [1] },
          { Id: 'bytes_1', Values: [1000] }, // large
          { Id: 'events_1', Values: [10] },
          { Id: 'bytes_2', Values: [500] }, // medium
          { Id: 'events_2', Values: [5] },
        ],
      };

      const result = castIntoDeclaredAwsLogGroupReportCostOfIngestion({
        unique: baseUnique,
        logGroupNames,
        metrics,
      });

      expect(result.rows?.[0]?.logGroupName).toBe('/aws/lambda/large');
      expect(result.rows?.[1]?.logGroupName).toBe('/aws/lambda/medium');
      expect(result.rows?.[2]?.logGroupName).toBe('/aws/lambda/small');
    });
  });

  given('empty metrics', () => {
    then('it should handle empty log groups', () => {
      const metrics: SdkAwsGetMetricDataCommandOutput = {
        $metadata: {},
        MetricDataResults: [],
      };

      const result = castIntoDeclaredAwsLogGroupReportCostOfIngestion({
        unique: baseUnique,
        logGroupNames: [],
        metrics,
      });

      expect(result.rows).toHaveLength(0);
      expect(result.totalIngestedBytes).toBe(0);
      expect(result.totalLogEvents).toBe(0);
      expect(result.totalEstimatedCostUsd).toBe(0);
    });
  });

  given('log groups with no metrics', () => {
    then('it should default to zero values', () => {
      const logGroupNames = ['/aws/lambda/no-data'];

      const metrics: SdkAwsGetMetricDataCommandOutput = {
        $metadata: {},
        MetricDataResults: [], // no matching metrics
      };

      const result = castIntoDeclaredAwsLogGroupReportCostOfIngestion({
        unique: baseUnique,
        logGroupNames,
        metrics,
      });

      expect(result.rows?.[0]?.ingestedBytes).toBe(0);
      expect(result.rows?.[0]?.logEvents).toBe(0);
      expect(result.rows?.[0]?.estimatedCostUsd).toBe(0);
    });
  });

  given('query input parameters', () => {
    then('it should preserve the unique key fields', () => {
      const unique = {
        logGroupFilter: { names: ['/aws/lambda/specific'] },
        range: {
          since: '2024-12-01T00:00:00.000Z' as UniDateTime,
          until: '2024-12-31T23:59:59.000Z' as UniDateTime,
        },
      };

      const metrics: SdkAwsGetMetricDataCommandOutput = {
        $metadata: {},
        MetricDataResults: [],
      };

      const result = castIntoDeclaredAwsLogGroupReportCostOfIngestion({
        unique,
        logGroupNames: [],
        metrics,
      });

      expect(result.logGroupFilter).toEqual({
        names: ['/aws/lambda/specific'],
      });
      expect(result.range).toEqual(unique.range);
    });
  });
});
