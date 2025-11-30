import { DeclaredAwsIamPolicyDocument } from '../../domain.objects/DeclaredAwsIamPolicyDocument';
import { DeclaredAwsIamRolePolicy } from '../../domain.objects/DeclaredAwsIamRolePolicy';

/**
 * .what = transforms aws sdk GetRolePolicyResponse to DeclaredAwsIamRolePolicy
 * .why = ensures type safety and domain object compliance
 */
export const castIntoDeclaredAwsIamRolePolicy = (input: {
  policyName: string;
  roleName: string;
  policyDocument: DeclaredAwsIamPolicyDocument;
}): DeclaredAwsIamRolePolicy =>
  // build role policy domain object
  DeclaredAwsIamRolePolicy.as({
    name: input.policyName,
    role: { name: input.roleName },
    statements: input.policyDocument.statements,
  });
