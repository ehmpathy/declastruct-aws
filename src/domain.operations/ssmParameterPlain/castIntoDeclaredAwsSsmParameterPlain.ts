import { isUniDateTime } from '@ehmpathy/uni-time';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { assure } from 'type-fns';

import { DeclaredAwsSsmParameterPlain } from '@src/domain.objects/DeclaredAwsSsmParameterPlain';
import { DeclaredAwsTags } from '@src/domain.objects/DeclaredAwsTags';

/**
 * .what = transforms a raw SSM parameter (value + metadata + tags) into
 *   DeclaredAwsSsmParameterPlain
 * .why = ensures type safety and readonly field enforcement at the sdk boundary. value is read
 *   via GetParameter; description via DescribeParameters; tags via ListTagsForResource — so the
 *   roundtrip fields read back exactly what was written and a re-plan converges to KEEP.
 */
export const castIntoDeclaredAwsSsmParameterPlain = (input: {
  name: string;
  value: string;
  arn: string;
  description: string | null;
  tags: Record<string, string> | null;
  version: number;
  lastModifiedAt: string;
}): HasReadonly<typeof DeclaredAwsSsmParameterPlain> => {
  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsSsmParameterPlain.as({
      arn: input.arn,
      name: input.name,
      value: input.value,
      description: input.description,
      tags: input.tags ? new DeclaredAwsTags(input.tags) : null,
      version: input.version,
      lastModifiedAt: isUniDateTime.assure(input.lastModifiedAt),
    }),
    hasReadonly({ of: DeclaredAwsSsmParameterPlain }),
  );
};
