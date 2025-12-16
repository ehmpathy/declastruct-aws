import type { Policy } from '@aws-sdk/client-iam';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsIamPolicy } from '@src/domain.objects/DeclaredAwsIamPolicy';
import { DeclaredAwsTags } from '@src/domain.objects/DeclaredAwsTags';
import { castIntoDeclaredAwsIamPolicyDocument } from '@src/domain.operations/iamPolicyDocument/castIntoDeclaredAwsIamPolicyDocument';

/**
 * .what = casts aws sdk policy response into domain format
 * .why = enables domain-driven handling of iam managed policies
 */
export const castIntoDeclaredAwsIamPolicy = (input: {
  policy: Policy;
  policyDocument: string | undefined;
  tags?: { Key?: string; Value?: string }[];
}): HasReadonly<typeof DeclaredAwsIamPolicy> => {
  // failfast if arn is not defined
  if (!input.policy.Arn)
    UnexpectedCodePathError.throw('policy arn is required', { input });

  // failfast if name is not defined
  if (!input.policy.PolicyName)
    UnexpectedCodePathError.throw('policy name is required', { input });
  // parse policy document
  const document = castIntoDeclaredAwsIamPolicyDocument(input.policyDocument);

  // parse tags
  const tags = input.tags?.length
    ? DeclaredAwsTags.as(
        Object.fromEntries(
          input.tags
            .filter((tag) => tag.Key && tag.Value)
            .map((tag) => [tag.Key!, tag.Value!]),
        ),
      )
    : undefined;

  return assure(
    DeclaredAwsIamPolicy.as({
      arn: input.policy.Arn,
      name: input.policy.PolicyName,
      path: input.policy.Path ?? '/',
      document,
      ...(input.policy.Description !== undefined && {
        description: input.policy.Description,
      }),
      ...(tags !== undefined && { tags }),
    }),
    hasReadonly({ of: DeclaredAwsIamPolicy }),
  );
};
