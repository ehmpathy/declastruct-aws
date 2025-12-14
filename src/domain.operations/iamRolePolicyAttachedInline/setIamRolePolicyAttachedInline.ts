import { IAMClient, PutRolePolicyCommand } from '@aws-sdk/client-iam';
import { asProcedure } from 'as-procedure';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { DeclaredAwsIamRoleDao } from '../../access/daos/DeclaredAwsIamRoleDao';
import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsIamRolePolicyAttachedInline } from '../../domain.objects/DeclaredAwsIamRolePolicyAttachedInline';
import { castFromDeclaredAwsIamPolicyDocument } from '../iamRole/castFromDeclaredAwsIamPolicyDocument';
import { getIamRolePolicyAttachedInline } from './getIamRolePolicyAttachedInline';

/**
 * .what = creates or updates an inline policy document on an iam role
 * .why = enables declarative permission management
 */
export const setIamRolePolicyAttachedInline = asProcedure(
  async (
    input: PickOne<{
      finsert: DeclaredAwsIamRolePolicyAttachedInline;
      upsert: DeclaredAwsIamRolePolicyAttachedInline;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<DeclaredAwsIamRolePolicyAttachedInline> => {
    const policyDesired = input.finsert ?? input.upsert;

    // resolve role reference to get role name
    const role = await DeclaredAwsIamRoleDao.get.one.byRef(
      policyDesired.role,
      context,
    );

    // failfast if role doesn't exist
    if (!role)
      UnexpectedCodePathError.throw('role not found for policy attachment', {
        role: policyDesired.role,
      });

    // check whether policy already exists
    const before = await getIamRolePolicyAttachedInline(
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
    const policyDocument = castFromDeclaredAwsIamPolicyDocument(
      policyDesired.document,
    );

    // put role policy (creates or updates)
    await iam.send(
      new PutRolePolicyCommand({
        RoleName: role.name,
        PolicyName: policyDesired.name,
        PolicyDocument: policyDocument,
      }),
    );

    // fetch and return the policy
    const result = await getIamRolePolicyAttachedInline(
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
