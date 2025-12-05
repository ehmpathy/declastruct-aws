import { GetMetricDataCommandOutput as SdkAwsGetMetricDataCommandOutput } from '@aws-sdk/client-cloudwatch';
import { UniDateTimeRange } from '@ehmpathy/uni-time';
import { HasReadonly, hasReadonly } from 'domain-objects';
import { assure } from 'type-fns';

import {
  DeclaredAwsLogGroupFilter,
  DeclaredAwsLogGroupReportCostOfIngestion,
  DeclaredAwsLogGroupReportCostOfIngestionRow,
} from '../../domain.objects/DeclaredAwsLogGroupReportCostOfIngestion';

/**
 * .what = cost per GB for CloudWatch Logs ingestion
 * .note = varies by region, using us-east-1 price as default
 */
const COST_PER_GB_USD = 0.5;

/**
 * .what = bytes per gigabyte
 */
const BYTES_PER_GB = 1024 ** 3;

/**
 * .what = input for castIntoDeclaredAwsLogGroupReportCostOfIngestion
 * .why = combines query parameters with resolved log groups and metrics
 */
export interface CastIntoDeclaredAwsLogGroupReportCostOfIngestionInput {
  unique: {
    logGroupFilter: DeclaredAwsLogGroupFilter;
    range: UniDateTimeRange;
  };
  logGroupNames: string[];
  metrics: SdkAwsGetMetricDataCommandOutput;
}

/**
 * .what = transforms CloudWatch Metrics response into domain object
 * .why = maps AWS response shape to DeclaredAwsLogGroupReportCostOfIngestion
 */
export const castIntoDeclaredAwsLogGroupReportCostOfIngestion = (
  input: CastIntoDeclaredAwsLogGroupReportCostOfIngestionInput,
): HasReadonly<typeof DeclaredAwsLogGroupReportCostOfIngestion> => {
  const { unique, logGroupNames, metrics } = input;

  // build a map of metric id to values
  const metricValues = new Map<string, number>();
  for (const result of metrics.MetricDataResults ?? []) {
    if (result.Id && result.Values && result.Values.length > 0) {
      // sum all values (in case of multiple datapoints)
      const sum = result.Values.reduce((a, b) => a + b, 0);
      metricValues.set(result.Id, sum);
    }
  }

  // build rows for each log group
  const unsortedRows: DeclaredAwsLogGroupReportCostOfIngestionRow[] = [];
  for (let i = 0; i < logGroupNames.length; i++) {
    const logGroupName = logGroupNames[i]!;
    const bytesId = `bytes_${i}`;
    const eventsId = `events_${i}`;

    const ingestedBytes = metricValues.get(bytesId) ?? 0;
    const logEvents = metricValues.get(eventsId) ?? 0;
    const estimatedCostUsd = (ingestedBytes / BYTES_PER_GB) * COST_PER_GB_USD;

    unsortedRows.push(
      DeclaredAwsLogGroupReportCostOfIngestionRow.as({
        logGroupName,
        ingestedBytes,
        logEvents,
        estimatedCostUsd,
        percentOfTotal: { bytes: 0, events: 0 }, // will calculate below
      }),
    );
  }

  // calculate totals
  const totalIngestedBytes = unsortedRows.reduce(
    (sum, row) => sum + row.ingestedBytes,
    0,
  );
  const totalLogEvents = unsortedRows.reduce(
    (sum, row) => sum + row.logEvents,
    0,
  );
  const totalEstimatedCostUsd =
    (totalIngestedBytes / BYTES_PER_GB) * COST_PER_GB_USD;

  // calculate percentOfTotal for each row
  const rows = unsortedRows.map((row) =>
    DeclaredAwsLogGroupReportCostOfIngestionRow.as({
      ...row,
      percentOfTotal: {
        bytes:
          totalIngestedBytes > 0
            ? (row.ingestedBytes / totalIngestedBytes) * 100
            : 0,
        events: totalLogEvents > 0 ? (row.logEvents / totalLogEvents) * 100 : 0,
      },
    }),
  );

  // sort by ingestedBytes descending
  rows.sort((a, b) => b.ingestedBytes - a.ingestedBytes);

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsLogGroupReportCostOfIngestion.as({
      logGroupFilter: unique.logGroupFilter,
      range: unique.range,
      totalIngestedBytes,
      totalLogEvents,
      totalEstimatedCostUsd,
      rows,
    }),
    // note: hasReadonly ensures all `public static readonly` fields are defined on the object
    // this validates that AWS returned all expected readonly attributes after read
    hasReadonly({ of: DeclaredAwsLogGroupReportCostOfIngestion }),
  );
};
