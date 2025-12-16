import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsOrganization } from '@src/domain.objects/DeclaredAwsOrganization';
import { delOrganization } from '@src/domain.operations/organization/delOrganization';
import { getOneOrganization } from '@src/domain.operations/organization/getOneOrganization';
import { setOrganization } from '@src/domain.operations/organization/setOrganization';

/**
 * .what = declastruct DAO for AWS Organization
 * .why = wraps organization operations to conform to declastruct interface
 * .note
 *   - only one organization per management account
 *   - only findsert supported (organizations cannot be updated)
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
    findsert: async (input, context) => {
      return setOrganization({ findsert: input }, context);
    },
    upsert: null,
    delete: async (input, context) => {
      await delOrganization({ by: { ref: input } }, context);
    },
  },
});
