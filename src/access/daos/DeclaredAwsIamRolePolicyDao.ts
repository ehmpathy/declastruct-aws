import { DeclastructDao } from 'declastruct';
import { isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsIamRolePolicy } from '../../domain.objects/DeclaredAwsIamRolePolicy';
import { getIamRolePolicy } from '../../domain.operations/iamRolePolicy/getIamRolePolicy';
import { setIamRolePolicy } from '../../domain.operations/iamRolePolicy/setIamRolePolicy';

/**
 * .what = declastruct DAO for AWS IAM role inline policy resources
 * .why = wraps IAM role policy operations to conform to declastruct interface
 * .note = inline policies have no primary key (arn), only unique key (role + name)
 */
export const DeclaredAwsIamRolePolicyDao = new DeclastructDao<
  DeclaredAwsIamRolePolicy,
  typeof DeclaredAwsIamRolePolicy,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byUnique: async (input, context) => {
      return getIamRolePolicy({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsIamRolePolicy })(input))
        return getIamRolePolicy({ by: { unique: input } }, context);

      // failfast if ref is not by unique (no primary key for inline policies)
      UnexpectedCodePathError.throw(
        'unsupported ref type; inline policies only support unique ref',
        { input },
      );
    },
  },
  set: {
    finsert: async (input, context) => {
      return setIamRolePolicy({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setIamRolePolicy({ upsert: input }, context);
    },
  },
});
