import { DomainEntity, RefByUnique } from 'domain-objects';

import { DeclaredAwsIamPolicyDocument } from './DeclaredAwsIamPolicyDocument';
import type { DeclaredAwsS3Bucket } from './DeclaredAwsS3Bucket';

/**
 * .what = the resource policy attached to an AWS S3 Bucket
 * .why = grants SES (this account only) `s3:PutObject` into the inbound mail store; the
 *   receipt rule's create-time test-put fails Access Denied without it
 *
 * .identity
 *   - @unique = [bucket] — a bucket has exactly one resource policy, so the bucket ref IS
 *     the identity
 *   - no @primary — a bucket policy has no arn of its own
 *
 * .note
 *   - the document reuses the shared iam policy dobjs (DeclaredAwsIamPolicyDocument /
 *     DeclaredAwsIamPolicyStatement); the SES grant's `aws:SourceArn` must name the RECEIPT
 *     RULE arn (not the rule-set) plus an `aws:SourceAccount` condition
 */
export interface DeclaredAwsS3BucketPolicy {
  /**
   * .what = reference to the bucket this policy is attached to
   * .note = @unique — one policy per bucket
   */
  bucket: RefByUnique<typeof DeclaredAwsS3Bucket>;

  /**
   * .what = the policy document that holds permission statements
   */
  document: DeclaredAwsIamPolicyDocument;
}

export class DeclaredAwsS3BucketPolicy
  extends DomainEntity<DeclaredAwsS3BucketPolicy>
  implements DeclaredAwsS3BucketPolicy
{
  /**
   * .what = a bucket has exactly one resource policy; the bucket ref is the identity
   * .note = a bucket policy has no arn, so no primary key
   */
  public static unique = ['bucket'] as const;

  /**
   * .what = no metadata — a bucket policy has no aws-assigned identity
   */
  public static metadata = [] as const;

  /**
   * .what = no readonly fields — all fields are user-defined
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    bucket: RefByUnique<typeof DeclaredAwsS3Bucket>,
    document: DeclaredAwsIamPolicyDocument,
  };
}
