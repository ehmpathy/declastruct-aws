import { DeclastructDao } from 'declastruct';
import { isRefByPrimary, isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsIamRole } from '../../domain.objects/DeclaredAwsIamRole';
import { getIamRole } from '../../domain.operations/iamRole/getIamRole';
import { setIamRole } from '../../domain.operations/iamRole/setIamRole';

/**
 * .what = declastruct DAO for AWS IAM role resources
 * .why = wraps IAM role operations to conform to declastruct interface
 */
export const DeclaredAwsIamRoleDao = new DeclastructDao<
  DeclaredAwsIamRole,
  typeof DeclaredAwsIamRole,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byPrimary: async (input, context) => {
      return getIamRole({ by: { primary: input } }, context);
    },
    byUnique: async (input, context) => {
      return getIamRole({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsIamRole })(input))
        return getIamRole({ by: { unique: input } }, context);

      // route to primary if ref is by primary
      if (isRefByPrimary({ of: DeclaredAwsIamRole })(input))
        return getIamRole({ by: { primary: input } }, context);

      // failfast if ref is neither unique nor primary
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input, context) => {
      return setIamRole({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setIamRole({ upsert: input }, context);
    },
  },
});
