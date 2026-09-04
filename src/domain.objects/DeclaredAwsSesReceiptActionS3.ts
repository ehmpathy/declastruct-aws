import { DomainLiteral, RefByUnique } from 'domain-objects';

import type { DeclaredAwsS3Bucket } from './DeclaredAwsS3Bucket';
import type { DeclaredAwsSnsTopic } from './DeclaredAwsSnsTopic';

/**
 * .what = an SES receipt-rule s3 action — saves the received message to an s3 bucket
 * .why = the receive path the vision centers: inbound mail → s3 prefix as raw rfc822
 *   (`AWS::SES::ReceiptRule` S3Action)
 */
export interface DeclaredAwsSesReceiptActionS3 {
  /**
   * .what = the destination bucket for the received message
   */
  bucket: RefByUnique<typeof DeclaredAwsS3Bucket>;

  /**
   * .what = the key prefix the message is stored under (null = bucket root)
   */
  objectKeyPrefix: string | null;

  /**
   * .what = an optional topic notified when the message is saved (null = no notify)
   */
  topic: RefByUnique<typeof DeclaredAwsSnsTopic> | null;

  /**
   * .what = an optional kms key arn SES encrypts the message with (null = none)
   */
  kmsKeyArn: string | null;
}

export class DeclaredAwsSesReceiptActionS3
  extends DomainLiteral<DeclaredAwsSesReceiptActionS3>
  implements DeclaredAwsSesReceiptActionS3
{
  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    bucket: RefByUnique<typeof DeclaredAwsS3Bucket>,
    topic: RefByUnique<typeof DeclaredAwsSnsTopic>,
  };
}
