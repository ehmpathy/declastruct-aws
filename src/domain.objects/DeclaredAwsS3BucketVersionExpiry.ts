import { DomainLiteral } from 'domain-objects';

import { IsoDurationInDays } from './IsoDurationInDays';

/**
 * .what = the hydration vehicle for a noncurrent-version expiry (`{ after, keep }`)
 * .why = a nested DomainLiteral so `expire` hydrates + serializes as a leaf through declastruct's
 *   KEEP compare. a DomainObject class cannot `implements` a union, so this class's OWN shape is
 *   the WIDENED `{ after: IsoDurationInDays | null, keep: number | null }`
 *
 * .note
 *   - this widened shape is NEVER a caller's declared type. the caller declares
 *     `DeclaredAwsS3BucketLifecycleVersions.expire`, whose type is the `VersionExpiry` UNION —
 *     which forbids the all-null arm at COMPILE time (F18, I-9, rule.prefer.prevent-over-correct
 *     rung 1). this class is only the runtime shape `expire` hydrates INTO, exactly as
 *     `'blocked' | DeclaredAwsS3BucketPublicAccess` hydrates into a DeclaredAwsS3BucketPublicAccess
 *   - `after` is itself a nested leaf (`{ days }`), so it too must be declared in `static nested`
 */
export interface DeclaredAwsS3BucketVersionExpiry {
  /**
   * .what = the age axis; a noncurrent version expires this long after it became noncurrent
   */
  after: IsoDurationInDays | null;

  /**
   * .what = the count axis; aws retains N newest noncurrent versions and deletes any BEYOND
   */
  keep: number | null;
}

export class DeclaredAwsS3BucketVersionExpiry
  extends DomainLiteral<DeclaredAwsS3BucketVersionExpiry>
  implements DeclaredAwsS3BucketVersionExpiry
{
  /**
   * .what = nested domain object definitions
   * .note = `after` is a `{ days }` leaf; `keep` is a primitive
   */
  public static nested = {
    after: IsoDurationInDays,
  };
}
