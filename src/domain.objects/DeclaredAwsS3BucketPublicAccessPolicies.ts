import { DomainLiteral } from 'domain-objects';

/**
 * .what = the public-policy controls of a bucket's public-access block (F14)
 * .why = a nested DomainLiteral so it hydrates + serializes as a leaf; declastruct's KEEP compare
 *   (`serialize(omitReadonly(bucket))`) refuses a bare object bag not declared in `static nested`
 *
 * .note
 *   - `block`    ← aws `BlockPublicPolicy`     — reject NEW public bucket policies
 *   - `restrict` ← aws `RestrictPublicBuckets` — neutralize EXTANT public policies. this is a
 *     POLICY field with a bucket's name on aws's own doc ("if the bucket has a public policy"),
 *     which is why it groups under `policies`, not a `buckets` group of one (F14 sub-call 2)
 */
export interface DeclaredAwsS3BucketPublicAccessPolicies {
  /**
   * .what = reject NEW public bucket policies (aws `BlockPublicPolicy`)
   */
  block: boolean;

  /**
   * .what = neutralize EXTANT public bucket policies (aws `RestrictPublicBuckets`)
   */
  restrict: boolean;
}

export class DeclaredAwsS3BucketPublicAccessPolicies
  extends DomainLiteral<DeclaredAwsS3BucketPublicAccessPolicies>
  implements DeclaredAwsS3BucketPublicAccessPolicies
{
  /**
   * .what = no nested domain objects — both controls are primitives
   */
  public static nested = {};
}
