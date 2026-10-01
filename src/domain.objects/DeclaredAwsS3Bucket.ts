import { DomainEntity } from 'domain-objects';

import { DeclaredAwsS3BucketAccess } from './DeclaredAwsS3BucketAccess';
import { DeclaredAwsS3BucketLifecycle } from './DeclaredAwsS3BucketLifecycle';
import { DeclaredAwsTags } from './DeclaredAwsTags';

/**
 * .what = a declarative structure that represents an AWS S3 Bucket
 * .why = the inbound mail store SES receipt rules deliver raw rfc822 into; also the general
 *   S3 bucket primitive
 *
 * .identity
 *   - @unique = [name] — bucket names are globally unique across all of aws
 *   - @primary = [name] — S3 assigns no separate id; the name IS the identity (the arn is the
 *     deterministic `arn:aws:s3:::<name>`)
 *
 * .note
 *   - the bucket's region is the provider's resolved region (CreateBucket LocationConstraint);
 *     it is not a declared field — the receive-capable region is a provider concern
 *   - lifecycle is a per-consumer choice; `null` = persist (no rule at all). the non-null modes
 *     are named by WHICH SUBJECT carries content (F16) — staircase (`objects.transitions`),
 *     auto-tier (`objects.expire`), and cleanup-only (`versions`/`multiparts` with `objects`
 *     empty, the backup-store shape). ⚠️ these are illustrative, not a closed set: the subjects
 *     compose freely, so a bucket may carry any combination of the three at once
 */
export interface DeclaredAwsS3Bucket {
  /**
   * .what = the globally-unique bucket name
   * .note = @unique + @primary
   * .example = 'ehmpathy-mail-inbound-demo'
   */
  name: string;

  /**
   * .what = the bucket's access posture (today: public access)
   * .note = roundtrip read-write — read via GetPublicAccessBlock (absent = no block written),
   *   written via PutPublicAccessBlock
   */
  access: DeclaredAwsS3BucketAccess;

  /**
   * .what = the lifecycle config, decomposed by what expires (objects | versions | multiparts)
   * .note = roundtrip read-write — read via GetBucketLifecycleConfiguration +
   *   GetBucketVersioning, written via PutBucketLifecycleConfiguration + PutBucketVersioning;
   *   null = persist (no lifecycle rule, no versioning)
   */
  lifecycle: DeclaredAwsS3BucketLifecycle | null;

  /**
   * .what = the tags applied to the bucket
   * .note = roundtrip read-write — read + written via the S3 bucket-tag apis; null = no tags
   */
  tags: DeclaredAwsTags | null;
}

export class DeclaredAwsS3Bucket
  extends DomainEntity<DeclaredAwsS3Bucket>
  implements DeclaredAwsS3Bucket
{
  /**
   * .what = the bucket name is the identity (S3 assigns no separate id)
   */
  public static primary = ['name'] as const;

  /**
   * .what = bucket names are globally unique across all of aws
   */
  public static unique = ['name'] as const;

  /**
   * .what = no aws-assigned identity attributes (the name is user-chosen)
   */
  public static metadata = [] as const;

  /**
   * .what = no intrinsic read-only attributes
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    access: DeclaredAwsS3BucketAccess,
    lifecycle: DeclaredAwsS3BucketLifecycle,
    tags: DeclaredAwsTags,
  };
}
