import {
  GetCostAndUsageWithResourcesCommand,
  type GetCostAndUsageWithResourcesCommandOutput,
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
import { DeclaredAwsCostReportSpendObservedByResource } from '@src/domain.objects/DeclaredAwsCostReportSpendObservedByResource';

import { isResourceLevelDataOptInDisabledError } from '../costExplorerPreference/isResourceLevelDataOptInDisabledError';
import { asAwsCostDateStamp } from '../costReport/asAwsCostDateStamp';
import { asAwsCostReportFilterExpression } from '../costReport/asAwsCostReportFilterExpression';
import { assertCostReportRangeValid } from '../costReport/assertCostReportRangeValid';
import { castToCostReportCacheKey } from '../costReport/castToCostReportCacheKey';
import { getAllAwsCostExplorerPages } from '../costReport/getAllAwsCostExplorerPages';
import { getCostReportCache } from '../costReport/getCostReportCache';
import { asAwsObservedMetric } from '../costReportSpendObserved/asAwsObservedMetric';
import { assertResourceLevelRangeWithinRetention } from './assertResourceLevelRangeWithinRetention';
import { castIntoDeclaredAwsCostReportSpendObservedByResource } from './castIntoDeclaredAwsCostReportSpendObservedByResource';

/**
 * .what = reads a by-RESOURCE_ID observed-spend report via GetCostAndUsageWithResources
 * .why = answers "which exact resource (e.g. EC2 instance) cost what?" — the per-resource
 *        dollar breakdown Cost Explorer serves natively (no price inference). pages via
 *        NextPageToken, then casts. always grouped by RESOURCE_ID (that IS the report)
 * .note = read-only; there is no set/del. requires the FREE "resource-level data at daily
 *         granularity" opt-in — when off, the read DEGRADES to an empty report (never a
 *         plan-abort throw, same blast-radius discipline as the rightsize report). wrapped
 *         with the on-disk cache below
 */
const _getOneCostReportSpendObservedByResource = asProcedure(
  async (
    input: {
      by: {
        unique: RefByUnique<
          typeof DeclaredAwsCostReportSpendObservedByResource
        >;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<
    HasReadonly<typeof DeclaredAwsCostReportSpendObservedByResource>
  > => {
    const { range, granularity, filter, metric } = input.by.unique;

    // fail loud early on a reversed/empty range, before the billed request
    assertCostReportRangeValid({ range });

    // fail loud early on a range older than the ~14-day resource-level retention window
    assertResourceLevelRangeWithinRetention({ range });

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
            new GetCostAndUsageWithResourcesCommand({
              TimePeriod: {
                Start: asAwsCostDateStamp({ stamp: range.since }),
                End: asAwsCostDateStamp({ stamp: range.until }),
              },
              // aws boundary: the SDK types Granularity as its own string-enum while our
              // @unique field is a plain string. removal path: when the domain field is
              // typed to the SDK's `Granularity`, this cast drops
              Granularity: granularity as Granularity,
              Metrics: [metricValidated],
              // the whole point of this report: group by the resource id
              GroupBy: [{ Type: 'DIMENSION', Key: 'RESOURCE_ID' }],
              // filter is REQUIRED by this api (must pin a single SERVICE); it is a
              // non-null field on the domain object, so the expression is always defined
              Filter: asAwsCostReportFilterExpression({ filter }),
              NextPageToken: nextPageToken,
            }),
          ),
        getItems: (
          response: GetCostAndUsageWithResourcesCommandOutput,
        ): ResultByTime[] => response.ResultsByTime ?? [],
        getNextToken: (response) => response.NextPageToken,
      });

      return castIntoDeclaredAwsCostReportSpendObservedByResource({
        unique: { range, granularity, filter, metric },
        result: { $metadata: {}, ResultsByTime: resultsByTime },
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // the free "resource-level data at daily granularity" opt-in is off (GetCostAndUsageWithResources
      // raises an AccessDeniedException whose message names the resource-level opt-in). do NOT
      // throw — a report read runs at PLAN time, and a throw aborts the WHOLE multi-resource
      // plan (blast radius). instead degrade to an
      // empty report (symmetric with the rightsize + forecast degrades), logged LOUD with a
      // pointer to the declared precondition. the fail-loud guidance lives on
      // DeclaredAwsCostExplorerPreference's set (the APPLY path), so plan stays green
      if (isResourceLevelDataOptInDisabledError({ error })) {
        context.log.warn(
          'getOneCostReportSpendObservedByResource: the resource-level data opt-in is off; returns an empty report (no per-resource rows) rather than a throw. provision DeclaredAwsCostExplorerPreference (feature=resourceLevelData) + enable it in the payer console (free daily tier) to populate',
          { errorName: error.name, errorMessage: error.message, input },
        );
        return castIntoDeclaredAwsCostReportSpendObservedByResource({
          unique: { range, granularity, filter, metric },
          result: { $metadata: {}, ResultsByTime: [] },
        });
      }

      throw new HelpfulError(
        'aws.getOneCostReportSpendObservedByResource error',
        {
          cause: error,
          context: {
            errorName: error.name,
            errorMessage: error.message,
            input,
          },
        },
      );
    }
  },
);

/**
 * .what = the by-resource read, wrapped with the shared on-disk cache
 * .why = a cost explorer read costs $0.01/request and re-bills on every plan; the
 *        cache serves repeat reads from disk within the ttl, keyed on the report's
 *        @unique identity (the query) scoped by account+region (so one account's
 *        cached spend is never served for another)
 */
export const getOneCostReportSpendObservedByResource = withSimpleCacheAsync(
  _getOneCostReportSpendObservedByResource,
  {
    cache: getCostReportCache(),
    serialize: {
      // .note = the shared key builder folds in account + region (not just the query),
      //         so one account's cached spend is never served for another
      key: (input, context) =>
        castToCostReportCacheKey({
          procedure: {
            name: 'getOneCostReportSpendObservedByResource',
            version: 'v1',
          },
          unique: input.by.unique,
          context,
        }),
      value: (output) => serialize(output),
    },
    deserialize: {
      value: (cached) =>
        assure(
          DeclaredAwsCostReportSpendObservedByResource.as(JSON.parse(cached)),
          hasReadonly({ of: DeclaredAwsCostReportSpendObservedByResource }),
        ),
    },
  },
);
