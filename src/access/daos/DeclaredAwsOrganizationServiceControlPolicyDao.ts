import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsOrganizationServiceControlPolicy } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicy';
import { delOrganizationServiceControlPolicy } from '@src/domain.operations/organizationServiceControlPolicy/delOrganizationServiceControlPolicy';
import { getOneOrganizationServiceControlPolicy } from '@src/domain.operations/organizationServiceControlPolicy/getOneOrganizationServiceControlPolicy';
import { setOrganizationServiceControlPolicy } from '@src/domain.operations/organizationServiceControlPolicy/setOrganizationServiceControlPolicy';

/**
 * .what = declastruct DAO for AWS Organization Service Control Policy resources
 * .why = wraps SCP operations to conform to declastruct interface
 * .note
 *   - findsert = create if not exists, return extant (idempotent)
 *   - upsert = create or update content/description/tags
 *   - delete = remove policy (must be detached first)
 *   - requires org manager auth for all operations
 */
export const DeclaredAwsOrganizationServiceControlPolicyDao = genDeclastructDao<
  typeof DeclaredAwsOrganizationServiceControlPolicy,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsOrganizationServiceControlPolicy,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneOrganizationServiceControlPolicy(
          { by: { primary: input } },
          context,
        );
      },
      byUnique: async (input, context) => {
        return getOneOrganizationServiceControlPolicy(
          { by: { unique: input } },
          context,
        );
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setOrganizationServiceControlPolicy({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setOrganizationServiceControlPolicy({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delOrganizationServiceControlPolicy(
        { by: { ref: input } },
        context,
      );
    },
  },
});
