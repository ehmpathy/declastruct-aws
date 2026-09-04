import { DomainLiteral } from 'domain-objects';

/**
 * .what = an SES receipt-rule connect action — starts an Amazon Connect email contact
 * .why = niche; modeled for a faithful AWS mirror (`AWS::SES::ReceiptRule` ConnectAction)
 */
export interface DeclaredAwsSesReceiptActionConnect {
  /**
   * .what = the arn of the Amazon Connect instance
   */
  instanceArn: string;

  /**
   * .what = the arn of the iam role SES uses to start the email contact
   */
  iamRoleArn: string;
}

export class DeclaredAwsSesReceiptActionConnect
  extends DomainLiteral<DeclaredAwsSesReceiptActionConnect>
  implements DeclaredAwsSesReceiptActionConnect {}
