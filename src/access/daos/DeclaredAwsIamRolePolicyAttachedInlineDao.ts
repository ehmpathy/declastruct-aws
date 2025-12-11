import { DeclastructDao } from 'declastruct';
import { isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
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
export const DeclaredAwsIamRolePolicyAttachedInlineDao = new DeclastructDao<
  DeclaredAwsIamRolePolicyAttachedInline,
  typeof DeclaredAwsIamRolePolicyAttachedInline,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byUnique: async (input, context) => {
      return getIamRolePolicyAttachedInline({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsIamRolePolicyAttachedInline })(input))
        return getIamRolePolicyAttachedInline(
          { by: { unique: input } },
          context,
        );

      // failfast if ref is not by unique (no primary key for inline policies)
      UnexpectedCodePathError.throw(
        'unsupported ref type; inline policies only support unique ref',
        { input },
      );
    },
  },
  set: {
    finsert: async (input, context) => {
      return setIamRolePolicyAttachedInline({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setIamRolePolicyAttachedInline({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delIamRolePolicyAttachedInline({ by: { ref: input } }, context);
    },
  },
});
