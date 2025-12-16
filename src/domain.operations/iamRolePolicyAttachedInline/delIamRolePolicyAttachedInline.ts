import { DeleteRolePolicyCommand, IAMClient } from '@aws-sdk/client-iam';
import { asProcedure } from 'as-procedure';
import { isRefByUnique, type Ref } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import { DeclaredAwsIamRoleDao } from '@src/access/daos/DeclaredAwsIamRoleDao';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsIamRolePolicyAttachedInline } from '@src/domain.objects/DeclaredAwsIamRolePolicyAttachedInline';

/**
 * .what = deletes an inline policy document from an iam role
 * .why = enables removal of permissions from roles
 */
export const delIamRolePolicyAttachedInline = asProcedure(
  async (
    input: {
      by: { ref: Ref<typeof DeclaredAwsIamRolePolicyAttachedInline> };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
    // resolve ref to unique (only unique refs supported for inline policies)
    if (
      !isRefByUnique({ of: DeclaredAwsIamRolePolicyAttachedInline })(
        input.by.ref,
      )
    )
      UnexpectedCodePathError.throw(
        'inline policies only support unique ref for deletion',
        { ref: input.by.ref },
      );
    const ref = input.by.ref;

    // resolve role reference to get role name
    const role = await DeclaredAwsIamRoleDao.get.one.byRef(ref.role, context);

    // if role doesn't exist, policy is already gone
    if (!role) return;

    // create iam client
    const iam = new IAMClient({ region: context.aws.credentials.region });

    // delete the policy
    try {
      await iam.send(
        new DeleteRolePolicyCommand({
          RoleName: role.name,
          PolicyName: ref.name,
        }),
      );
    } catch (error) {
      // ignore if policy doesn't exist
      if (error instanceof Error && error.name === 'NoSuchEntityException')
        return;
      throw error;
    }
  },
);
