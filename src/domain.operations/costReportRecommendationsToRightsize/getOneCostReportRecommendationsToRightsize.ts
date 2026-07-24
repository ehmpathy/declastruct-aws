import {
  GetRightsizingRecommendationCommand,
  type GetRightsizingRecommendationCommandOutput,
  type RecommendationTarget,
  type RightsizingRecommendation,
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
import { DeclaredAwsCostReportRecommendationsToRightsize } from '@src/domain.objects/DeclaredAwsCostReportRecommendationsToRightsize';

import { isRightsizeOptInDisabledError } from '../costExplorerPreference/isRightsizeOptInDisabledError';
import { asAwsCostReportFilterExpression } from '../costReport/asAwsCostReportFilterExpression';
import { castToCostReportCacheKey } from '../costReport/castToCostReportCacheKey';
import { getAllAwsCostExplorerPages } from '../costReport/getAllAwsCostExplorerPages';
import { getCostReportCache } from '../costReport/getCostReportCache';
import { assertRightsizeServiceValid } from './assertRightsizeServiceValid';
import { castIntoDeclaredAwsCostReportRecommendationsToRightsize } from './castIntoDeclaredAwsCostReportRecommendationsToRightsize';

/**
 * .what = reads a rightsize-savings report via the aws rightsize-recommendation api
 * .why = answers "where can we save money?" — idle/oversized EC2 with per-box
 *        savings; pages the recommendations, keeps the first page's summary, casts
 * .note = read-only; there is no set/del. service is 'AmazonEC2' only today.
 *         wrapped with the on-disk cache below
 */
const _getOneCostReportRecommendationsToRightsize = asProcedure(
  async (
    input: {
      by: {
        unique: RefByUnique<
          typeof DeclaredAwsCostReportRecommendationsToRightsize
        >;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<
    HasReadonly<typeof DeclaredAwsCostReportRecommendationsToRightsize>
  > => {
    const { service, recommendationTarget, benefitsConsidered, filter } =
      input.by.unique;

    // fail loud early on an unsupported service (AWS accepts only AmazonEC2 today),
    // before the billed request — no silent wrong-service read
    assertRightsizeServiceValid({ service });

    // declare the client (pinned to us-east-1)
    const client = getAwsCostExplorerClient();

    try {
      // page through recommendations; the summary + metadata ride on each page, so the
      // shared paginator returns the first response too (and owns the cursor advance)
      const { items: recommendations, firstResponse } =
        await getAllAwsCostExplorerPages({
          loadPage: (nextPageToken) =>
            client.send(
              new GetRightsizingRecommendationCommand({
                Service: service,
                Configuration: {
                  // aws boundary: the SDK types RecommendationTarget as its own
                  // string-enum while our @unique field is a plain string. removal
                  // path: when the domain field is typed to the SDK's
                  // `RecommendationTarget` (or a shared string-literal union the SDK
                  // accepts), this cast drops
                  RecommendationTarget:
                    recommendationTarget as RecommendationTarget,
                  BenefitsConsidered: benefitsConsidered,
                },
                Filter: asAwsCostReportFilterExpression({ filter }),
                NextPageToken: nextPageToken,
              }),
            ),
          getItems: (
            response: GetRightsizingRecommendationCommandOutput,
          ): RightsizingRecommendation[] =>
            response.RightsizingRecommendations ?? [],
          getNextToken: (response) => response.NextPageToken,
        });

      const report = castIntoDeclaredAwsCostReportRecommendationsToRightsize({
        unique: { service, recommendationTarget, benefitsConsidered, filter },
        result: {
          $metadata: {},
          Summary: firstResponse?.Summary,
          Metadata: firstResponse?.Metadata,
          RightsizingRecommendations: recommendations,
        },
      });

      // log loud per rec whose savings AWS returned in an unreadable shape. the cast
      // degrades such a rec's savings to null (not a false zero, not a plan-abort throw);
      // this warn makes the degrade observable so it is never silently swallowed
      for (const item of report.recommendations ?? [])
        if (item.estimatedMonthlySavings === null)
          context.log.warn(
            'getOneCostReportRecommendationsToRightsize: a rec has an unreadable savings shape; reported as null (savings unknown), not a false zero',
            { resourceId: item.resourceId, action: item.action },
          );

      return report;
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // the console-only rightsize opt-in is off. do NOT throw here — a report read runs at
      // PLAN time, and a throw aborts the WHOLE multi-resource plan (blast radius). instead
      // degrade to an empty report (symmetric with the forecast DataUnavailable degrade),
      // logged LOUD with a pointer to the declared precondition. the fail-loud guidance lives
      // on DeclaredAwsCostExplorerPreference's set (the APPLY path), so plan stays green and
      // the preference resource (which plans CREATE when off) is the single guide
      if (isRightsizeOptInDisabledError({ error })) {
        context.log.warn(
          'getOneCostReportRecommendationsToRightsize: the EC2 rightsize opt-in is off; returns an empty report (no recs) rather than a throw. provision DeclaredAwsCostExplorerPreference (feature=rightsizeRecommendations) + enable it in the payer console to populate',
          { errorName: error.name, errorMessage: error.message, input },
        );
        return castIntoDeclaredAwsCostReportRecommendationsToRightsize({
          unique: { service, recommendationTarget, benefitsConsidered, filter },
          result: {
            $metadata: {},
            Summary: undefined,
            Metadata: undefined,
            RightsizingRecommendations: [],
          },
        });
      }

      throw new HelpfulError(
        'aws.getOneCostReportRecommendationsToRightsize error',
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
 * .what = the rightsize-savings read, wrapped with the shared on-disk cache
 * .why = a cost explorer read costs $0.01/request and re-bills on every plan; the
 *        cache serves repeat reads from disk within the ttl, keyed on the report's
 *        @unique identity (the query) scoped by account+region (so one account's
 *        cached spend is never served for another)
 */
export const getOneCostReportRecommendationsToRightsize = withSimpleCacheAsync(
  _getOneCostReportRecommendationsToRightsize,
  {
    cache: getCostReportCache(),
    serialize: {
      // .note = the shared key builder folds in account + region (see its .why:
      //         an account-agnostic query key would serve account A's cache to account B)
      key: (input, context) =>
        castToCostReportCacheKey({
          procedure: {
            name: 'getOneCostReportRecommendationsToRightsize',
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
          DeclaredAwsCostReportRecommendationsToRightsize.as(
            JSON.parse(cached),
          ),
          hasReadonly({ of: DeclaredAwsCostReportRecommendationsToRightsize }),
        ),
    },
  },
);
