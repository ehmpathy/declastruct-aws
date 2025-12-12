import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsOrganization } from '../../domain.objects/DeclaredAwsOrganization';
import { delOrganization } from '../../domain.operations/organization/delOrganization';
import { getOneOrganization } from '../../domain.operations/organization/getOneOrganization';
import { setOrganization } from '../../domain.operations/organization/setOrganization';

/**
 * .what = declastruct DAO for AWS Organization
 * .why = wraps organization operations to conform to declastruct interface
 * .note
 *   - only one organization per management account
 *   - only finsert supported (organizations cannot be updated)
 */
export const DeclaredAwsOrganizationDao = genDeclastructDao<
  typeof DeclaredAwsOrganization,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsOrganization,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneOrganization({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneOrganization({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    finsert: async (input, context) => {
      return setOrganization({ finsert: input }, context);
    },
    upsert: null,
    delete: async (input, context) => {
      await delOrganization({ by: { ref: input } }, context);
    },
  },
});
