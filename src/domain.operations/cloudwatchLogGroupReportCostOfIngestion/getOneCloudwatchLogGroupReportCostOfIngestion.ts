import {
  CloudWatchClient,
  GetMetricDataCommand,
  type MetricDataQuery,
} from '@aws-sdk/client-cloudwatch';
import { asProcedure } from 'as-procedure';
import type { HasReadonly, RefByUnique } from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsCloudwatchLogGroupReportCostOfIngestion } from '@src/domain.objects/DeclaredAwsCloudwatchLogGroupReportCostOfIngestion';
import { getAllCloudwatchLogGroups } from '@src/domain.operations/cloudwatchLogGroup/getAllCloudwatchLogGroups';
import { getOneCloudwatchLogGroup } from '@src/domain.operations/cloudwatchLogGroup/getOneCloudwatchLogGroup';

import { castIntoDeclaredAwsCloudwatchLogGroupReportCostOfIngestion } from './castIntoDeclaredAwsCloudwatchLogGroupReportCostOfIngestion';

/**
 * .what = max metrics per GetMetricData request
 * .note = AWS limit is 500
 */
const MAX_METRICS_PER_REQUEST = 500;

/**
 * .what = gets a cost of ingestion report from CloudWatch Metrics
 * .why = enables declarative understanding of CloudWatch Logs costs
 *
 * .note
 *   - uses IncomingBytes and IncomingLogEvents metrics from AWS/Logs namespace
 *   - cost calculation uses $0.50/GB ingestion rate
 */
export const getOneCloudwatchLogGroupReportCostOfIngestion = asProcedure(
  async (
    input: {
      by: {
        unique: RefByUnique<
          typeof DeclaredAwsCloudwatchLogGroupReportCostOfIngestion
        >;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<
    HasReadonly<typeof DeclaredAwsCloudwatchLogGroupReportCostOfIngestion>
  > => {
    const { logGroupFilter, range } = input.by.unique;

    // resolve log groups from filter
    const logGroupNames = await (async () => {
      if ('prefix' in logGroupFilter) {
        const logGroups = await getAllCloudwatchLogGroups(
          { by: { prefix: logGroupFilter.prefix } },
          context,
        );
        return logGroups.map((lg) => lg.name);
      }
      if ('names' in logGroupFilter) {
        // verify each log group exists
        const results = await Promise.all(
          logGroupFilter.names.map(async (name) => {
            const logGroup = await getOneCloudwatchLogGroup(
              { by: { unique: { name } } },
              context,
            );
            return logGroup ? logGroup.name : null;
          }),
        );
        return results.filter((name): name is string => name !== null);
      }
      UnexpectedCodePathError.throw('invalid logGroupFilter', {
        logGroupFilter,
      });
    })();

    // return empty report if no log groups
    if (logGroupNames.length === 0) {
      return castIntoDeclaredAwsCloudwatchLogGroupReportCostOfIngestion({
        unique: input.by.unique,
        logGroupNames: [],
        metrics: { $metadata: {}, MetricDataResults: [] },
      });
    }

    // build metric queries for each log group
    const metricQueries: MetricDataQuery[] = [];
    for (let i = 0; i < logGroupNames.length; i++) {
      const logGroupName = logGroupNames[i]!;

      // IncomingBytes metric
      metricQueries.push({
        Id: `bytes_${i}`,
        MetricStat: {
          Metric: {
            Namespace: 'AWS/Logs',
            MetricName: 'IncomingBytes',
            Dimensions: [{ Name: 'LogGroupName', Value: logGroupName }],
          },
          Period: Math.max(
            60,
            Math.ceil(
              (new Date(range.until).getTime() -
                new Date(range.since).getTime()) /
                1000,
            ),
          ),
          Stat: 'Sum',
        },
      });

      // IncomingLogEvents metric
      metricQueries.push({
        Id: `events_${i}`,
        MetricStat: {
          Metric: {
            Namespace: 'AWS/Logs',
            MetricName: 'IncomingLogEvents',
            Dimensions: [{ Name: 'LogGroupName', Value: logGroupName }],
          },
          Period: Math.max(
            60,
            Math.ceil(
              (new Date(range.until).getTime() -
                new Date(range.since).getTime()) /
                1000,
            ),
          ),
          Stat: 'Sum',
        },
      });
    }

    // declare the client
    const cloudwatch = new CloudWatchClient({
      region: context.aws.credentials.region,
    });

    try {
      // batch metric queries if needed
      const allResults: Array<{
        Id?: string;
        Values?: number[];
      }> = [];

      for (let i = 0; i < metricQueries.length; i += MAX_METRICS_PER_REQUEST) {
        const batch = metricQueries.slice(i, i + MAX_METRICS_PER_REQUEST);

        const response = await cloudwatch.send(
          new GetMetricDataCommand({
            MetricDataQueries: batch,
            StartTime: new Date(range.since),
            EndTime: new Date(range.until),
          }),
        );

        if (response.MetricDataResults) {
          allResults.push(...response.MetricDataResults);
        }
      }

      return castIntoDeclaredAwsCloudwatchLogGroupReportCostOfIngestion({
        unique: input.by.unique,
        logGroupNames,
        metrics: { $metadata: {}, MetricDataResults: allResults },
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      throw new HelpfulError(
        'aws.getOneCloudwatchLogGroupReportCostOfIngestion error',
        {
          cause: error,
          context: { input },
        },
      );
    }
  },
);
