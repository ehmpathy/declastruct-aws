import {
  GetCostAndUsageCommand,
  type Granularity,
  type ResultByTime,
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
import { DeclaredAwsCostReportSpendObserved } from '@src/domain.objects/DeclaredAwsCostReportSpendObserved';

import { asAwsCostDateStamp } from '../costReport/asAwsCostDateStamp';
import { asAwsCostReportFilterExpression } from '../costReport/asAwsCostReportFilterExpression';
import { assertCostReportRangeValid } from '../costReport/assertCostReportRangeValid';
import { castToCostReportCacheKey } from '../costReport/castToCostReportCacheKey';
import { getAllAwsCostExplorerPages } from '../costReport/getAllAwsCostExplorerPages';
import { getCostReportCache } from '../costReport/getCostReportCache';
import { asAwsObservedGroupDefinition } from './asAwsObservedGroupDefinition';
import { asAwsObservedMetric } from './asAwsObservedMetric';
import { castIntoDeclaredAwsCostReportSpendObserved } from './castIntoDeclaredAwsCostReportSpendObserved';

/**
 * .what = reads an observed-spend report via GetCostAndUsage
 * .why = answers "where does our budget go?" — composition (groups) + trend
 *        (buckets) in one read; pages via NextPageToken, then casts
 * .note = read-only; there is no set/del. wrapped with the on-disk cache below
 */
const _getOneCostReportSpendObserved = asProcedure(
  async (
    input: {
      by: {
        unique: RefByUnique<typeof DeclaredAwsCostReportSpendObserved>;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsCostReportSpendObserved>> => {
    const { range, granularity, groupBy, filter, metric } = input.by.unique;

    // fail loud early on a reversed/empty range, before the billed request
    assertCostReportRangeValid({ range });

    // fail loud early on an unknown metric name, before the billed request
    const metricValidated = asAwsObservedMetric({ metric });

    // declare the client (pinned to us-east-1)
    const client = getAwsCostExplorerClient();

    try {
      // page through all results; each page adds trend buckets (the shared paginator
      // owns the token-cursor advance, so it cannot be forgotten here)
      const { items: resultsByTime } = await getAllAwsCostExplorerPages({
        loadPage: (nextPageToken) =>
          client.send(
            new GetCostAndUsageCommand({
              TimePeriod: {
                Start: asAwsCostDateStamp({ stamp: range.since }),
                End: asAwsCostDateStamp({ stamp: range.until }),
              },
              // aws boundary: the SDK types Granularity as its own string-enum while
              // our @unique field is a plain string. removal path: when the domain
              // field is typed to the SDK's `Granularity` (or a shared string-literal
              // union the SDK accepts), this cast drops
              Granularity: granularity as Granularity,
              Metrics: [metricValidated],
              GroupBy: [asAwsObservedGroupDefinition({ groupBy })],
              Filter: asAwsCostReportFilterExpression({ filter }),
              NextPageToken: nextPageToken,
            }),
          ),
        getItems: (response): ResultByTime[] => response.ResultsByTime ?? [],
        getNextToken: (response) => response.NextPageToken,
      });

      return castIntoDeclaredAwsCostReportSpendObserved({
        unique: { range, granularity, groupBy, filter, metric },
        result: { $metadata: {}, ResultsByTime: resultsByTime },
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      throw new HelpfulError('aws.getOneCostReportSpendObserved error', {
        cause: error,
        context: { errorName: error.name, errorMessage: error.message, input },
      });
    }
  },
);

/**
 * .what = the cost-report read, wrapped with the shared on-disk cache
 * .why = a cost explorer read costs $0.01/request and re-bills on every plan; the
 *        cache serves repeat reads from disk within the ttl, keyed on the report's
 *        @unique identity (the query) scoped by account+region (so one account's
 *        cached spend is never served for another)
 */
export const getOneCostReportSpendObserved = withSimpleCacheAsync(
  _getOneCostReportSpendObserved,
  {
    cache: getCostReportCache(),
    serialize: {
      // .note = the shared key builder folds in account + region (not just the
      //         query), so one account's cached spend is never served for another
      key: (input, context) =>
        castToCostReportCacheKey({
          procedure: { name: 'getOneCostReportSpendObserved', version: 'v1' },
          unique: input.by.unique,
          context,
        }),
      value: (output) => serialize(output),
    },
    deserialize: {
      value: (cached) =>
        assure(
          DeclaredAwsCostReportSpendObserved.as(JSON.parse(cached)),
          hasReadonly({ of: DeclaredAwsCostReportSpendObserved }),
        ),
    },
  },
);
