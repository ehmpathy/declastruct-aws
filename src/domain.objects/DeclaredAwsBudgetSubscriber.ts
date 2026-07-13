import { DomainLiteral } from 'domain-objects';

/**
 * .what = a recipient of a budget notification — a channel + an address
 * .why = mirrors AWS's `Subscriber` shape ({ SubscriptionType, Address }) as the
 *        alert destination a DeclaredAwsBudgetNotification fans out to
 * .note
 *   - via is the channel: 'EMAIL' delivers to an inbox, 'SNS' to a topic arn
 *   - a notification may have one SNS subscriber and up to 10 email subscribers
 */
export interface DeclaredAwsBudgetSubscriber {
  /**
   * .what = the channel the alert is sent over
   * .constraint = one of EMAIL | SNS (maps to AWS SubscriptionType)
   */
  via: 'EMAIL' | 'SNS';

  /**
   * .what = where the alert is sent — an email inbox or an SNS topic arn
   * .constraint = an email address for EMAIL, a topic arn for SNS
   */
  address: string;
}

export class DeclaredAwsBudgetSubscriber
  extends DomainLiteral<DeclaredAwsBudgetSubscriber>
  implements DeclaredAwsBudgetSubscriber {}
