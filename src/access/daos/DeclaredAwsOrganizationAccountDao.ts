import { DeclastructDao } from 'declastruct';
import { isRefByPrimary, isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsOrganizationAccount } from '../../domain.objects/DeclaredAwsOrganizationAccount';
import { delOrganizationAccount } from '../../domain.operations/organizationAccount/delOrganizationAccount';
import { getOneOrganizationAccount } from '../../domain.operations/organizationAccount/getOneOrganizationAccount';
import { setOrganizationAccount } from '../../domain.operations/organizationAccount/setOrganizationAccount';

/**
 * .what = declastruct DAO for AWS Organization Account resources
 * .why = wraps organization account operations to conform to declastruct interface
 * .note
 *   - only finsert supported (accounts cannot be updated)
 *   - delete = close (transitions to SUSPENDED)
 *   - requires org manager auth for all operations
 */
export const DeclaredAwsOrganizationAccountDao = new DeclastructDao<
  DeclaredAwsOrganizationAccount,
  typeof DeclaredAwsOrganizationAccount,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byPrimary: async (input, context) => {
      return getOneOrganizationAccount({ by: { primary: input } }, context);
    },
    byUnique: async (input, context) => {
      return getOneOrganizationAccount({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsOrganizationAccount })(input))
        return getOneOrganizationAccount({ by: { unique: input } }, context);

      // route to primary if ref is by primary
      if (isRefByPrimary({ of: DeclaredAwsOrganizationAccount })(input))
        return getOneOrganizationAccount({ by: { primary: input } }, context);

      // failfast if ref is neither unique nor primary
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input, context) => {
      return setOrganizationAccount({ finsert: input }, context);
    },
    // Note: upsert not supported — accounts cannot be updated after creation
    delete: async (input, context) => {
      await delOrganizationAccount({ by: { ref: input } }, context);
    },
  },
});
