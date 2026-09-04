import { DomainEntity } from 'domain-objects';

/**
 * .what = an SES receipt rule set — the container for inbound-mail receipt rules
 * .why = groups the receipt rules that route inbound mail (e.g. to s3); AWS allows only ONE
 *   ACTIVE receipt rule set per account+region, so `active` is a guarded singleton
 *   (`AWS::SES::ReceiptRuleSet`)
 *
 * .identity
 *   - @primary = [name] — a rule set has no arn; its name is its whole identity
 *   - @unique = [name]
 *
 * .note = only the v1 SES api models receipt rules (they are absent from SESv2)
 */
export interface DeclaredAwsSesReceiptRuleSet {
  /**
   * .what = the rule-set name
   * .note = @primary + @unique — the whole identity
   */
  name: string;

  /**
   * .what = whether this rule set is the account+region's ACTIVE receipt rule set
   * .note = only one rule set can be active per region; a set-active on a foreign active set
   *   fails loud (rule.forbid.silent-resource-theft)
   */
  active: boolean;
}

export class DeclaredAwsSesReceiptRuleSet
  extends DomainEntity<DeclaredAwsSesReceiptRuleSet>
  implements DeclaredAwsSesReceiptRuleSet
{
  /**
   * .what = the name is the whole identity (no arn)
   */
  public static primary = ['name'] as const;

  /**
   * .what = rule-set names are unique within an account+region
   */
  public static unique = ['name'] as const;

  /**
   * .what = no aws-assigned metadata
   */
  public static metadata = [] as const;

  /**
   * .what = no readonly fields — name + active are both user-defined
   */
  public static readonly = [] as const;
}
