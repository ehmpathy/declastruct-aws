import { asProcedure } from 'as-procedure';
import type { RefByUnique } from 'domain-objects';
import type { ContextLogTrail } from 'sdk-logs';

import { getReceiptRule } from '@src/access/sdks/sdkSes/getReceiptRule';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSesReceiptRule } from '@src/domain.objects/DeclaredAwsSesReceiptRule';

import { castIntoDeclaredAwsSesReceiptRule } from './castIntoDeclaredAwsSesReceiptRule';

/**
 * .what = gets a single SES receipt rule by unique (ruleSet + name)
 * .why = enables declarative drift detection; returns null when the set or the rule is absent
 *   so the plan reads CREATE rather than throw
 *   (rule.forbid.plan-fail-on-apply-guided-prereq)
 */
export const getOneSesReceiptRule = asProcedure(
  async (
    input: {
      by: { unique: RefByUnique<typeof DeclaredAwsSesReceiptRule> };
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<DeclaredAwsSesReceiptRule | null> => {
    // the unique key is the rule set + the rule name
    const ruleSetName = input.by.unique.ruleSet.name;
    const ruleName = input.by.unique.name;

    // read the rule (null if the set or the rule is absent)
    const resolved = await getReceiptRule({ ruleSetName, ruleName }, context);
    if (!resolved) return null;

    // cast to domain format
    return castIntoDeclaredAwsSesReceiptRule({ ruleSetName, resolved });
  },
);
