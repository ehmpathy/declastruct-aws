import { IAMClient, PutRolePolicyCommand } from '@aws-sdk/client-iam';
import { asProcedure } from 'as-procedure';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { DeclaredAwsIamRoleDao } from '../../access/daos/DeclaredAwsIamRoleDao';
import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsIamRolePolicy } from '../../domain.objects/DeclaredAwsIamRolePolicy';
import { castFromDeclaredAwsIamPolicyDocument } from '../iamRole/castFromDeclaredAwsIamPolicyDocument';
import { getIamRolePolicy } from './getIamRolePolicy';

/**
 * .what = creates or updates an inline policy on an iam role
 * .why = enables declarative permission management
 */
export const setIamRolePolicy = asProcedure(
  async (
    input: PickOne<{
      finsert: DeclaredAwsIamRolePolicy;
      upsert: DeclaredAwsIamRolePolicy;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<DeclaredAwsIamRolePolicy> => {
    const policyDesired = input.finsert ?? input.upsert;

    // resolve role reference to get role name
    const role = await DeclaredAwsIamRoleDao.get.byRef(
      policyDesired.role,
      context,
    );

    // failfast if role doesn't exist
    if (!role)
      UnexpectedCodePathError.throw('role not found for policy attachment', {
        role: policyDesired.role,
      });

    // check whether policy already exists
    const before = await getIamRolePolicy(
      {
        by: { unique: { name: policyDesired.name, role: policyDesired.role } },
      },
      context,
    );

    // if it's a finsert and had a before, then return that
    if (before && input.finsert) return before;

    // create iam client
    const iam = new IAMClient({ region: context.aws.credentials.region });

    // build policy document from statements
    const policyDocument = castFromDeclaredAwsIamPolicyDocument({
      statements: policyDesired.statements,
    });

    // put role policy (creates or updates)
    await iam.send(
      new PutRolePolicyCommand({
        RoleName: role.name,
        PolicyName: policyDesired.name,
        PolicyDocument: policyDocument,
      }),
    );

    // fetch and return the policy
    const result = await getIamRolePolicy(
      {
        by: { unique: { name: policyDesired.name, role: policyDesired.role } },
      },
      context,
    );

    // failfast if policy not found after creation
    if (!result)
      UnexpectedCodePathError.throw('policy not found after creation', {
        policyDesired,
      });

    return result;
  },
);
