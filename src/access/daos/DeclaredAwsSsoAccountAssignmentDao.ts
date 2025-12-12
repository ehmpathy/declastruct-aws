import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsSsoAccountAssignment } from '../../domain.objects/DeclaredAwsSsoAccountAssignment';
import { getOneSsoAccountAssignment } from '../../domain.operations/ssoAccountAssignment/getOneSsoAccountAssignment';
import { setSsoAccountAssignment } from '../../domain.operations/ssoAccountAssignment/setSsoAccountAssignment';

/**
 * .what = declastruct DAO for AWS SSO account assignment resources
 * .why = wraps account assignment operations to conform to declastruct interface
 *
 * .note
 *   - assignments are identified by composite key, not a single id
 *   - only finsert is supported (assignments cannot be updated)
 */
export const DeclaredAwsSsoAccountAssignmentDao = genDeclastructDao<
  typeof DeclaredAwsSsoAccountAssignment,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsSsoAccountAssignment,
  get: {
    one: {
      byPrimary: null,
      byUnique: async (input, context) => {
        return getOneSsoAccountAssignment({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    finsert: async (input, context) => {
      return setSsoAccountAssignment({ finsert: input }, context);
    },
    upsert: null,
    delete: null,
  },
});
