import { DeclaredAwsS3BucketPublicAccess } from './DeclaredAwsS3BucketPublicAccess';

/**
 * .what = collapses the THREE written forms of a public-access posture to ONE canonical object —
 *   the `'blocked'` token, a spread of a preset const, and a bare four-boolean literal all reduce
 *   to the same explicit `{ acls, policies }` shape
 * .why = declastruct decides KEEP via serialize(desired) === serialize(remote). the DESIRED side
 *   is the caller's object verbatim (never round-tripped through the cast), so a caller who writes
 *   `'blocked'` would otherwise never serialize-equal a bucket read back as four explicit booleans
 *   -> UPDATE forever -> the permadrift this wish exists to close (F14/F15, case=1). by
 *   canonicalizing in the constructor, BOTH the caller's object AND the cast's read-back collapse
 *   to the same form (rule.require.guaranteed-idempotency)
 *
 * .note
 *   - a bare `'blocked'` string never enters `static nested` hydration, so only this
 *     constructor-time canonicalization can make it serialize as all-four-true (case=1 [t4])
 *   - the canonical form is the EXPLICIT object (not the token), matching the CREATE diff the
 *     vision renders — the cast reads back four booleans, so the object is the shape both operands
 *     converge on
 */
export const asCanonicalS3BucketPublicAccess = (
  input: 'blocked' | DeclaredAwsS3BucketPublicAccess,
): DeclaredAwsS3BucketPublicAccess => {
  // the token expands to all four controls on (F15)
  if (input === 'blocked')
    return new DeclaredAwsS3BucketPublicAccess({
      acls: { block: true, ignore: true },
      policies: { block: true, restrict: true },
    });

  // an explicit object is already canonical
  return new DeclaredAwsS3BucketPublicAccess({
    acls: { block: input.acls.block, ignore: input.acls.ignore },
    policies: {
      block: input.policies.block,
      restrict: input.policies.restrict,
    },
  });
};
