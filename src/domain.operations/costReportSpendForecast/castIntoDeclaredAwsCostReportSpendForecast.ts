import type { GetCostForecastCommandOutput as SdkAwsGetCostForecastCommandOutput } from '@aws-sdk/client-cost-explorer';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { asIsoTimeStamp } from 'iso-time';
import { assure } from 'type-fns';

import { DeclaredAwsCostAmount } from '@src/domain.objects/DeclaredAwsCostAmount';
import type { DeclaredAwsCostReportFilter } from '@src/domain.objects/DeclaredAwsCostReportFilter';
import {
  DeclaredAwsCostReportSpendForecast,
  DeclaredAwsCostReportSpendForecastPoint,
} from '@src/domain.objects/DeclaredAwsCostReportSpendForecast';

/**
 * .what = transforms a GetCostForecast response into the domain report
 * .why = maps AWS Total + ForecastResultsByTime[] into the forecast shape,
 *        amounts kept as strings
 */
export const castIntoDeclaredAwsCostReportSpendForecast = (input: {
  unique: {
    range: DeclaredAwsCostReportSpendForecast['range'];
    granularity: DeclaredAwsCostReportSpendForecast['granularity'];
    metric: string;
    filter: DeclaredAwsCostReportFilter | null;
    predictionInterval: number;
  };
  result: SdkAwsGetCostForecastCommandOutput;
}): HasReadonly<typeof DeclaredAwsCostReportSpendForecast> => {
  const { unique, result } = input;

  // the forecast total (mean over the whole window)
  const total = DeclaredAwsCostAmount.as({
    amount: result.Total?.Amount ?? '0',
    unit: result.Total?.Unit ?? 'USD',
  });

  // one point per forecast granule
  const points = (result.ForecastResultsByTime ?? []).map((byTime) => {
    const start =
      byTime.TimePeriod?.Start ??
      UnexpectedCodePathError.throw(
        'ForecastResultsByTime lacks TimePeriod.Start',
        { byTime },
      );
    const end =
      byTime.TimePeriod?.End ??
      UnexpectedCodePathError.throw(
        'ForecastResultsByTime lacks TimePeriod.End',
        { byTime },
      );

    return DeclaredAwsCostReportSpendForecastPoint.as({
      range: {
        since: asIsoTimeStamp(start),
        until: asIsoTimeStamp(end),
      },
      mean: byTime.MeanValue ?? '0',
      lower: byTime.PredictionIntervalLowerBound ?? '0',
      upper: byTime.PredictionIntervalUpperBound ?? '0',
      unit: total.unit,
    });
  });

  // cast and assure all readonly fields are present
  return assure(
    DeclaredAwsCostReportSpendForecast.as({
      range: unique.range,
      granularity: unique.granularity,
      metric: unique.metric,
      filter: unique.filter,
      predictionInterval: unique.predictionInterval,
      total,
      points,
    }),
    hasReadonly({ of: DeclaredAwsCostReportSpendForecast }),
  );
};
