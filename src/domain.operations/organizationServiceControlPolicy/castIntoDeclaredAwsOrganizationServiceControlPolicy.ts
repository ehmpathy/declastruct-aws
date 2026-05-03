import type { Policy } from '@aws-sdk/client-organizations';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsOrganizationServiceControlPolicy } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicy';
import { DeclaredAwsTags } from '@src/domain.objects/DeclaredAwsTags';
import { castIntoDeclaredAwsIamPolicyDocument } from '@src/domain.operations/iamPolicyDocument/castIntoDeclaredAwsIamPolicyDocument';

/**
 * .what = casts aws sdk policy response into domain format
 * .why = enables domain-driven SCP management
 */
export const castIntoDeclaredAwsOrganizationServiceControlPolicy = (input: {
  policy: Policy;
  tags?: { Key?: string; Value?: string }[];
}): HasReadonly<typeof DeclaredAwsOrganizationServiceControlPolicy> => {
  // failfast if id is not defined
  if (!input.policy.PolicySummary?.Id)
    UnexpectedCodePathError.throw('policy id is required', { input });

  // failfast if name is not defined
  if (!input.policy.PolicySummary?.Name)
    UnexpectedCodePathError.throw('policy name is required', { input });

  // parse policy content
  const content = castIntoDeclaredAwsIamPolicyDocument(input.policy.Content);

  // parse tags
  const tags = input.tags?.length
    ? DeclaredAwsTags.as(
        Object.fromEntries(
          input.tags
            .filter((tag) => tag.Key && tag.Value)
            .map((tag) => [tag.Key!, tag.Value!]),
        ),
      )
    : null;

  return assure(
    DeclaredAwsOrganizationServiceControlPolicy.as({
      id: input.policy.PolicySummary.Id,
      arn: input.policy.PolicySummary.Arn,
      name: input.policy.PolicySummary.Name,
      description: input.policy.PolicySummary.Description ?? null,
      content,
      tags,
    }),
    hasReadonly({ of: DeclaredAwsOrganizationServiceControlPolicy }),
  );
};
