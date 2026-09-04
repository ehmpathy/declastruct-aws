import type { DeclaredAwsS3BucketLifecycleTransition } from '@src/domain.objects/DeclaredAwsS3BucketLifecycleTransition';

/**
 * .what = casts the declared lifecycle transitions into the putBucketLifecycle param shape
 * .why = strips each domain transition down to the plain `{ afterDays, class }` the s3
 *   communicator wants, so the setS3Bucket orchestrator reads as one named operation instead
 *   of an inline map (rule.forbid.inline-decode-friction)
 */
export const asBucketLifecycleTransitionParams = (input: {
  transitions: DeclaredAwsS3BucketLifecycleTransition[];
}): { afterDays: number; class: string }[] =>
  input.transitions.map((transition) => ({
    afterDays: transition.afterDays,
    class: transition.class,
  }));
