import { DomainLiteral } from 'domain-objects';

import { DeclaredAwsS3BucketPublicAccessAcls } from './DeclaredAwsS3BucketPublicAccessAcls';
import { DeclaredAwsS3BucketPublicAccessPolicies } from './DeclaredAwsS3BucketPublicAccessPolicies';

/**
 * .what = the public-access block config, factored on its two common nouns (F14)
 * .why = aws ships four flat booleans (`BlockPublicAcls`, `IgnorePublicAcls`, `BlockPublicPolicy`,
 *   `RestrictPublicBuckets`) whose own field docs each name their complement. that recovers a
 *   dense 2×2: `{acls, policies} × {reject new, neutralize extant}` — so the shape says the
 *   subject once per group, where aws says `Public` four times
 *
 * .note
 *   - `acls` and `policies` are each a nested DomainLiteral, so the whole config hydrates +
 *     serializes cleanly through declastruct's KEEP compare (no bare object bag)
 *   - the 2×2, spelled out: `acls.block` ← `BlockPublicAcls`, `acls.ignore` ← `IgnorePublicAcls`,
 *     `policies.block` ← `BlockPublicPolicy`, `policies.restrict` ← `RestrictPublicBuckets`
 */
export interface DeclaredAwsS3BucketPublicAccess {
  /**
   * .what = the public-ACL controls
   */
  acls: DeclaredAwsS3BucketPublicAccessAcls;

  /**
   * .what = the public-policy controls
   */
  policies: DeclaredAwsS3BucketPublicAccessPolicies;
}

export class DeclaredAwsS3BucketPublicAccess
  extends DomainLiteral<DeclaredAwsS3BucketPublicAccess>
  implements DeclaredAwsS3BucketPublicAccess
{
  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    acls: DeclaredAwsS3BucketPublicAccessAcls,
    policies: DeclaredAwsS3BucketPublicAccessPolicies,
  };
}
