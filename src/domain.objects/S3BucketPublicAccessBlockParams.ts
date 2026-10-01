/**
 * .what = the s3 public-access block expressed in aws's own four-boolean vocabulary — the wire shape
 *   that crosses the sdk boundary in BOTH directions
 * .why = one declaration, three consumers, and the three form a ROUND TRIP:
 *     putBucketPublicAccessBlock (write) → getBucketPublicAccessBlock (read)
 *     → castIntoDeclaredAwsS3Bucket (decode)
 *   ⚠️ the same permadrift hazard `S3BucketLifecycleParams` carries, and here it is WORSE: a boolean
 *   dropped from both operands does not merely read KEEP, it reads KEEP on a SECURITY posture. the
 *   declared `access.public` would claim a bucket is blocked while the dropped axis was never written
 *
 * .note
 *   - it keeps aws's flat names (`blockPublicAcls`, …), deliberately. the FACTORED 2x2 our consumers
 *     declare — `access.public.acls.block` — lives in `DeclaredAwsS3BucketPublicAccess` (F14). this is
 *     the wire side of that translation, so it speaks aws's letters
 *   - it lives in `domain.objects/` so `access/sdks/` can reach it (rule.require.directional-deps)
 */
export interface S3BucketPublicAccessBlockParams {
  blockPublicAcls: boolean;
  ignorePublicAcls: boolean;
  blockPublicPolicy: boolean;
  restrictPublicBuckets: boolean;
}
