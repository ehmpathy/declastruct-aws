import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsIamRolePolicyAttachedInline } from '../../domain.objects/DeclaredAwsIamRolePolicyAttachedInline';
import { delIamRolePolicyAttachedInline } from '../../domain.operations/iamRolePolicyAttachedInline/delIamRolePolicyAttachedInline';
import { getIamRolePolicyAttachedInline } from '../../domain.operations/iamRolePolicyAttachedInline/getIamRolePolicyAttachedInline';
import { setIamRolePolicyAttachedInline } from '../../domain.operations/iamRolePolicyAttachedInline/setIamRolePolicyAttachedInline';

/**
 * .what = declastruct DAO for AWS IAM role inline policy document attachments
 * .why = wraps IAM role policy operations to conform to declastruct interface
 * .note = inline policies have no primary key (arn), only unique key (role + name)
 */
export const DeclaredAwsIamRolePolicyAttachedInlineDao = genDeclastructDao<
  typeof DeclaredAwsIamRolePolicyAttachedInline,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsIamRolePolicyAttachedInline,
  get: {
    one: {
      byPrimary: null,
      byUnique: async (input, context) => {
        return getIamRolePolicyAttachedInline(
          { by: { unique: input } },
          context,
        );
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setIamRolePolicyAttachedInline({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setIamRolePolicyAttachedInline({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delIamRolePolicyAttachedInline({ by: { ref: input } }, context);
    },
  },
});
