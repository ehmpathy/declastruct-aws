import { DetachRolePolicyCommand, IAMClient } from '@aws-sdk/client-iam';
import { asProcedure } from 'as-procedure';
import { isRefByUnique, type Ref } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import { DeclaredAwsIamRoleDao } from '../../access/daos/DeclaredAwsIamRoleDao';
import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsIamRolePolicyAttachedManaged } from '../../domain.objects/DeclaredAwsIamRolePolicyAttachedManaged';

/**
 * .what = detaches a managed policy from an iam role
 * .why = enables removal of managed policy permissions from roles
 */
export const delIamRolePolicyAttachedManaged = asProcedure(
  async (
    input: {
      by: { ref: Ref<typeof DeclaredAwsIamRolePolicyAttachedManaged> };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
    // resolve ref to unique (only unique refs supported for attachments)
    if (
      !isRefByUnique({ of: DeclaredAwsIamRolePolicyAttachedManaged })(
        input.by.ref,
      )
    )
      UnexpectedCodePathError.throw(
        'policy attachments only support unique ref for deletion',
        { ref: input.by.ref },
      );
    const ref = input.by.ref;

    // resolve role reference to get role name
    const role = await DeclaredAwsIamRoleDao.get.one.byRef(ref.role, context);

    // if role doesn't exist, attachment is already gone
    if (!role) return;

    // create iam client
    const iam = new IAMClient({ region: context.aws.credentials.region });

    // detach the policy
    try {
      await iam.send(
        new DetachRolePolicyCommand({
          RoleName: role.name,
          PolicyArn: ref.policy.arn,
        }),
      );
    } catch (error) {
      // ignore if policy is not attached
      if (error instanceof Error && error.name === 'NoSuchEntityException')
        return;
      throw error;
    }
  },
);
