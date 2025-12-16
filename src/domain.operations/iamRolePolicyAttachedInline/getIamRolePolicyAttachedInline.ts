import { GetRolePolicyCommand, IAMClient } from '@aws-sdk/client-iam';
import { asProcedure } from 'as-procedure';
import type { RefByUnique } from 'domain-objects';
import type { VisualogicContext } from 'visualogic';

import { DeclaredAwsIamRoleDao } from '@src/access/daos/DeclaredAwsIamRoleDao';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsIamRolePolicyAttachedInline } from '@src/domain.objects/DeclaredAwsIamRolePolicyAttachedInline';
import { castIntoDeclaredAwsIamPolicyDocument } from '@src/domain.operations/iamRole/castIntoDeclaredAwsIamPolicyDocument';

import { castIntoDeclaredAwsIamRolePolicyAttachedInline } from './castIntoDeclaredAwsIamRolePolicyAttachedInline';

/**
 * .what = retrieves an inline policy document from an iam role
 * .why = enables lookup by unique key (role + policyName)
 */
export const getIamRolePolicyAttachedInline = asProcedure(
  async (
    input: {
      by: {
        unique: RefByUnique<typeof DeclaredAwsIamRolePolicyAttachedInline>;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<DeclaredAwsIamRolePolicyAttachedInline | null> => {
    // resolve role reference to get role name
    const role = await DeclaredAwsIamRoleDao.get.one.byRef(
      input.by.unique.role,
      context,
    );

    // if role doesn't exist, policy can't exist either
    if (!role) return null;

    // create iam client
    const iam = new IAMClient({ region: context.aws.credentials.region });

    // send command
    try {
      const response = await iam.send(
        new GetRolePolicyCommand({
          RoleName: role.name,
          PolicyName: input.by.unique.name,
        }),
      );

      // parse policy document (url-encoded json)
      const policyDocumentRaw = response.PolicyDocument
        ? JSON.parse(decodeURIComponent(response.PolicyDocument))
        : { Statement: [] };

      // cast to domain format
      const policyDocument =
        castIntoDeclaredAwsIamPolicyDocument(policyDocumentRaw);

      return castIntoDeclaredAwsIamRolePolicyAttachedInline({
        policyName: input.by.unique.name,
        roleName: role.name,
        policyDocument,
      });
    } catch (error) {
      // return null if policy not found
      if (error instanceof Error && error.name === 'NoSuchEntityException')
        return null;
      throw error;
    }
  },
);
