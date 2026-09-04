import { type HasReadonly, hasReadonly } from 'domain-objects';
import { assure } from 'type-fns';

import { DeclaredAwsSesConfigurationSet } from '@src/domain.objects/DeclaredAwsSesConfigurationSet';
import { DeclaredAwsTags } from '@src/domain.objects/DeclaredAwsTags';

/**
 * .what = transforms a raw SES configuration set (name + tags) into
 *   DeclaredAwsSesConfigurationSet
 * .why = ensures type safety at the sdk boundary; tags read back so a re-plan converges to
 *   KEEP
 */
export const castIntoDeclaredAwsSesConfigurationSet = (input: {
  name: string;
  tags: Record<string, string> | null;
}): HasReadonly<typeof DeclaredAwsSesConfigurationSet> => {
  return assure(
    DeclaredAwsSesConfigurationSet.as({
      name: input.name,
      tags: input.tags ? new DeclaredAwsTags(input.tags) : null,
    }),
    hasReadonly({ of: DeclaredAwsSesConfigurationSet }),
  );
};
