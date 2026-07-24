import {
  GetCostForecastCommand,
  type Granularity,
} from '@aws-sdk/client-cost-explorer';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  hasReadonly,
  type RefByUnique,
  serialize,
} from 'domain-objects';
import { HelpfulError } from 'helpful-errors';
import { assure } from 'type-fns';
import type { VisualogicContext } from 'visualogic';
import { withSimpleCacheAsync } from 'with-simple-cache';

import { getAwsCostExplorerClient } from '@src/access/sdks/getAwsCostExplorerClient';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCostReportSpendForecast } from '@src/domain.objects/DeclaredAwsCostReportSpendForecast';

import { asAwsCostDateStamp } from '../costReport/asAwsCostDateStamp';
import { asAwsCostReportFilterExpression } from '../costReport/asAwsCostReportFilterExpression';
import { assertCostReportRangeValid } from '../costReport/assertCostReportRangeValid';
import { castToCostReportCacheKey } from '../costReport/castToCostReportCacheKey';
import { getCostReportCache } from '../costReport/getCostReportCache';
import { isTolerableAwsCostReportError } from '../costReport/isTolerableAwsCostReportError';
import { asAwsForecastMetric } from './asAwsForecastMetric';
import { assertForecastHorizonValid } from './assertForecastHorizonValid';
import { assertForecastStartFuture } from './assertForecastStartFuture';
import { assertPredictionIntervalValid } from './assertPredictionIntervalValid';
import { castIntoDeclaredAwsCostReportSpendForecast } from './castIntoDeclaredAwsCostReportSpendForecast';

/**
 * .what = reads a projected-spend report via GetCostForecast
 * .why = answers "where is spend expected to go?" — mean + confidence band; a
 *        single (non-paged) read, then casts
 * .note = read-only; there is no set/del. fails with DataUnavailable on an
 *         account with too little history. wrapped with the on-disk cache below
 */
const _getOneCostReportSpendForecast = asProcedure(
  async (
    input: {
      by: {
        unique: RefByUnique<typeof DeclaredAwsCostReportSpendForecast>;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsCostReportSpendForecast>> => {
    const { range, granularity, metric, filter, predictionInterval } =
      input.by.unique;

    // fail loud early on a reversed/empty range, before the billed request
    assertCostReportRangeValid({ range });

    // fail loud early on a past start — GetCostForecast rejects a `since` before today
    assertForecastStartFuture({ range });

    // fail loud early on an over-long horizon (DAILY <=3mo, MONTHLY <=18mo)
    assertForecastHorizonValid({ range, granularity });

    // fail loud early on an out-of-bound confidence level (AWS accepts 51-99)
    assertPredictionIntervalValid({ predictionInterval });

    // declare the client (pinned to us-east-1)
    const client = getAwsCostExplorerClient();

    try {
      const response = await client.send(
        new GetCostForecastCommand({
          TimePeriod: {
            Start: asAwsCostDateStamp({ stamp: range.since }),
            End: asAwsCostDateStamp({ stamp: range.until }),
          },
          // aws boundary: the SDK types Granularity as its own string-enum while
          // our @unique field is a plain string. removal path: when the domain
          // field is typed to the SDK's `Granularity` (or a shared string-literal
          // union the SDK accepts), this cast drops
          Granularity: granularity as Granularity,
          Metric: asAwsForecastMetric({ metric }),
          Filter: asAwsCostReportFilterExpression({ filter }),
          PredictionIntervalLevel: predictionInterval,
        }),
      );

      return castIntoDeclaredAwsCostReportSpendForecast({
        unique: { range, granularity, metric, filter, predictionInterval },
        result: response,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // a young/low-spend account lacks the history GetCostForecast needs. this is a
      // legitimate "no forecast yet" state, NOT an error — symmetric with the observed
      // report's empty-result edgecase (empty buckets, not a throw). degrade to an empty
      // forecast (zero total, no points) so a report read never aborts a multi-resource
      // plan. it is logged LOUD (observable, not a silent swallow) and the condition is
      // scoped to exactly this one allowlisted exception — every other error still throws
      if (
        isTolerableAwsCostReportError({
          error,
          tolerable: ['DataUnavailableException'],
        })
      ) {
        context.log.warn(
          'getOneCostReportSpendForecast: DataUnavailable — the account has too little cost history to project; returns an empty forecast (no points) rather than a throw',
          { errorName: error.name, errorMessage: error.message, input },
        );
        return castIntoDeclaredAwsCostReportSpendForecast({
          unique: { range, granularity, metric, filter, predictionInterval },
          result: {
            $metadata: {},
            Total: undefined,
            ForecastResultsByTime: [],
          },
        });
      }

      throw new HelpfulError('aws.getOneCostReportSpendForecast error', {
        cause: error,
        context: { errorName: error.name, errorMessage: error.message, input },
      });
    }
  },
);

/**
 * .what = the forecast read, wrapped with the shared on-disk cache
 * .why = a cost explorer read costs $0.01/request and re-bills on every plan; the
 *        cache serves repeat reads from disk within the ttl, keyed on the report's
 *        @unique identity (the query) scoped by account+region (so one account's
 *        cached spend is never served for another)
 * .note = the cache wraps the WHOLE read — the DataUnavailable degrade above too. so an
 *         empty "no history yet" forecast is cached for the full ttl (3h) like any real
 *         answer — once an account accrues enough history, the cache can still serve the
 *         empty forecast until the ttl lapses. low impact given the short ttl; noted so it
 *         is not a surprise
 */
export const getOneCostReportSpendForecast = withSimpleCacheAsync(
  _getOneCostReportSpendForecast,
  {
    cache: getCostReportCache(),
    serialize: {
      // .note = the shared key builder folds in account + region (see its .why:
      //         an account-agnostic query key would serve account A's cache to account B)
      key: (input, context) =>
        castToCostReportCacheKey({
          procedure: { name: 'getOneCostReportSpendForecast', version: 'v1' },
          unique: input.by.unique,
          context,
        }),
      value: (output) => serialize(output),
    },
    deserialize: {
      value: (cached) =>
        assure(
          DeclaredAwsCostReportSpendForecast.as(JSON.parse(cached)),
          hasReadonly({ of: DeclaredAwsCostReportSpendForecast }),
        ),
    },
  },
);
