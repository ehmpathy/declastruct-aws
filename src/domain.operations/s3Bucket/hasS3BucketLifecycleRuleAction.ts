import type { S3BucketLifecycleParams } from '@src/domain.objects/S3BucketLifecycleParams';

/**
 * .what = whether the lifecycle params carry >=1 rule action worth a PUT
 * .why = aws REJECTS an actionless rule, so `setS3Bucket` writes the rule only when an action is
 *   present, and deletes the rule otherwise. NOTE this is NOT the case=8 actionless-lifecycle guard:
 *   a version-state-only lifecycle (`versions: { status: 'enabled' }`, no expiry) has no RULE action
 *   yet is a valid declaration — its rule is deleted, its version-state is still written
 */
export const hasS3BucketLifecycleRuleAction = (
  params: S3BucketLifecycleParams,
): boolean =>
  params.transitions.length > 0 ||
  params.objectExpireDays != null ||
  params.versionExpiry != null ||
  params.multipartExpireDays != null;
