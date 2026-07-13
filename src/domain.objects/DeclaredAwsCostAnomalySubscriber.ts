import { DomainLiteral } from 'domain-objects';

/**
 * .what = a recipient of cost anomaly notifications — a delivery channel + address
 * .why = mirrors AWS's `Subscriber` shape ({ Type, Address }) for a subscription
 * .note
 *   - via is the delivery channel: EMAIL sends to an email address; SNS publishes
 *     to an SNS topic ARN
 *   - address is the email address (for EMAIL) or the SNS topic ARN (for SNS)
 */
export interface DeclaredAwsCostAnomalySubscriber {
  /**
   * .what = the notification delivery channel
   * .constraint = one of EMAIL | SNS
   */
  via: 'EMAIL' | 'SNS';

  /**
   * .what = the destination for the notification
   * .constraint = an email address (for EMAIL) or an SNS topic ARN (for SNS)
   */
  address: string;
}

export class DeclaredAwsCostAnomalySubscriber
  extends DomainLiteral<DeclaredAwsCostAnomalySubscriber>
  implements DeclaredAwsCostAnomalySubscriber {}
