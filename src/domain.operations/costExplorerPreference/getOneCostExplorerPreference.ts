import {
  GetCostAndUsageWithResourcesCommand,
  GetRightsizingRecommendationCommand,
} from '@aws-sdk/client-cost-explorer';
import { asProcedure } from 'as-procedure';
import type { RefByUnique } from 'domain-objects';
import { HelpfulError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import { getAwsCostExplorerClient } from '@src/access/sdks/getAwsCostExplorerClient';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCostExplorerPreference } from '@src/domain.objects/DeclaredAwsCostExplorerPreference';

import { isTolerableAwsCostReportError } from '../costReport/isTolerableAwsCostReportError';
import { COST_EXPLORER_PREFERENCE_FEATURES } from './COST_EXPLORER_PREFERENCE_FEATURES';
import { isResourceLevelDataOptInDisabledError } from './isResourceLevelDataOptInDisabledError';
import { isRightsizeOptInDisabledError } from './isRightsizeOptInDisabledError';

/**
 * .what = the aws error names that still mean "the feature is ENABLED, just no data yet"
 * .why = an opted-in but low-data account can answer the rightsize probe with
 *        DataUnavailableException — that is NOT "off", it is "on but empty". an EXACT-name
 *        allowlist (not startsWith) so an unrelated look-alike is never masked
 */
const ENABLED_BUT_EMPTY_ERROR_NAMES = ['DataUnavailableException'];

/**
 * .what = the UTC YYYY-MM-DD stamp for a date shifted by `addDays` from now
 * .why = the resource-level probe reads a RECENT window (over a service that has spend),
 *        so an enabled account returns data and only a genuinely-off account raises the
 *        DataUnavailable off-signal; a window derived off today keeps the probe honest
 */
const asUtcDayStamp = (input: { addDays: number }): string => {
  const now = new Date();
  const shifted = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + input.addDays,
    ),
  );
  return shifted.toISOString().slice(0, 10);
};

/**
 * .what = probes whether the EC2 RIGHTSIZE opt-in is enabled — a minimal
 *         GetRightsizingRecommendation read that AccessDenies when the opt-in is off
 * .why = the rightsize preference has no read api; its enablement is only observable via a
 *        dependent read. success (or an empty DataUnavailable) = ENABLED; the specific
 *        opt-in AccessDenied = OFF
 */
const probeRightsizeOptIn = async (
  input: { feature: string },
  context: ContextAwsApi & VisualogicContext,
): Promise<DeclaredAwsCostExplorerPreference | null> => {
  const client = getAwsCostExplorerClient();
  try {
    // a minimal probe read — one page is enough to learn enabled-vs-off
    await client.send(
      new GetRightsizingRecommendationCommand({
        Service: 'AmazonEC2',
        PageSize: 1,
      }),
    );
    // the read succeeded → the opt-in is ENABLED → the precondition is satisfied
    return DeclaredAwsCostExplorerPreference.as({ feature: input.feature });
  } catch (error) {
    if (!(error instanceof Error)) throw error;

    // the SPECIFIC opt-in-disabled signal → the feature is OFF → absent (null)
    if (isRightsizeOptInDisabledError({ error })) return null;

    // enabled-but-empty (young account, no rec data yet) still means ENABLED — log loud,
    // then report the precondition as satisfied (NOT a silent swallow)
    if (
      isTolerableAwsCostReportError({
        error,
        tolerable: ENABLED_BUT_EMPTY_ERROR_NAMES,
      })
    ) {
      context.log.warn(
        'getOneCostExplorerPreference: rightsize probe returned DataUnavailable — the opt-in is enabled but the account has no rec data yet; precondition treated as satisfied',
        { feature: input.feature, errorName: error.name },
      );
      return DeclaredAwsCostExplorerPreference.as({ feature: input.feature });
    }

    // every other error (a real iam denial, a network fault) rethrows, wrapped
    throw new HelpfulError('aws.getOneCostExplorerPreference error', {
      cause: error,
      context: { errorName: error.name, errorMessage: error.message, input },
    });
  }
};

