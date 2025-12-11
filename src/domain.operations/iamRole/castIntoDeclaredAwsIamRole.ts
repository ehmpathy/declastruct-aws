import type { Role as SdkAwsRole } from '@aws-sdk/client-iam';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsIamRole } from '../../domain.objects/DeclaredAwsIamRole';
import { castIntoDeclaredAwsIamPolicyDocument } from './castIntoDeclaredAwsIamPolicyDocument';

/**
 * .what = transforms aws sdk Role response to DeclaredAwsIamRole
 * .why = ensures type safety and readonly field enforcement
 */
export const castIntoDeclaredAwsIamRole = (
  role: SdkAwsRole,
): HasReadonly<typeof DeclaredAwsIamRole> => {
  // failfast if role name is not defined
  if (!role.RoleName)
    UnexpectedCodePathError.throw(
      'role lacks name; cannot cast to domain object',
      { role },
    );

  // failfast if role arn is not defined
  if (!role.Arn)
    UnexpectedCodePathError.throw(
      'role lacks arn; cannot cast to domain object',
      { role },
    );

  // parse trust policy document (url-encoded json)
  const trustPolicyDocRaw = role.AssumeRolePolicyDocument
    ? JSON.parse(decodeURIComponent(role.AssumeRolePolicyDocument))
    : { Statement: [] };

  // cast to domain format
  const document = castIntoDeclaredAwsIamPolicyDocument(trustPolicyDocRaw);

  // parse tags (only include if present)
  const tags = role.Tags?.length
    ? role.Tags.reduce(
        (acc, tag) => {
          if (tag.Key && tag.Value) acc[tag.Key] = tag.Value;
          return acc;
        },
        {} as Record<string, string>,
      )
    : undefined;

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsIamRole.as({
      arn: role.Arn,
      name: role.RoleName,
      path: role.Path,
      policies: document.statements,
      ...(role.Description !== undefined && { description: role.Description }),
      ...(tags !== undefined && { tags }),
    }),
    hasReadonly({ of: DeclaredAwsIamRole }),
  );
};
