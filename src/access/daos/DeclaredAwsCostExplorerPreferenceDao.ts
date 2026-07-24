import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCostExplorerPreference } from '@src/domain.objects/DeclaredAwsCostExplorerPreference';
import { getCostExplorerPreferenceGuidanceError } from '@src/domain.operations/costExplorerPreference/getCostExplorerPreferenceGuidanceError';
import { getOneCostExplorerPreference } from '@src/domain.operations/costExplorerPreference/getOneCostExplorerPreference';

/**
 * .what = declastruct DAO for the Cost Explorer preference precondition
 * .why = get PROBES enablement (present = enabled → KEEP; null = off → CREATE), and
 *        set.findsert FAILS LOUD with console guidance — AWS exposes no api to enable a
 *        Cost Explorer preference, so "provisioning" it is a one-time console opt-in the
 *        human must do by hand. this is NOT the read-only report DAO: a report can never
 *        be written, whereas this precondition IS "written" by the human in the console,
 *        and set.findsert is where declastruct guides them to do so
 * .note = upsert/delete are null (there is no api state to overwrite or tear down);
 *         set.findsert throws rather than silently no-ops, so a CREATE plan surfaces the
 *         guidance at apply instead of a false success
 */
export const DeclaredAwsCostExplorerPreferenceDao = genDeclastructDao<
  typeof DeclaredAwsCostExplorerPreference,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsCostExplorerPreference,
  get: {
    one: {
      byPrimary: null,
      byUnique: async (ref, context) =>
        getOneCostExplorerPreference({ by: { unique: ref } }, context),
    },
  },
  set: {
    findsert: async (input) => {
      // the feature is off (get returned null → declastruct plans CREATE → calls this).
      // there is no write api; guide the human to the console opt-in and fail loud
      throw getCostExplorerPreferenceGuidanceError({
        feature: input.feature,
      });
    },
    upsert: null,
    delete: null,
  },
});
