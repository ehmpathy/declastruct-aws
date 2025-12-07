import { DeclastructDao } from 'declastruct';
import { isRefByPrimary, isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsSsoPermissionSet } from '../../domain.objects/DeclaredAwsSsoPermissionSet';
import { getOneSsoPermissionSet } from '../../domain.operations/ssoPermissionSet/getOneSsoPermissionSet';
import { setSsoPermissionSet } from '../../domain.operations/ssoPermissionSet/setSsoPermissionSet';

/**
 * .what = declastruct DAO for AWS SSO permission set resources
 * .why = wraps permission set operations to conform to declastruct interface
 */
export const DeclaredAwsSsoPermissionSetDao = new DeclastructDao<
  DeclaredAwsSsoPermissionSet,
  typeof DeclaredAwsSsoPermissionSet,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byPrimary: async (input, context) => {
      return getOneSsoPermissionSet({ by: { primary: input } }, context);
    },
    byUnique: async (input, context) => {
      return getOneSsoPermissionSet({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsSsoPermissionSet })(input))
        return getOneSsoPermissionSet({ by: { unique: input } }, context);

      // route to primary if ref is by primary
      if (isRefByPrimary({ of: DeclaredAwsSsoPermissionSet })(input))
        return getOneSsoPermissionSet({ by: { primary: input } }, context);

      // failfast if ref is neither unique nor primary
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input, context) => {
      return setSsoPermissionSet({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setSsoPermissionSet({ upsert: input }, context);
    },
  },
});
