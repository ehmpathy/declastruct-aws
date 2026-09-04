import { type HasReadonly, hasReadonly } from 'domain-objects';
import { assure } from 'type-fns';

import { DeclaredAwsS3Bucket } from '@src/domain.objects/DeclaredAwsS3Bucket';
import { DeclaredAwsS3BucketLifecycle } from '@src/domain.objects/DeclaredAwsS3BucketLifecycle';
import {
  DeclaredAwsS3BucketLifecycleTransition,
  isDeclaredAwsS3StorageClass,
} from '@src/domain.objects/DeclaredAwsS3BucketLifecycleTransition';
import { DeclaredAwsTags } from '@src/domain.objects/DeclaredAwsTags';

/**
 * .what = transforms a raw S3 bucket (name + lifecycle + tags) into DeclaredAwsS3Bucket
 * .why = ensures type safety at the sdk boundary; lifecycle + tags read back so a re-plan
 *   converges to KEEP
 */
export const castIntoDeclaredAwsS3Bucket = (input: {
  name: string;
  lifecycle: {
    transitions: { afterDays: number; class: string }[];
    expireAfterDays: number | null;
  } | null;
  tags: Record<string, string> | null;
}): HasReadonly<typeof DeclaredAwsS3Bucket> => {
  return assure(
    DeclaredAwsS3Bucket.as({
      name: input.name,
      lifecycle: input.lifecycle
        ? new DeclaredAwsS3BucketLifecycle({
            transitions: input.lifecycle.transitions.map(
              (transition) =>
                new DeclaredAwsS3BucketLifecycleTransition({
                  afterDays: transition.afterDays,
                  // fail loud if aws returns a class outside our modeled union, rather than a
                  // silent mistype that would skew a plan diff (rule.require.assure-via-type-checks)
                  class: isDeclaredAwsS3StorageClass.assure(transition.class),
                }),
            ),
            expireAfterDays: input.lifecycle.expireAfterDays,
          })
        : null,
      tags: input.tags ? new DeclaredAwsTags(input.tags) : null,
    }),
    hasReadonly({ of: DeclaredAwsS3Bucket }),
  );
};
