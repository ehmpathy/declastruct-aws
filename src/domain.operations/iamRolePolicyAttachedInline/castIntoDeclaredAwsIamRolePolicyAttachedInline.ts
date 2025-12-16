import { RefByUnique } from 'domain-objects';

import type { DeclaredAwsIamPolicyDocument } from '@src/domain.objects/DeclaredAwsIamPolicyDocument';
import type { DeclaredAwsIamRole } from '@src/domain.objects/DeclaredAwsIamRole';
import { DeclaredAwsIamRolePolicyAttachedInline } from '@src/domain.objects/DeclaredAwsIamRolePolicyAttachedInline';

/**
 * .what = casts aws sdk inline policy response to domain format
 * .why = enables domain-driven handling of inline role policies
 */
export const castIntoDeclaredAwsIamRolePolicyAttachedInline = (input: {
  policyName: string;
  roleName: string;
  policyDocument: DeclaredAwsIamPolicyDocument;
}): DeclaredAwsIamRolePolicyAttachedInline => {
  return new DeclaredAwsIamRolePolicyAttachedInline({
    name: input.policyName,
    role: RefByUnique.as<typeof DeclaredAwsIamRole>({ name: input.roleName }),
    document: input.policyDocument,
  });
};
