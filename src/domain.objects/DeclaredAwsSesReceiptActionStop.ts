import { DomainLiteral, RefByUnique } from 'domain-objects';

import type { DeclaredAwsSnsTopic } from './DeclaredAwsSnsTopic';

/**
 * .what = an SES receipt-rule stop action — terminates evaluation of the rule set
 * .why = halts the rest of the receipt rule set for a matched message
 *   (`AWS::SES::ReceiptRule` StopAction)
 */
export interface DeclaredAwsSesReceiptActionStop {
  /**
   * .what = the scope of the stop — the only accepted value is 'RuleSet'
   */
  scope: 'RuleSet';

  /**
   * .what = an optional topic notified when the stop is taken (null = no notify)
   */
  topic: RefByUnique<typeof DeclaredAwsSnsTopic> | null;
}

export class DeclaredAwsSesReceiptActionStop
  extends DomainLiteral<DeclaredAwsSesReceiptActionStop>
  implements DeclaredAwsSesReceiptActionStop
{
  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    topic: RefByUnique<typeof DeclaredAwsSnsTopic>,
  };
}
