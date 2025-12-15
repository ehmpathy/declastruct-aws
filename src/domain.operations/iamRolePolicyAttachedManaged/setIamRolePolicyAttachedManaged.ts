import { AttachRolePolicyCommand, IAMClient } from '@aws-sdk/client-iam';
import { asProcedure } from 'as-procedure';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { DeclaredAwsIamRoleDao } from '../../access/daos/DeclaredAwsIamRoleDao';
import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsIamRolePolicyAttachedManaged } from '../../domain.objects/DeclaredAwsIamRolePolicyAttachedManaged';
import { getIamRolePolicyAttachedManaged } from './getIamRolePolicyAttachedManaged';

/**
 * .what = attaches a managed policy to an iam role
 * .why = enables declarative managed policy attachment
 *
 * .note
 *   - AttachRolePolicy is idempotent, so findsert and upsert behave the same
 */
export const setIamRolePolicyAttachedManaged = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsIamRolePolicyAttachedManaged;
      upsert: DeclaredAwsIamRolePolicyAttachedManaged;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<DeclaredAwsIamRolePolicyAttachedManaged> => {
    const attachmentDesired = input.findsert ?? input.upsert;

    // resolve role reference to get role name
    const role = await DeclaredAwsIamRoleDao.get.one.byRef(
      attachmentDesired.role,
      context,
    );

    // failfast if role doesn't exist
    if (!role)
      UnexpectedCodePathError.throw('role not found for policy attachment', {
        role: attachmentDesired.role,
      });

    // check whether attachment already exists (for findsert optimization)
    if (input.findsert) {
      const before = await getIamRolePolicyAttachedManaged(
        {
          by: {
            unique: {
              role: attachmentDesired.role,
              policy: attachmentDesired.policy,
            },
          },
        },
        context,
      );
      if (before) return before;
    }

    // create iam client
    const iam = new IAMClient({ region: context.aws.credentials.region });

    // attach the managed policy
    await iam.send(
      new AttachRolePolicyCommand({
        RoleName: role.name,
        PolicyArn: attachmentDesired.policy.arn,
      }),
    );

    // fetch and return the attachment
    const result = await getIamRolePolicyAttachedManaged(
      {
        by: {
          unique: {
            role: attachmentDesired.role,
            policy: attachmentDesired.policy,
          },
        },
      },
      context,
    );

    // failfast if attachment not found after creation
    if (!result)
      UnexpectedCodePathError.throw('attachment not found after creation', {
        attachmentDesired,
      });

    return result;
  },
);
