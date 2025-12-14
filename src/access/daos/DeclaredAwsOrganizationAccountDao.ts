import { genDeclastructDao } from 'declastruct';
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
 *   - finsert = create if not exists, return existing (idempotent)
 *   - upsert = sync write-only tags when SYNC_WRITEONLY_TAGS=DeclaredAwsOrganizationAccount
 *   - delete = close (transitions to SUSPENDED)
 *   - requires org manager auth for all operations
 */
export const DeclaredAwsOrganizationAccountDao = genDeclastructDao<
  typeof DeclaredAwsOrganizationAccount,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsOrganizationAccount,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneOrganizationAccount({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneOrganizationAccount({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    finsert: async (input, context) => {
      return setOrganizationAccount({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setOrganizationAccount({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delOrganizationAccount({ by: { ref: input } }, context);
    },
  },
});
