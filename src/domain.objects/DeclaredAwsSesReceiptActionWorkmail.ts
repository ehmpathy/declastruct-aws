import { DomainLiteral, RefByUnique } from 'domain-objects';

import type { DeclaredAwsSnsTopic } from './DeclaredAwsSnsTopic';

/**
 * .what = an SES receipt-rule workmail action — hands the message to Amazon WorkMail
 * .why = niche; modeled for a faithful AWS mirror (WorkMail usually adds this rule itself)
 *   (`AWS::SES::ReceiptRule` WorkmailAction)
 */
export interface DeclaredAwsSesReceiptActionWorkmail {
  /**
   * .what = the arn of the WorkMail organization
   */
  organizationArn: string;

  /**
   * .what = an optional topic notified when the WorkMail action is called (null = no notify)
   */
  topic: RefByUnique<typeof DeclaredAwsSnsTopic> | null;
}

export class DeclaredAwsSesReceiptActionWorkmail
  extends DomainLiteral<DeclaredAwsSesReceiptActionWorkmail>
  implements DeclaredAwsSesReceiptActionWorkmail
{
  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    topic: RefByUnique<typeof DeclaredAwsSnsTopic>,
  };
}
