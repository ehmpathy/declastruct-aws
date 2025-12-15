import { genDeclastructDao } from 'declastruct';
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
export const DeclaredAwsIamRolePolicyAttachedManagedDao = genDeclastructDao<
  typeof DeclaredAwsIamRolePolicyAttachedManaged,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsIamRolePolicyAttachedManaged,
  get: {
    one: {
      byPrimary: null,
      byUnique: async (input, context) => {
        return getIamRolePolicyAttachedManaged(
          { by: { unique: input } },
          context,
        );
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setIamRolePolicyAttachedManaged({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setIamRolePolicyAttachedManaged({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delIamRolePolicyAttachedManaged({ by: { ref: input } }, context);
    },
  },
});
