import { genDeclastructDao } from 'declastruct';
import type { RefByUnique } from 'domain-objects';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsOrganizationPolicyEligibility } from '@src/domain.objects/DeclaredAwsOrganizationPolicyEligibility';
import { delOrganizationPolicyEligibility } from '@src/domain.operations/organizationPolicyEligibility/delOrganizationPolicyEligibility';
import { getOneOrganizationPolicyEligibility } from '@src/domain.operations/organizationPolicyEligibility/getOneOrganizationPolicyEligibility';
import { setOrganizationPolicyEligibility } from '@src/domain.operations/organizationPolicyEligibility/setOrganizationPolicyEligibility';

/**
 * .what = declastruct DAO for AWS Organization Policy Eligibility
 * .why = enables declarative management of policy type enablement via declastruct
 * .note
 *   - no primary key (AWS doesn't assign an ID for enabled policy types)
 *   - unique key = type
 *   - findsert = enable if not already enabled
 *   - delete = disable policy type
 */
export const DeclaredAwsOrganizationPolicyEligibilityDao = genDeclastructDao<
  typeof DeclaredAwsOrganizationPolicyEligibility,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsOrganizationPolicyEligibility,
  get: {
    one: {
      byPrimary: null, // no primary key for policy type enablement
      byUnique: async (input, context) => {
        return getOneOrganizationPolicyEligibility(
          { by: { unique: input } },
          context,
        );
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setOrganizationPolicyEligibility({ findsert: input }, context);
    },
    upsert: null, // no upsert for policy eligibility (enable is idempotent)
    delete: async (input, context) => {
      // input is Ref<typeof PolicyEligibility> which is RefByUnique since no primary
      const unique = input as RefByUnique<
        typeof DeclaredAwsOrganizationPolicyEligibility
      >;
      await delOrganizationPolicyEligibility({ by: { unique } }, context);
    },
  },
});
