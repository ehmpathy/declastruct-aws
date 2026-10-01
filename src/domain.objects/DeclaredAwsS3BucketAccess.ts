import { DomainLiteral } from 'domain-objects';

import { asCanonicalS3BucketPublicAccess } from './asCanonicalS3BucketPublicAccess';
import { DeclaredAwsS3BucketPublicAccess } from './DeclaredAwsS3BucketPublicAccess';

/**
 * .what = a bucket's access posture
 * .why = a backup store must state its own exposure; today the sole axis is public access
 *
 * .note
 *   - `public: 'blocked'` is the shorthand for all four sub-fields true (F15) — the safe,
 *     common case in one word
 *   - `public: { acls, policies }` states each of the 2×2 controls explicitly (F14)
 */
export interface DeclaredAwsS3BucketAccess {
  /**
   * .what = the public-access posture
   * .note = `'blocked'` = all four controls on; else the explicit 2×2
   */
  public: 'blocked' | DeclaredAwsS3BucketPublicAccess;
}

export class DeclaredAwsS3BucketAccess
  extends DomainLiteral<DeclaredAwsS3BucketAccess>
  implements DeclaredAwsS3BucketAccess
{
  /**
   * .what = canonicalizes `public` at construction, so the `'blocked'` token, a preset-const
   *   spread, and a bare four-boolean literal all reduce to the SAME explicit object
   * .why = declastruct decides KEEP via serialize(desired) === serialize(remote), and the DESIRED
   *   side is the caller's object verbatim (never round-tripped through the cast). the constructor
   *   is the only chokepoint BOTH the caller's object and the cast's read-back pass through, so
   *   the collapse must live here or `'blocked'` reads UPDATE forever (case=1 [t4], F14/F15)
   * .note = a DELIBERATE exception to the repo's "zero constructor overrides" convention
   *   (howto.domain-objects-nested-unions.md), structurally forced — it cannot move to a
   *   caller-invoked transformer (a caller would forget it) nor a schema .transform
   *   (domain-objects discards the parsed result). the same pattern as
   *   DeclaredAwsEc2LaunchTemplate's metadataOptions canonicalizer
   */
  constructor(
    props: DeclaredAwsS3BucketAccess,
    options?: { skip?: { schema?: boolean } },
  ) {
    super(
      { ...props, public: asCanonicalS3BucketPublicAccess(props.public) },
      options,
    );
  }

  /**
   * .what = nested domain object definitions
   * .note = `public` is canonicalized to an explicit object in the constructor above, so it always
   *   reaches hydration as an object (never the bare `'blocked'` token)
   */
  public static nested = {
    public: DeclaredAwsS3BucketPublicAccess,
  };
}
