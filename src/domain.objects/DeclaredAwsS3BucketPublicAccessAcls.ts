import { DomainLiteral } from 'domain-objects';

/**
 * .what = the public-ACL controls of a bucket's public-access block (F14)
 * .why = a nested DomainLiteral so it hydrates + serializes as a leaf; declastruct's KEEP compare
 *   (`serialize(omitReadonly(bucket))`) refuses a bare object bag not declared in `static nested`
 *
 * .note
 *   - `block`  ← aws `BlockPublicAcls`  — reject NEW public acls
 *   - `ignore` ← aws `IgnorePublicAcls` — neutralize EXTANT public acls
 */
export interface DeclaredAwsS3BucketPublicAccessAcls {
  /**
   * .what = reject NEW public acls (aws `BlockPublicAcls`)
   */
  block: boolean;

  /**
   * .what = neutralize EXTANT public acls (aws `IgnorePublicAcls`)
   */
  ignore: boolean;
}

export class DeclaredAwsS3BucketPublicAccessAcls
  extends DomainLiteral<DeclaredAwsS3BucketPublicAccessAcls>
  implements DeclaredAwsS3BucketPublicAccessAcls
{
  /**
   * .what = no nested domain objects — both controls are primitives
   */
  public static nested = {};
}
