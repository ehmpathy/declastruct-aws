import type { GetCostForecastCommandOutput as SdkAwsGetCostForecastCommandOutput } from '@aws-sdk/client-cost-explorer';
import { asIsoTimeStamp } from 'iso-time';
import { given, then } from 'test-fns';

import { castIntoDeclaredAwsCostReportSpendForecast } from './castIntoDeclaredAwsCostReportSpendForecast';

describe('castIntoDeclaredAwsCostReportSpendForecast', () => {
  const baseUnique = {
    range: {
      since: asIsoTimeStamp('2026-07-15T00:00:00.000Z'),
      until: asIsoTimeStamp('2026-08-01T00:00:00.000Z'),
    },
    granularity: 'MONTHLY' as const,
    metric: 'UnblendedCost',
    filter: null,
    predictionInterval: 80,
  };

  given('[case1] a forecast with a total and one interval point', () => {
    const result: SdkAwsGetCostForecastCommandOutput = {
      $metadata: {},
      Total: { Amount: '18.90', Unit: 'USD' },
      ForecastResultsByTime: [
        {
          TimePeriod: { Start: '2026-07-15', End: '2026-08-01' },
          MeanValue: '18.90',
          PredictionIntervalLowerBound: '17.10',
          PredictionIntervalUpperBound: '21.40',
        },
      ],
    };

    then('it maps the total and the mean + confidence band', () => {
      const report = castIntoDeclaredAwsCostReportSpendForecast({
        unique: baseUnique,
        result,
      });
      expect(report.total?.amount).toBe('18.90');
      expect(report.total?.unit).toBe('USD');
      expect(report.points).toHaveLength(1);
      const point = report.points?.[0];
      expect(point?.mean).toBe('18.90');
      expect(point?.lower).toBe('17.10');
      expect(point?.upper).toBe('21.40');
      expect(point?.unit).toBe('USD');
      expect(point?.range).toEqual({
        since: asIsoTimeStamp('2026-07-15'),
        until: asIsoTimeStamp('2026-08-01'),
      });
    });

    then('it preserves the unique key fields', () => {
      const report = castIntoDeclaredAwsCostReportSpendForecast({
        unique: baseUnique,
        result,
      });
      expect(report.range).toEqual(baseUnique.range);
      expect(report.granularity).toBe('MONTHLY');
      expect(report.metric).toBe('UnblendedCost');
      expect(report.filter).toBeNull();
      expect(report.predictionInterval).toBe(80);
    });

    then('it matches the contract snapshot', () => {
      expect(
        castIntoDeclaredAwsCostReportSpendForecast({
          unique: baseUnique,
          result,
        }),
      ).toMatchSnapshot();
    });
  });

  given('[case2] a forecast with no results', () => {
    const result: SdkAwsGetCostForecastCommandOutput = {
      $metadata: {},
      ForecastResultsByTime: [],
    };

    then('it reads to a zero total and empty points', () => {
      const report = castIntoDeclaredAwsCostReportSpendForecast({
        unique: baseUnique,
        result,
      });
      expect(report.total?.amount).toBe('0');
      expect(report.points).toHaveLength(0);
    });

    then('it matches the contract snapshot', () => {
      expect(
        castIntoDeclaredAwsCostReportSpendForecast({
          unique: baseUnique,
          result,
        }),
      ).toMatchSnapshot();
    });
  });
});
