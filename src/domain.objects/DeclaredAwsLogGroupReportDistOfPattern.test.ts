import type { UniDateTime } from '@ehmpathy/uni-time';
import { given, then, when } from 'test-fns';

import {
  DeclaredAwsLogGroupReportDistOfPattern,
  DeclaredAwsLogGroupReportDistOfPatternRow,
} from './DeclaredAwsLogGroupReportDistOfPattern';

describe('DeclaredAwsLogGroupReportDistOfPatternRow', () => {
  given('valid row data', () => {
    when('instantiated', () => {
      let row: DeclaredAwsLogGroupReportDistOfPatternRow;

      then('it should instantiate', () => {
        row = new DeclaredAwsLogGroupReportDistOfPatternRow({
          value: 'START RequestId: abc-123',
          frequency: 6523133,
          totalBytes: 521850640,
          avgBytes: 80,
          percentOfTotal: {
            frequency: 25,
            bytes: 17,
          },
        });
      });

      then('it should have all properties', () => {
        expect(row).toMatchObject({
          value: 'START RequestId: abc-123',
          frequency: 6523133,
          totalBytes: 521850640,
          avgBytes: 80,
          percentOfTotal: {
            frequency: 25,
            bytes: 17,
          },
        });
      });
    });
  });
});

describe('DeclaredAwsLogGroupReportDistOfPattern', () => {
  given('valid query parameters', () => {
    when('instantiated with minimal properties', () => {
      let report: DeclaredAwsLogGroupReportDistOfPattern;

      then('it should instantiate', () => {
        report = new DeclaredAwsLogGroupReportDistOfPattern({
          logGroups: [
            { name: '/aws/lambda/svc-chat-prod-getDisplayableMessages' },
          ],
          range: {
            since: '2024-11-01T00:00:00.000Z' as UniDateTime,
            until: '2024-11-30T23:59:59.000Z' as UniDateTime,
          },
          pattern: '@message',
          filter: null,
          limit: null,
        });
      });

      then('it should have the query parameters', () => {
        expect(report).toMatchObject({
          logGroups: [
            { name: '/aws/lambda/svc-chat-prod-getDisplayableMessages' },
          ],
          pattern: '@message',
          filter: null,
          limit: null,
        });
      });

      then('readonly fields are undefined by default', () => {
        expect(report.scannedBytes).toBeUndefined();
        expect(report.matchedEvents).toBeUndefined();
        expect(report.rows).toBeUndefined();
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with readonly fields', () => {
      let report: DeclaredAwsLogGroupReportDistOfPattern;

      then('it should instantiate', () => {
        report = new DeclaredAwsLogGroupReportDistOfPattern({
          logGroups: [
            { name: '/aws/lambda/svc-chat-prod-getDisplayableMessages' },
            { name: '/aws/lambda/svc-quotes-prod-execute' },
          ],
          range: {
            since: '2024-11-01T00:00:00.000Z' as UniDateTime,
            until: '2024-11-30T23:59:59.000Z' as UniDateTime,
          },
          pattern: '@message',
          filter: '@message not like /START|END|REPORT/',
          limit: 100,
          scannedBytes: 3110000000,
          matchedEvents: 6523133,
          rows: [
            {
              value: '{"level":"info",...}',
              frequency: 3261566,
              totalBytes: 652313300,
              avgBytes: 200,
              percentOfTotal: { frequency: 50, bytes: 42 },
            },
          ],
        });
      });

      then('it should have all properties', () => {
        expect(report).toMatchObject({
          pattern: '@message',
          filter: '@message not like /START|END|REPORT/',
          limit: 100,
          scannedBytes: 3110000000,
          matchedEvents: 6523133,
        });
        expect(report.logGroups).toHaveLength(2);
        expect(report.rows).toHaveLength(1);
      });
    });
  });

  given('multiple log groups', () => {
    when('instantiated', () => {
      let report: DeclaredAwsLogGroupReportDistOfPattern;

      then('it should accept multiple log group refs', () => {
        report = new DeclaredAwsLogGroupReportDistOfPattern({
          logGroups: [
            { name: '/aws/lambda/function-a' },
            { name: '/aws/lambda/function-b' },
            { name: '/aws/lambda/function-c' },
          ],
          range: {
            since: '2024-11-01T00:00:00.000Z' as UniDateTime,
            until: '2024-11-30T23:59:59.000Z' as UniDateTime,
          },
          pattern: 'level',
          filter: null,
          limit: 10,
        });
        expect(report.logGroups).toHaveLength(3);
      });
    });
  });

  given('the static keys', () => {
    then('unique is defined by query parameters', () => {
      expect(DeclaredAwsLogGroupReportDistOfPattern.unique).toEqual([
        'logGroups',
        'range',
        'pattern',
        'filter',
        'limit',
      ]);
    });

    then('metadata is empty', () => {
      expect(DeclaredAwsLogGroupReportDistOfPattern.metadata).toEqual([]);
    });

    then('readonly includes rows, scannedBytes, matchedEvents', () => {
      expect(DeclaredAwsLogGroupReportDistOfPattern.readonly).toEqual([
        'rows',
        'scannedBytes',
        'matchedEvents',
      ]);
    });
  });
});
