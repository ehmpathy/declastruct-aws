import { BadRequestError } from 'helpful-errors';

import { COST_EXPLORER_PREFERENCE_FEATURES } from './COST_EXPLORER_PREFERENCE_FEATURES';

/**
 * .what = the Cost Explorer Preferences / Settings console page (payer account)
 */
const COST_EXPLORER_SETTINGS_URL =
  'https://us-east-1.console.aws.amazon.com/cost-management/home?region=us-east-1#/settings';

/**
 * .what = the per-feature console steps + note that make the guidance actionable
 * .why = each Cost Explorer preference is a DIFFERENT console toggle with its own steps and
 *        its own caveats (the resource-level one needs a service selection); a generic
 *        message would not tell
 *        the human which switch to flip. keyed on the feature so a new preference adds its
 *        steps here rather than emitting a wrong instruction
 */
const GUIDANCE_BY_FEATURE: Record<string, { how: string[]; note: string }> = {
  [COST_EXPLORER_PREFERENCE_FEATURES.rightsizeRecommendations]: {
    how: [
      'sign in to the payer (management) account (NOT the linked member account)',
      `open Cost Explorer Preferences: ${COST_EXPLORER_SETTINGS_URL}`,
      'enable the EC2 rightsize recommendation opt-in (and tick linked-account access so member accounts can read)',
      'wait for the opt-in to populate (aws states up to ~24h), then re-run apply',
    ],
    note: 'once on, the precondition probe succeeds and the report reads clean; a low-spend account may return an empty recommendation set, which is a valid (non-error) read',
  },
  [COST_EXPLORER_PREFERENCE_FEATURES.resourceLevelData]: {
    how: [
      'sign in to the payer (management) account (NOT the linked member account)',
      `open Cost Explorer Preferences: ${COST_EXPLORER_SETTINGS_URL}`,
      'under "Granular data", enable "Resource-level data at daily granularity"',
      'choose the services to include (the console requires at least one) — select every service you want a per-resource breakdown for, or at minimum the service your report filters (EC2)',
      'wait for the data to populate (aws states up to ~48h), then re-run apply',
    ],
    note: 'the DAILY resource-level tier is FREE — it just needs the switch flipped + at least one service chosen. only the separate HOURLY granularity tier is paid ($0.01 per 1,000 usage-records/mo), which the per-resource report does not require. per-resource daily reads cover the last ~14 days',
  },
};

/**
 * .what = builds the actionable, console-only guidance error for a Cost Explorer
 *         preference that is off — it NAMES the declared resource to provision and the
 *         payer console page to switch it on, with per-feature steps
 * .why = AWS exposes NO api to enable a Cost Explorer preference (they are console-only),
 *        so a read that depends on one must fail LOUD and GUIDE rather than emit a cryptic
 *        AccessDenied / DataUnavailable. per the declarative model, the guidance points at
 *        the declared precondition — "provision DeclaredAwsCostExplorerPreference" — so the
 *        human declares + follows the console step, then re-applies
 * .note = the opt-in takes up to ~24h to populate after the switch is flipped
 */
export const getCostExplorerPreferenceGuidanceError = (input: {
  feature: string;
  /**
   * .what = the causal aws error, when a read raised one; absent when the guidance
   *         comes from the DAO's set path (the probe already resolved "off" to null, so
   *         there is no live aws error to attach)
   */
  awsError?: Error;
}): BadRequestError => {
  // pick the feature's steps + note; fall back to the rightsize steps for an unmapped
  // feature so the guidance is never blank (the probe already gates unknown features)
  const guidance =
    GUIDANCE_BY_FEATURE[input.feature] ??
    GUIDANCE_BY_FEATURE[
      COST_EXPLORER_PREFERENCE_FEATURES.rightsizeRecommendations
    ]!;

  return new BadRequestError(
    `aws cost explorer preference "${input.feature}" is not enabled for this account. this is a one-time, console-only opt-in — aws exposes no api to enable it. declare DeclaredAwsCostExplorerPreference to make the precondition explicit, switch it on once in the payer (management) account, then re-apply.`,
    {
      provision: {
        resource: 'DeclaredAwsCostExplorerPreference',
        feature: input.feature,
      },
      how: guidance.how,
      note: guidance.note,
      links: {
        costExplorerPreferences: COST_EXPLORER_SETTINGS_URL,
      },
      awsError: input.awsError?.message ?? null,
    },
  );
};
