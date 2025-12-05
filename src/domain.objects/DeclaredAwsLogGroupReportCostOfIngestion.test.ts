import { UniDateTime } from '@ehmpathy/uni-time';
import { given, then, when } from 'test-fns';

import {
  DeclaredAwsLogGroupFilter,
  DeclaredAwsLogGroupReportCostOfIngestion,
  DeclaredAwsLogGroupReportCostOfIngestionRow,
} from './DeclaredAwsLogGroupReportCostOfIngestion';

describe('DeclaredAwsLogGroupReportCostOfIngestionRow', () => {
  given('valid row data', () => {
    when('instantiated', () => {
      let row: DeclaredAwsLogGroupReportCostOfIngestionRow;

      then('it should instantiate', () => {
        row = new DeclaredAwsLogGroupReportCostOfIngestionRow({
          logGroupName: '/aws/lambda/svc-chat-prod-getDisplayableMessages',
          ingestedBytes: 3338813440,
          logEvents: 6523133,
          estimatedCostUsd: 11.42,
          percentOfTotal: {
            bytes: 62.5,
            events: 62.0,
          },
        });
      });

      then('it should have all properties', () => {
        expect(row).toMatchObject({
          logGroupName: '/aws/lambda/svc-chat-prod-getDisplayableMessages',
          ingestedBytes: 3338813440,
          logEvents: 6523133,
          estimatedCostUsd: 11.42,
          percentOfTotal: {
            bytes: 62.5,
            events: 62.0,
          },
        });
      });
    });
  });
});

describe('DeclaredAwsLogGroupFilter', () => {
  given('a prefix filter', () => {
    when('used in a report', () => {
      then('it should accept prefix', () => {
        const filter: DeclaredAwsLogGroupFilter = { prefix: '/aws/lambda/' };
        expect(filter.prefix).toBe('/aws/lambda/');
      });
    });
  });

  given('a names filter', () => {
    when('used in a report', () => {
      then('it should accept names array', () => {
        const filter: DeclaredAwsLogGroupFilter = {
          names: ['/aws/lambda/func-a', '/aws/lambda/func-b'],
        };
        expect(filter.names).toHaveLength(2);
      });
    });
  });
});

describe('DeclaredAwsLogGroupReportCostOfIngestion', () => {
  given('valid query parameters with prefix filter', () => {
    when('instantiated with minimal properties', () => {
      let report: DeclaredAwsLogGroupReportCostOfIngestion;

      then('it should instantiate', () => {
        report = new DeclaredAwsLogGroupReportCostOfIngestion({
          logGroupFilter: { prefix: '/aws/lambda/' },
          range: {
            since: '2024-11-01T00:00:00.000Z' as UniDateTime,
            until: '2024-11-30T23:59:59.000Z' as UniDateTime,
          },
        });
      });

      then('it should have the query parameters', () => {
        expect(report).toMatchObject({
          logGroupFilter: { prefix: '/aws/lambda/' },
        });
      });

      then('readonly fields are undefined by default', () => {
        expect(report.totalIngestedBytes).toBeUndefined();
        expect(report.totalLogEvents).toBeUndefined();
        expect(report.totalEstimatedCostUsd).toBeUndefined();
        expect(report.rows).toBeUndefined();
      });
    });
  });

  given('query parameters with names filter', () => {
    when('instantiated', () => {
      let report: DeclaredAwsLogGroupReportCostOfIngestion;

      then('it should instantiate', () => {
        report = new DeclaredAwsLogGroupReportCostOfIngestion({
          logGroupFilter: {
            names: [
              '/aws/lambda/svc-chat-prod-getDisplayableMessages',
              '/aws/lambda/svc-quotes-prod-execute',
            ],
          },
          range: {
            since: '2024-11-01T00:00:00.000Z' as UniDateTime,
            until: '2024-11-30T23:59:59.000Z' as UniDateTime,
          },
        });
      });

      then('it should have the names filter', () => {
        expect(
          (report.logGroupFilter as { names: string[] }).names,
        ).toHaveLength(2);
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with readonly fields', () => {
      let report: DeclaredAwsLogGroupReportCostOfIngestion;

      then('it should instantiate', () => {
        report = new DeclaredAwsLogGroupReportCostOfIngestion({
          logGroupFilter: { prefix: '/aws/lambda/' },
          range: {
            since: '2024-11-01T00:00:00.000Z' as UniDateTime,
            until: '2024-11-30T23:59:59.000Z' as UniDateTime,
          },
          totalIngestedBytes: 5340000000,
          totalLogEvents: 10523819,
          totalEstimatedCostUsd: 28.62,
          rows: [
            {
              logGroupName: '/aws/lambda/svc-chat-prod-getDisplayableMessages',
              ingestedBytes: 3338813440,
              logEvents: 6523133,
              estimatedCostUsd: 11.42,
              percentOfTotal: { bytes: 62.5, events: 62.0 },
            },
            {
              logGroupName: '/aws/lambda/svc-quotes-prod-execute',
              ingestedBytes: 1175389184,
              logEvents: 2297174,
              estimatedCostUsd: 4.02,
              percentOfTotal: { bytes: 22.0, events: 21.8 },
            },
          ],
        });
      });

      then('it should have all properties', () => {
        expect(report).toMatchObject({
          totalIngestedBytes: 5340000000,
          totalLogEvents: 10523819,
          totalEstimatedCostUsd: 28.62,
        });
        expect(report.rows).toHaveLength(2);
      });
    });
  });

  given('the static keys', () => {
    then('unique is defined by filter and range', () => {
      expect(DeclaredAwsLogGroupReportCostOfIngestion.unique).toEqual([
        'logGroupFilter',
        'range',
      ]);
    });

    then('metadata is empty', () => {
      expect(DeclaredAwsLogGroupReportCostOfIngestion.metadata).toEqual([]);
    });

    then('readonly includes rows and totals', () => {
      expect(DeclaredAwsLogGroupReportCostOfIngestion.readonly).toEqual([
        'rows',
        'totalIngestedBytes',
        'totalLogEvents',
        'totalEstimatedCostUsd',
      ]);
    });
  });
});
