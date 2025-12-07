import { DeclastructDao } from 'declastruct';
import { isRefByPrimary, isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsSsoInstance } from '../../domain.objects/DeclaredAwsSsoInstance';
import { getOneSsoInstance } from '../../domain.operations/ssoInstance/getOneSsoInstance';
import { setSsoInstance } from '../../domain.operations/ssoInstance/setSsoInstance';

/**
 * .what = declastruct DAO for AWS SSO Identity Center instance resources
 * .why = wraps SSO instance operations to conform to declastruct interface
 *
 * .note
 *   - sso instances cannot be created via api; must be enabled in aws console
 *   - set.finsert will failfast if instance doesn't exist
 */
export const DeclaredAwsSsoInstanceDao = new DeclastructDao<
  DeclaredAwsSsoInstance,
  typeof DeclaredAwsSsoInstance,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byPrimary: async (input, context) => {
      return getOneSsoInstance({ by: { primary: input } }, context);
    },
    byUnique: async (input, context) => {
      return getOneSsoInstance({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsSsoInstance })(input))
        return getOneSsoInstance({ by: { unique: input } }, context);

      // route to primary if ref is by primary
      if (isRefByPrimary({ of: DeclaredAwsSsoInstance })(input))
        return getOneSsoInstance({ by: { primary: input } }, context);

      // failfast if ref is neither unique nor primary
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input, context) => {
      return setSsoInstance({ finsert: input }, context);
    },
    // upsert not supported: instances are created by aws, not by us
  },
});
