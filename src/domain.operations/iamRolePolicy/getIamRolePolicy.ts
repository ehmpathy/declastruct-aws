import { GetRolePolicyCommand, IAMClient } from '@aws-sdk/client-iam';
import { asProcedure } from 'as-procedure';
import { RefByUnique } from 'domain-objects';
import { VisualogicContext } from 'visualogic';

import { DeclaredAwsIamRoleDao } from '../../access/daos/DeclaredAwsIamRoleDao';
import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsIamRolePolicy } from '../../domain.objects/DeclaredAwsIamRolePolicy';
import { castIntoDeclaredAwsIamPolicyDocument } from '../iamRole/castIntoDeclaredAwsIamPolicyDocument';
import { castIntoDeclaredAwsIamRolePolicy } from './castIntoDeclaredAwsIamRolePolicy';

/**
 * .what = retrieves an inline policy from an iam role
 * .why = enables lookup by unique key (role + policyName)
 */
export const getIamRolePolicy = asProcedure(
  async (
    input: {
      by: { unique: RefByUnique<typeof DeclaredAwsIamRolePolicy> };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<DeclaredAwsIamRolePolicy | null> => {
    // resolve role reference to get role name
    const role = await DeclaredAwsIamRoleDao.get.byRef(
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

      return castIntoDeclaredAwsIamRolePolicy({
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
