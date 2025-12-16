import {
  CloudWatchLogsClient,
  GetQueryResultsCommand,
  QueryStatus,
  StartQueryCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  hasReadonly,
  type RefByUnique,
} from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsLogGroupReportDistOfPattern } from '@src/domain.objects/DeclaredAwsLogGroupReportDistOfPattern';

import { castIntoDeclaredAwsLogGroupReportDistOfPattern } from './castIntoDeclaredAwsLogGroupReportDistOfPattern';

/**
 * .what = sleeps for the specified duration
 * .why = used for polling with backoff
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * .what = gets a pattern distribution report from CloudWatch Logs Insights
 * .why = enables declarative analysis of log patterns and their sizes
 *
 * .note
 *   - uses StartQuery + GetQueryResults with polling
 *   - query timeout is 60 minutes max
 */
export const getOneLogGroupReportDistOfPattern = asProcedure(
  async (
    input: {
      by: {
        unique: RefByUnique<typeof DeclaredAwsLogGroupReportDistOfPattern>;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsLogGroupReportDistOfPattern>> => {
    const { logGroups, range, pattern, filter, limit } = input.by.unique;

    // resolve log group names from refs
    const logGroupNames = logGroups.map((ref) => ref.name);

    // build CloudWatch Logs Insights query
    const query = [
      `fields ${pattern}`,
      filter ? `| filter ${filter}` : '',
      `| stats count(*) as frequency,`,
      `        sum(strlen(${pattern})) as totalBytes,`,
      `        avg(strlen(${pattern})) as avgBytes`,
      `    by ${pattern}`,
      `| sort frequency desc`,
      `| limit ${limit ?? 1000}`,
    ]
      .filter(Boolean)
      .join('\n');

    // declare the client
    const logs = new CloudWatchLogsClient({
      region: context.aws.credentials.region,
    });

    try {
      // start the query
      const startResponse = await logs.send(
        new StartQueryCommand({
          logGroupNames,
          startTime: Math.floor(new Date(range.since).getTime() / 1000),
          endTime: Math.floor(new Date(range.until).getTime() / 1000),
          queryString: query,
        }),
      );

      // fail fast if query id is missing
      if (!startResponse.queryId)
        UnexpectedCodePathError.throw('StartQuery returned no queryId', {
          input,
        });

      // poll for results with exponential backoff
      let delay = 1000;
      const maxDelay = 10000;
      const maxAttempts = 120;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // get query results
        const results = await logs.send(
          new GetQueryResultsCommand({ queryId: startResponse.queryId }),
        );

        // check status
        if (results.status === QueryStatus.Complete) {
          return castIntoDeclaredAwsLogGroupReportDistOfPattern({
            unique: input.by.unique,
            results,
          });
        }

        // fail on terminal statuses
        if (results.status === QueryStatus.Failed)
          throw new HelpfulError('CloudWatch Logs Insights query failed', {
            queryId: startResponse.queryId,
            status: results.status,
          });

        if (results.status === QueryStatus.Cancelled)
          throw new HelpfulError('CloudWatch Logs Insights query cancelled', {
            queryId: startResponse.queryId,
            status: results.status,
          });

        if (results.status === QueryStatus.Timeout)
          throw new HelpfulError('CloudWatch Logs Insights query timed out', {
            queryId: startResponse.queryId,
            status: results.status,
          });

        // wait before next poll
        await sleep(delay);
        delay = Math.min(delay * 1.5, maxDelay);
      }

      // max attempts exceeded
      throw new HelpfulError(
        'CloudWatch Logs Insights query polling exceeded max attempts',
        { queryId: startResponse.queryId, maxAttempts },
      );
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (error instanceof HelpfulError) throw error;

      // handle log group not found - return empty report so declastruct sees [KEEP]
      if (error.name === 'ResourceNotFoundException')
        return assure(
          DeclaredAwsLogGroupReportDistOfPattern.as({
            ...input.by.unique,
            scannedBytes: 0,
            matchedEvents: 0,
            rows: [],
          }),
          hasReadonly({ of: DeclaredAwsLogGroupReportDistOfPattern }),
        );

      throw new HelpfulError('aws.getOneLogGroupReportDistOfPattern error', {
        cause: error,
        context: { input },
      });
    }
  },
);
