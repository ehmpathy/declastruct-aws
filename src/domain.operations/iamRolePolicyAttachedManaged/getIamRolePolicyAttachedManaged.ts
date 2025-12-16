import {
  IAMClient,
  ListAttachedRolePoliciesCommand,
} from '@aws-sdk/client-iam';
import { asProcedure } from 'as-procedure';
import { RefByPrimary, RefByUnique } from 'domain-objects';
import type { VisualogicContext } from 'visualogic';

import { DeclaredAwsIamRoleDao } from '@src/access/daos/DeclaredAwsIamRoleDao';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsIamPolicy } from '@src/domain.objects/DeclaredAwsIamPolicy';
import type { DeclaredAwsIamRole } from '@src/domain.objects/DeclaredAwsIamRole';
import { DeclaredAwsIamRolePolicyAttachedManaged } from '@src/domain.objects/DeclaredAwsIamRolePolicyAttachedManaged';

/**
 * .what = retrieves a managed policy attachment from an iam role
 * .why = enables lookup by unique key (role + policy arn)
 */
export const getIamRolePolicyAttachedManaged = asProcedure(
  async (
    input: {
      by: {
        unique: RefByUnique<typeof DeclaredAwsIamRolePolicyAttachedManaged>;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<DeclaredAwsIamRolePolicyAttachedManaged | null> => {
    // resolve role reference to get role name
    const role = await DeclaredAwsIamRoleDao.get.one.byRef(
      input.by.unique.role,
      context,
    );

    // if role doesn't exist, attachment can't exist either
    if (!role) return null;

    // create iam client
    const iam = new IAMClient({ region: context.aws.credentials.region });

    // list attached policies and check if our policy is attached
    const response = await iam.send(
      new ListAttachedRolePoliciesCommand({
        RoleName: role.name,
      }),
    );

    const targetArn = input.by.unique.policy.arn;
    const attached = response.AttachedPolicies?.find(
      (p) => p.PolicyArn === targetArn,
    );

    if (!attached) return null;

    return new DeclaredAwsIamRolePolicyAttachedManaged({
      role: RefByUnique.as<typeof DeclaredAwsIamRole>({ name: role.name }),
      policy: RefByPrimary.as<typeof DeclaredAwsIamPolicy>({ arn: targetArn }),
    });
  },
);
