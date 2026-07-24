import {
  type AccountScope,
  GetSavingsPlansPurchaseRecommendationCommand,
  type GetSavingsPlansPurchaseRecommendationCommandOutput,
  type LookbackPeriodInDays,
  type PaymentOption,
  type SavingsPlansPurchaseRecommendationDetail,
  StartSavingsPlansPurchaseRecommendationGenerationCommand,
  type SupportedSavingsPlansType,
  type TermInYears,
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
import { DeclaredAwsCostReportRecommendationsToPurchasePlan } from '@src/domain.objects/DeclaredAwsCostReportRecommendationsToPurchasePlan';

import { asAwsCostReportFilterExpression } from '../costReport/asAwsCostReportFilterExpression';
import { castToCostReportCacheKey } from '../costReport/castToCostReportCacheKey';
import { getAllAwsCostExplorerPages } from '../costReport/getAllAwsCostExplorerPages';
import { getCostReportCache } from '../costReport/getCostReportCache';
import { isTolerableAwsCostReportError } from '../costReport/isTolerableAwsCostReportError';
import { castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan } from './castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan';

/**
 * .what = the two AWS error names the generation-start path tolerates
 * .why = an in-flight generation (GenerationExistsException) or too-little history
 *        (DataUnavailableException) is expected — the Get read below returns the
 *        current set regardless. an EXACT-name allowlist (not startsWith) so an
 *        unrelated error whose name merely begins with these strings is NOT masked
 */
const GENERATION_START_TOLERABLE_ERROR_NAMES = [
  'GenerationExistsException',
  'DataUnavailableException',
];

/**
 * .what = requests a fresh recommendation generation, best-effort
 * .why = Start refreshes the rec set with the latest usage; a generation already
 *        in flight (or too-little history) is not an error for our read path — we
 *        proceed to read whatever set currently exists
 * .note = the tolerated path is NOT swallowed silently — it logs loud (warn) with the
 *         error name so the deferral is observable; every other error rethrows
 */
const tryStartGeneration = async (
  client: ReturnType<typeof getAwsCostExplorerClient>,
  context: VisualogicContext,
): Promise<void> => {
  try {
    await client.send(
      new StartSavingsPlansPurchaseRecommendationGenerationCommand({}),
    );
  } catch (error) {
    if (!(error instanceof Error)) throw error;

    // an in-flight generation / too-little history is tolerable — log it loud
    // (not a silent swallow), then proceed to the current-set read; rethrow all else
    if (
      isTolerableAwsCostReportError({
        error,
        tolerable: GENERATION_START_TOLERABLE_ERROR_NAMES,
      })
    ) {
      context.log.warn(
        'getOneCostReportRecommendationsToPurchasePlan: tolerated generation-start condition; proceeds to read the current recommendation set',
        { errorName: error.name, errorMessage: error.message },
      );
      return;
    }
    throw error;
  }
};

/**
 * .what = reads a purchase-plan savings report via the aws savings-plans api
 * .why = answers "where can we save money?" — a commitment-purchase recommendation
 *        with per-plan savings + a summary total; requests a fresh generation, then
 *        pages the current recommendation set and casts
 * .note = read-only; there is no set/del. the async Start-then-Get shape is hidden
 *         behind the cache layer that wraps this op (see the getOne cache note)
 */
const _getOneCostReportRecommendationsToPurchasePlan = asProcedure(
  async (
    input: {
      by: {
        unique: RefByUnique<
          typeof DeclaredAwsCostReportRecommendationsToPurchasePlan
        >;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<
    HasReadonly<typeof DeclaredAwsCostReportRecommendationsToPurchasePlan>
  > => {
    const {
      savingsPlansType,
      termInYears,
      paymentOption,
      lookbackDays,
      accountScope,
      filter,
    } = input.by.unique;

    // declare the client (pinned to us-east-1)
    const client = getAwsCostExplorerClient();

    try {
      // request a fresh generation (best-effort), then read the current set
      await tryStartGeneration(client, context);

      // page through the recommendation details; the summary rides on each page, so the
      // shared paginator returns the first response too (and owns the cursor advance)
      const { items: details, firstResponse } =
        await getAllAwsCostExplorerPages({
          loadPage: (nextPageToken) =>
            client.send(
              new GetSavingsPlansPurchaseRecommendationCommand({
                // aws boundary: the SDK types each of these fields as its own
                // string-enum while our @unique fields are plain strings. removal
                // path: when each domain field is typed to the equivalent SDK enum
                // (or a shared string-literal union the SDK accepts), these casts drop
                SavingsPlansType: savingsPlansType as SupportedSavingsPlansType,
                TermInYears: termInYears as TermInYears,
                PaymentOption: paymentOption as PaymentOption,
                LookbackPeriodInDays: lookbackDays as LookbackPeriodInDays,
                AccountScope: accountScope as AccountScope,
                Filter: asAwsCostReportFilterExpression({ filter }),
                NextPageToken: nextPageToken,
              }),
            ),
          getItems: (
            response: GetSavingsPlansPurchaseRecommendationCommandOutput,
          ): SavingsPlansPurchaseRecommendationDetail[] =>
            response.SavingsPlansPurchaseRecommendation
              ?.SavingsPlansPurchaseRecommendationDetails ?? [],
          getNextToken: (response) => response.NextPageToken,
        });

      return castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan({
        unique: {
          savingsPlansType,
          termInYears,
          paymentOption,
          lookbackDays,
          accountScope,
          filter,
        },
        result: {
          $metadata: {},
          Metadata: firstResponse?.Metadata,
          SavingsPlansPurchaseRecommendation: {
            ...firstResponse?.SavingsPlansPurchaseRecommendation,
            SavingsPlansPurchaseRecommendationDetails: details,
          },
          NextPageToken: undefined,
        },
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      throw new HelpfulError(
        'aws.getOneCostReportRecommendationsToPurchasePlan error',
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
 * .what = the purchase-plan-savings read, wrapped with the shared on-disk cache
 * .why = the two-step async generate-then-get is slow and each read costs money;
 *        the cache runs the generate once per ttl window on a miss and serves every
 *        other read from disk, keyed on the report's @unique identity (the query)
 */
export const getOneCostReportRecommendationsToPurchasePlan =
  withSimpleCacheAsync(_getOneCostReportRecommendationsToPurchasePlan, {
    cache: getCostReportCache(),
    serialize: {
      // .note = the shared key builder folds in account + region (see its .why:
      //         an account-agnostic query key would serve account A's cache to account B)
      key: (input, context) =>
        castToCostReportCacheKey({
          procedure: {
            name: 'getOneCostReportRecommendationsToPurchasePlan',
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
          DeclaredAwsCostReportRecommendationsToPurchasePlan.as(
            JSON.parse(cached),
          ),
          hasReadonly({
            of: DeclaredAwsCostReportRecommendationsToPurchasePlan,
          }),
        ),
    },
  });
