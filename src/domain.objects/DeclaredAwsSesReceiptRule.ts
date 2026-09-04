import { DomainEntity, RefByUnique } from 'domain-objects';

import { DeclaredAwsSesReceiptAction } from './DeclaredAwsSesReceiptAction';
import type { DeclaredAwsSesReceiptRuleSet } from './DeclaredAwsSesReceiptRuleSet';

/**
 * .what = an SES receipt rule — routes inbound mail for chosen recipients to ordered actions
 * .why = the rule that says "for mail to these addresses, run these actions (e.g. save to
 *   s3)"; lives within a receipt rule set (`AWS::SES::ReceiptRule`)
 *
 * .identity
 *   - @unique = [ruleSet, name] — a rule is identified by its set + its name
 *   - no @primary — a receipt rule has no arn of its own
 */
export interface DeclaredAwsSesReceiptRule {
  /**
   * .what = reference to the rule set this rule belongs to
   * .note = @unique (with name)
   */
  ruleSet: RefByUnique<typeof DeclaredAwsSesReceiptRuleSet>;

  /**
   * .what = the rule name
   * .note = @unique (with ruleSet) — unique within the set
   */
  name: string;

  /**
   * .what = whether the rule is active (its actions run) or off
   */
  enabled: boolean;

  /**
   * .what = the recipient addresses/domains this rule applies to
   * .note = an empty list matches all recipients on all verified domains
   */
  recipients: string[];

  /**
   * .what = the ordered actions run on a matched message
   */
  actions: DeclaredAwsSesReceiptAction[];

  /**
   * .what = whether SES requires inbound mail over TLS ('Require') or not ('Optional')
   * .note = null = the AWS default ('Optional')
   */
  tlsPolicy: 'Require' | 'Optional' | null;

  /**
   * .what = whether matched messages are scanned for spam + viruses
   */
  scanEnabled: boolean;
}

export class DeclaredAwsSesReceiptRule
  extends DomainEntity<DeclaredAwsSesReceiptRule>
  implements DeclaredAwsSesReceiptRule
{
  /**
   * .what = unique within the set, identified by the set ref + rule name
   * .note = a receipt rule has no arn, so no primary key
   */
  public static unique = ['ruleSet', 'name'] as const;

  /**
   * .what = no metadata — a receipt rule has no aws-assigned identity
   */
  public static metadata = [] as const;

  /**
   * .what = no readonly fields — all fields are user-defined
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    ruleSet: RefByUnique<typeof DeclaredAwsSesReceiptRuleSet>,
    actions: DeclaredAwsSesReceiptAction,
  };
}
