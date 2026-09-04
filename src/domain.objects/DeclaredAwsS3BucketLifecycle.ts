import { DomainLiteral } from 'domain-objects';

import { DeclaredAwsS3BucketLifecycleTransition } from './DeclaredAwsS3BucketLifecycleTransition';

/**
 * .what = an S3 bucket object-lifecycle config (aws PutBucketLifecycleConfiguration)
 * .why = the per-consumer archival choice the vision locks: model all three modes as one
 *   shape —
 *     - persist: a null lifecycle on the bucket (no rule at all)
 *     - staircase: a declared transition schedule (Standard -> GLACIER_IR -> DEEP_ARCHIVE at
 *       day thresholds), optionally with an expiry at the end
 *     - auto-tier: a single `afterDays: 0 -> INTELLIGENT_TIERING` transition (aws moves
 *       objects between access classes by observed access pattern)
 *
 * .note = declastruct manages a SINGLE whole-bucket rule, so the transitions apply to every
 *   object; a prefix-scoped rule is a later add (rule.prefer.wet-over-dry)
 */
export interface DeclaredAwsS3BucketLifecycle {
  /**
   * .what = the ordered transitions (each moves objects to a colder class after N days)
   */
  transitions: DeclaredAwsS3BucketLifecycleTransition[];

  /**
   * .what = days after object creation before it expires (is deleted)
   * .note = null = never expire (keep in the coldest class forever)
   */
  expireAfterDays: number | null;
}

export class DeclaredAwsS3BucketLifecycle
  extends DomainLiteral<DeclaredAwsS3BucketLifecycle>
  implements DeclaredAwsS3BucketLifecycle
{
  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    transitions: DeclaredAwsS3BucketLifecycleTransition,
  };
}
