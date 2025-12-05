import { GetQueryResultsCommandOutput as SdkAwsGetQueryResultsCommandOutput } from '@aws-sdk/client-cloudwatch-logs';
import { UniDateTime } from '@ehmpathy/uni-time';
import { given, then } from 'test-fns';

import { castIntoDeclaredAwsLogGroupReportDistOfPattern } from './castIntoDeclaredAwsLogGroupReportDistOfPattern';

describe('castIntoDeclaredAwsLogGroupReportDistOfPattern', () => {
  const baseUnique = {
    logGroups: [{ name: '/aws/lambda/test-function' }],
    range: {
      since: '2024-11-01T00:00:00.000Z' as UniDateTime,
      until: '2024-11-30T23:59:59.000Z' as UniDateTime,
    },
    pattern: '@message',
    filter: null,
    limit: null,
  };

  given('query results with rows', () => {
    then('it should parse rows correctly', () => {
      const results: SdkAwsGetQueryResultsCommandOutput = {
        $metadata: {},
        status: 'Complete',
        statistics: {
          bytesScanned: 3110000000,
          recordsMatched: 6523133,
          recordsScanned: 10000000,
        },
        results: [
          [
            { field: '@message', value: 'START RequestId: abc-123' },
            { field: 'frequency', value: '6523133' },
            { field: 'totalBytes', value: '521850640' },
            { field: 'avgBytes', value: '80' },
          ],
          [
            { field: '@message', value: 'END RequestId: abc-123' },
            { field: 'frequency', value: '6523133' },
            { field: 'totalBytes', value: '456625310' },
            { field: 'avgBytes', value: '70' },
          ],
        ],
      };

      const result = castIntoDeclaredAwsLogGroupReportDistOfPattern({
        unique: baseUnique,
        results,
      });

      expect(result.scannedBytes).toBe(3110000000);
      expect(result.matchedEvents).toBe(6523133);
      expect(result.rows).toHaveLength(2);
      expect(result.rows?.[0]?.value).toBe('START RequestId: abc-123');
      expect(result.rows?.[0]?.frequency).toBe(6523133);
      expect(result.rows?.[0]?.totalBytes).toBe(521850640);
      expect(result.rows?.[0]?.avgBytes).toBe(80);
    });
  });

  given('query results', () => {
    then('it should calculate percentOfTotal correctly', () => {
      const results: SdkAwsGetQueryResultsCommandOutput = {
        $metadata: {},
        status: 'Complete',
        statistics: {
          bytesScanned: 1000,
          recordsMatched: 100,
          recordsScanned: 200,
        },
        results: [
          [
            { field: '@message', value: 'Message A' },
            { field: 'frequency', value: '75' },
            { field: 'totalBytes', value: '750' },
            { field: 'avgBytes', value: '10' },
          ],
          [
            { field: '@message', value: 'Message B' },
            { field: 'frequency', value: '25' },
            { field: 'totalBytes', value: '250' },
            { field: 'avgBytes', value: '10' },
          ],
        ],
      };

      const result = castIntoDeclaredAwsLogGroupReportDistOfPattern({
        unique: baseUnique,
        results,
      });

      // 75 / 100 = 75%
      expect(result.rows?.[0]?.percentOfTotal.frequency).toBe(75);
      // 750 / 1000 = 75%
      expect(result.rows?.[0]?.percentOfTotal.bytes).toBe(75);

      // 25 / 100 = 25%
      expect(result.rows?.[1]?.percentOfTotal.frequency).toBe(25);
      // 250 / 1000 = 25%
      expect(result.rows?.[1]?.percentOfTotal.bytes).toBe(25);
    });
  });

  given('empty query results', () => {
    then('it should return empty rows array', () => {
      const results: SdkAwsGetQueryResultsCommandOutput = {
        $metadata: {},
        status: 'Complete',
        statistics: {
          bytesScanned: 0,
          recordsMatched: 0,
          recordsScanned: 0,
        },
        results: [],
      };

      const result = castIntoDeclaredAwsLogGroupReportDistOfPattern({
        unique: baseUnique,
        results,
      });

      expect(result.rows).toHaveLength(0);
    });
  });

  given('query input parameters', () => {
    then('it should preserve the unique key fields', () => {
      const results: SdkAwsGetQueryResultsCommandOutput = {
        $metadata: {},
        status: 'Complete',
        statistics: {
          bytesScanned: 5000,
          recordsMatched: 500,
          recordsScanned: 1000,
        },
        results: [],
      };

      const unique = {
        logGroups: [
          { name: '/aws/lambda/func-a' },
          { name: '/aws/lambda/func-b' },
        ],
        range: {
          since: '2024-11-01T00:00:00.000Z' as UniDateTime,
          until: '2024-11-30T23:59:59.000Z' as UniDateTime,
        },
        pattern: 'level',
        filter: '@message not like /START/',
        limit: 100,
      };

      const result = castIntoDeclaredAwsLogGroupReportDistOfPattern({
        unique,
        results,
      });

      expect(result.logGroups).toEqual(unique.logGroups);
      expect(result.range).toEqual(unique.range);
      expect(result.pattern).toBe('level');
      expect(result.filter).toBe('@message not like /START/');
      expect(result.limit).toBe(100);
    });
  });

  given('rows with zero totals', () => {
    then('it should handle zero division gracefully', () => {
      const results: SdkAwsGetQueryResultsCommandOutput = {
        $metadata: {},
        status: 'Complete',
        statistics: {
          bytesScanned: 100,
          recordsMatched: 1,
          recordsScanned: 10,
        },
        results: [
          [
            { field: '@message', value: 'Message' },
            { field: 'frequency', value: '0' },
            { field: 'totalBytes', value: '0' },
            { field: 'avgBytes', value: '0' },
          ],
        ],
      };

      const result = castIntoDeclaredAwsLogGroupReportDistOfPattern({
        unique: baseUnique,
        results,
      });

      expect(result.rows?.[0]?.percentOfTotal.frequency).toBe(0);
      expect(result.rows?.[0]?.percentOfTotal.bytes).toBe(0);
    });
  });
});
