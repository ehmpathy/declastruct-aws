import { DeclaredAwsSesReceiptRuleSet } from '@src/domain.objects/DeclaredAwsSesReceiptRuleSet';

/**
 * .what = transforms a raw SES receipt rule set (name + active) into
 *   DeclaredAwsSesReceiptRuleSet
 * .why = ensures type safety at the sdk boundary; the active flag round-trips so a re-plan
 *   converges to KEEP
 */
export const castIntoDeclaredAwsSesReceiptRuleSet = (input: {
  name: string;
  active: boolean;
}): DeclaredAwsSesReceiptRuleSet => {
  return DeclaredAwsSesReceiptRuleSet.as({
    name: input.name,
    active: input.active,
  });
};
