import { DomainLiteral } from 'domain-objects';

/**
 * .what = an SES receipt-rule add-header action — adds a header to the received email
 * .why = stamps a custom X-header onto the inbound message before later actions
 *   (`AWS::SES::ReceiptRule` AddHeaderAction)
 */
export interface DeclaredAwsSesReceiptActionAddHeader {
  /**
   * .what = the name of the header to add (alphanumeric + dashes, up to 50 chars)
   */
  headerName: string;

  /**
   * .what = the value of the header (up to 2048 chars, no newlines)
   */
  headerValue: string;
}

export class DeclaredAwsSesReceiptActionAddHeader
  extends DomainLiteral<DeclaredAwsSesReceiptActionAddHeader>
  implements DeclaredAwsSesReceiptActionAddHeader {}
