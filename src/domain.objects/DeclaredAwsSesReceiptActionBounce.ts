import { DomainLiteral, RefByUnique } from 'domain-objects';

import type { DeclaredAwsSnsTopic } from './DeclaredAwsSnsTopic';

/**
 * .what = an SES receipt-rule bounce action — rejects the email with a bounce response
 * .why = returns a bounce (e.g. mailbox-does-not-exist) to the sender
 *   (`AWS::SES::ReceiptRule` BounceAction)
 */
export interface DeclaredAwsSesReceiptActionBounce {
  /**
   * .what = the smtp reply code (rfc 5321), e.g. '550'
   */
  smtpReplyCode: string;

  /**
   * .what = the smtp enhanced status code (rfc 3463), e.g. '5.1.1' (null = none)
   */
  statusCode: string | null;

  /**
   * .what = the human-readable text of the bounce message
   */
  message: string;

  /**
   * .what = the email address the bounce is sent from
   */
  sender: string;

  /**
   * .what = an optional topic notified when the bounce is taken (null = no notify)
   */
  topic: RefByUnique<typeof DeclaredAwsSnsTopic> | null;
}

export class DeclaredAwsSesReceiptActionBounce
  extends DomainLiteral<DeclaredAwsSesReceiptActionBounce>
  implements DeclaredAwsSesReceiptActionBounce
{
  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    topic: RefByUnique<typeof DeclaredAwsSnsTopic>,
  };
}
