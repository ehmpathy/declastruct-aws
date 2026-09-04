import { DomainLiteral, RefByUnique } from 'domain-objects';

import type { DeclaredAwsSnsTopic } from './DeclaredAwsSnsTopic';

/**
 * .what = an SES receipt-rule sns action — publishes the email content to an sns topic
 * .why = a receipt rule can notify a topic with the full message (<= 150 KB)
 *   (`AWS::SES::ReceiptRule` SNSAction)
 */
export interface DeclaredAwsSesReceiptActionSns {
  /**
   * .what = the topic the email content is published to
   */
  topic: RefByUnique<typeof DeclaredAwsSnsTopic>;

  /**
   * .what = the charset the email is encoded as within the notification (null = UTF-8 default)
   */
  encodeAs: 'UTF-8' | 'Base64' | null;
}

export class DeclaredAwsSesReceiptActionSns
  extends DomainLiteral<DeclaredAwsSesReceiptActionSns>
  implements DeclaredAwsSesReceiptActionSns
{
  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    topic: RefByUnique<typeof DeclaredAwsSnsTopic>,
  };
}
