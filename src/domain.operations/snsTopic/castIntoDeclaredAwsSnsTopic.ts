import { type HasReadonly, hasReadonly } from 'domain-objects';
import { assure } from 'type-fns';

import { DeclaredAwsSnsTopic } from '@src/domain.objects/DeclaredAwsSnsTopic';
import { DeclaredAwsTags } from '@src/domain.objects/DeclaredAwsTags';

/**
 * .what = transforms a raw SNS topic (arn + name + tags) into DeclaredAwsSnsTopic
 * .why = ensures type safety at the sdk boundary; tags read via ListTagsForResource so a
 *   re-plan converges to KEEP
 */
export const castIntoDeclaredAwsSnsTopic = (input: {
  arn: string;
  name: string;
  tags: Record<string, string> | null;
}): HasReadonly<typeof DeclaredAwsSnsTopic> => {
  return assure(
    DeclaredAwsSnsTopic.as({
      arn: input.arn,
      name: input.name,
      tags: input.tags ? new DeclaredAwsTags(input.tags) : null,
    }),
    hasReadonly({ of: DeclaredAwsSnsTopic }),
  );
};
