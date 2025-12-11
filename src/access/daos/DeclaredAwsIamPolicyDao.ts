import { DeclastructDao } from 'declastruct';
import { isRefByPrimary, isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsIamPolicy } from '../../domain.objects/DeclaredAwsIamPolicy';
import { getOneIamPolicy } from '../../domain.operations/iamPolicy/getOneIamPolicy';

/**
 * .what = declastruct DAO for AWS IAM managed policies
 * .why = wraps IAM policy operations to conform to declastruct interface
 * .note
 *   - currently read-only (no set/delete operations)
 *   - supports both aws-managed and customer-managed policies
 */
export const DeclaredAwsIamPolicyDao = new DeclastructDao<
  DeclaredAwsIamPolicy,
  typeof DeclaredAwsIamPolicy,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byPrimary: async (input, context) => {
      return getOneIamPolicy({ by: { primary: input } }, context);
    },
    byUnique: async (input, context) => {
      return getOneIamPolicy({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // route to primary if ref is by primary
      if (isRefByPrimary({ of: DeclaredAwsIamPolicy })(input))
        return getOneIamPolicy({ by: { primary: input } }, context);

      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsIamPolicy })(input))
        return getOneIamPolicy({ by: { unique: input } }, context);

      // failfast if ref is neither
      UnexpectedCodePathError.throw('ref is neither primary nor unique', {
        input,
      });
    },
  },
  set: {
    finsert: async () => {
      UnexpectedCodePathError.throw(
        'DeclaredAwsIamPolicy is read-only; use aws console or cli to create managed policies',
      );
    },
    upsert: async () => {
      UnexpectedCodePathError.throw(
        'DeclaredAwsIamPolicy is read-only; use aws console or cli to update managed policies',
      );
    },
  },
});