/**
 * .what = probes whether the HOURLY + RESOURCE-LEVEL DATA opt-in is enabled — a minimal
 *         GetCostAndUsageWithResources read that AccessDenies when the opt-in is off
 * .why = the resource-level preference has no read api either; its enablement is only
 *        observable via a dependent read. the read pins a RECENT window over EC2 (a service
 *        that has spend), grouped by RESOURCE_ID, so an enabled account returns data — and
 *        only a genuinely-off account raises the opt-in-off AccessDenied signal
 * .note = the off-signal is an AccessDeniedException whose MESSAGE names the resource-level
 *         opt-in (see isResourceLevelDataOptInDisabledError) — same message-signal shape as
 *         the rightsize probe, NOT a DataUnavailable name-signal
 */
const probeResourceLevelDataOptIn = async (
  input: { feature: string },
  context: ContextAwsApi & VisualogicContext,
): Promise<DeclaredAwsCostExplorerPreference | null> => {
  const client = getAwsCostExplorerClient();
  try {
    // a minimal recent-window probe over EC2 — one page is enough to learn enabled-vs-off
    await client.send(
      new GetCostAndUsageWithResourcesCommand({
        TimePeriod: {
          Start: asUtcDayStamp({ addDays: -2 }),
          End: asUtcDayStamp({ addDays: 0 }),
        },
        Granularity: 'DAILY',
        Metrics: ['UnblendedCost'],
        GroupBy: [{ Type: 'DIMENSION', Key: 'RESOURCE_ID' }],
        // required filter: pin a single SERVICE (EC2), which has spend on the demo account
        Filter: {
          Dimensions: {
            Key: 'SERVICE',
            Values: ['Amazon Elastic Compute Cloud - Compute'],
          },
        },
      }),
    );
    // the read succeeded → the opt-in is ENABLED → the precondition is satisfied
    return DeclaredAwsCostExplorerPreference.as({ feature: input.feature });
  } catch (error) {
    if (!(error instanceof Error)) throw error;

    // DataUnavailable from THIS api = the resource-level opt-in is OFF → absent (null); the
    // DAO's set.findsert then guides the human to the console (there is no write api)
    if (isResourceLevelDataOptInDisabledError({ error })) return null;

    // every other error (a real iam denial, a network fault) rethrows, wrapped
    throw new HelpfulError('aws.getOneCostExplorerPreference error', {
      cause: error,
      context: { errorName: error.name, errorMessage: error.message, input },
    });
  }
};

/**
 * .what = probes whether a console-only Cost Explorer preference is enabled on this
 *         account, and returns the declared precondition object when it is (null when off)
 * .why = a preference has NO read api of its own — the only way to observe its state is to
 *        attempt a read that depends on it and interpret the response. this op dispatches to
 *        the right dependent-read probe per feature: a success means ENABLED (→ the resource
 *        exists → plan KEEP); the feature's specific off-signal means OFF (→ null → plan
 *        CREATE → the DAO's set fires the console guidance). an absent-when-off model, so
 *        presence IS the enabled signal
 * .note = NOT cached — freshness matters (the moment the human flips the switch, the next
 *         plan must see it). each probe is a billed cost-explorer request ($0.01), an
 *         accepted per-plan cost for the precondition it guards
 */
export const getOneCostExplorerPreference = asProcedure(
  async (
    input: {
      by: { unique: RefByUnique<typeof DeclaredAwsCostExplorerPreference> };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<DeclaredAwsCostExplorerPreference | null> => {
    const { feature } = input.by.unique;

    // dispatch to the feature's dependent-read probe
    if (feature === COST_EXPLORER_PREFERENCE_FEATURES.rightsizeRecommendations)
      return probeRightsizeOptIn({ feature }, context);
    if (feature === COST_EXPLORER_PREFERENCE_FEATURES.resourceLevelData)
      return probeResourceLevelDataOptIn({ feature }, context);

    // fail loud on any unmodeled feature name before the billed probe, so an unknown
    // feature is never silently reported "off"
    throw new HelpfulError(
      'getOneCostExplorerPreference: unsupported feature',
      {
        context: {
          feature,
          supported: Object.values(COST_EXPLORER_PREFERENCE_FEATURES),
        },
      },
    );
  },
);
