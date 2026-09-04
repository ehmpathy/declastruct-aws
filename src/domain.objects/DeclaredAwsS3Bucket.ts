import { DomainEntity } from 'domain-objects';

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
 *   - lifecycle is a per-consumer choice (persist | staircase | auto-tier); null = persist
 */
export interface DeclaredAwsS3Bucket {
  /**
   * .what = the globally-unique bucket name
   * .note = @unique + @primary
   * .example = 'ehmpathy-mail-inbound-demo'
   */
  name: string;

  /**
   * .what = the object-lifecycle config
   * .note = roundtrip read-write — read via GetBucketLifecycleConfiguration, written via
   *   PutBucketLifecycleConfiguration; null = persist (no lifecycle rule)
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
    lifecycle: DeclaredAwsS3BucketLifecycle,
    tags: DeclaredAwsTags,
  };
}
