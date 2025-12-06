import { DeclastructDao } from 'declastruct';
import { isRefByPrimary, isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
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
export const DeclaredAwsOrganizationDao = new DeclastructDao<
  DeclaredAwsOrganization,
  typeof DeclaredAwsOrganization,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byPrimary: async (input, context) => {
      return getOneOrganization({ by: { primary: input } }, context);
    },
    byUnique: async (input, context) => {
      return getOneOrganization({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsOrganization })(input))
        return getOneOrganization({ by: { unique: input } }, context);

      // route to primary if ref is by primary
      if (isRefByPrimary({ of: DeclaredAwsOrganization })(input))
        return getOneOrganization({ by: { primary: input } }, context);

      // failfast if ref is neither unique nor primary
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input, context) => {
      return setOrganization({ finsert: input }, context);
    },
    // Note: upsert not supported — organizations cannot be updated after creation
    delete: async (input, context) => {
      await delOrganization({ by: { ref: input } }, context);
    },
  },
});
