/**
 * .what = the s3 lifecycle rule expressed in aws's own day-count vocabulary — the wire shape that
 *   crosses the sdk boundary in BOTH directions
 * .why = one declaration, four consumers, and the four form a ROUND TRIP:
 *     putBucketLifecycle (write) → getBucketLifecycle (read) → castIntoDeclaredAwsS3Bucket (decode)
 *     → doesS3BucketLifecycleReadMatchDesired (the stability predicate)
 *   ⚠️ a second copy of this shape is not merely duplication — it is a PERMADRIFT hazard. add an axis
 *   to the write's copy and not the read's, and the round trip silently drops it: the remote and the
 *   desired operands both lose the field, `serialize(remote) === serialize(desired)` holds, and the
 *   plan reads KEEP forever on a property that was never written. the acceptance suite cannot catch
 *   that — it gates on a non-KEEP, and this failure IS a KEEP (the wish's "silent half")
 *
 * .note
 *   - it lives in `domain.objects/` rather than beside its cast because `access/sdks/` must be able
 *     to reach it, and `access/` may import `domain.objects/` but never `domain.operations/`
 *     (rule.require.directional-deps)
 *   - it is the DAY-COUNT form, not the declared form. `DeclaredAwsS3BucketLifecycle` is what a
 *     consumer writes (`{ objects, versions, multiparts }`, durations as `IsoDurationInDays`); this
 *     is what aws speaks. `asS3BucketLifecycleParams` is the one procedure that collapses the first
 *     into the second
 */
export interface S3BucketLifecycleParams {
  transitions: { afterDays: number; class: string }[];
  objectExpireDays: number | null;
  versionExpiry: { afterDays: number | null; keep: number | null } | null;
  multipartExpireDays: number | null;
}
