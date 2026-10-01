import { DomainLiteral } from 'domain-objects';

import { IsoDurationInDays } from './IsoDurationInDays';

/**
 * .what = the lifecycle rule for INCOMPLETE multipart uploads (aws AbortIncompleteMultipartUpload)
 * .why = a dead writer's stranded upload parts accrue storage cost forever, invisible to
 *   `aws s3 ls`. this aborts them after N days
 *
 * .note
 *   - `expire` covers IN-PROGRESS parts ONLY — aws's own word is `AbortIncompleteMultipartUpload`,
 *     which this field drops. a COMPLETED upload is a current object; point it at `objects.expire`
 *     (F16 sub-call 3)
 *   - null = never abort (aws sends no AbortIncompleteMultipartUpload)
 */
export interface DeclaredAwsS3BucketLifecycleMultiparts {
  /**
   * .what = the age after upload initiation before an INCOMPLETE multipart upload is aborted
   * .note = in-progress parts only; a completed upload is governed by `objects.expire`. null =
   *   never abort
   */
  expire: IsoDurationInDays | null;
}

export class DeclaredAwsS3BucketLifecycleMultiparts
  extends DomainLiteral<DeclaredAwsS3BucketLifecycleMultiparts>
  implements DeclaredAwsS3BucketLifecycleMultiparts
{
  /**
   * .what = nested domain object definitions
   * .note = `expire` hydrates as an `IsoDurationInDays` leaf (null is skipped)
   */
  public static nested = {
    expire: IsoDurationInDays,
  };
}
