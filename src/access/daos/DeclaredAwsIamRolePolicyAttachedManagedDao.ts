import { DeclastructDao } from 'declastruct';
import { isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsIamRolePolicyAttachedManaged } from '../../domain.objects/DeclaredAwsIamRolePolicyAttachedManaged';
import { delIamRolePolicyAttachedManaged } from '../../domain.operations/iamRolePolicyAttachedManaged/delIamRolePolicyAttachedManaged';
import { getIamRolePolicyAttachedManaged } from '../../domain.operations/iamRolePolicyAttachedManaged/getIamRolePolicyAttachedManaged';
import { setIamRolePolicyAttachedManaged } from '../../domain.operations/iamRolePolicyAttachedManaged/setIamRolePolicyAttachedManaged';

/**
 * .what = declastruct DAO for AWS IAM role managed policy attachments
 * .why = wraps IAM role policy attachment operations to conform to declastruct interface
 * .note = attachments have no primary key, only unique key (role + policy)
 */
export const DeclaredAwsIamRolePolicyAttachedManagedDao = new DeclastructDao<
  DeclaredAwsIamRolePolicyAttachedManaged,
  typeof DeclaredAwsIamRolePolicyAttachedManaged,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byUnique: async (input, context) => {
      return getIamRolePolicyAttachedManaged(
        { by: { unique: input } },
        context,
      );
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsIamRolePolicyAttachedManaged })(input))
        return getIamRolePolicyAttachedManaged(
          { by: { unique: input } },
          context,
        );

      // failfast if ref is not by unique (no primary key for attachments)
      UnexpectedCodePathError.throw(
        'unsupported ref type; policy attachments only support unique ref',
        { input },
      );
    },
  },
  set: {
    finsert: async (input, context) => {
      return setIamRolePolicyAttachedManaged({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setIamRolePolicyAttachedManaged({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delIamRolePolicyAttachedManaged({ by: { ref: input } }, context);
    },
  },
});
