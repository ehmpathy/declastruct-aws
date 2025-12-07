import { DeclastructDao } from 'declastruct';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsSsoAccountAssignment } from '../../domain.objects/DeclaredAwsSsoAccountAssignment';
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
export const DeclaredAwsSsoAccountAssignmentDao = new DeclastructDao<
  DeclaredAwsSsoAccountAssignment,
  typeof DeclaredAwsSsoAccountAssignment,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byPrimary: async (input, context) => {
      // primary lookup not fully supported since assignment uses composite key
      UnexpectedCodePathError.throw(
        'account assignments require full composite key; use byUnique',
        { input },
      );
    },
    byUnique: async (input, context) => {
      return getOneSsoAccountAssignment({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // ref lookup not supported for assignments (no single id)
      UnexpectedCodePathError.throw(
        'account assignments cannot be looked up by ref; use byUnique',
        { input },
      );
    },
  },
  set: {
    finsert: async (input, context) => {
      return setSsoAccountAssignment({ finsert: input }, context);
    },
    // upsert not supported for assignments (they can't be updated)
  },
});
