import { asProcedure } from 'as-procedure';
import type { Ref, RefByPrimary, RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { getActiveReceiptRuleSet } from '@src/access/sdks/sdkSes/getActiveReceiptRuleSet';
import { getReceiptRuleSet } from '@src/access/sdks/sdkSes/getReceiptRuleSet';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSesReceiptRuleSet } from '@src/domain.objects/DeclaredAwsSesReceiptRuleSet';

import { castIntoDeclaredAwsSesReceiptRuleSet } from './castIntoDeclaredAwsSesReceiptRuleSet';

/**
 * .what = gets a single SES receipt rule set from aws by primary/unique (name) or ref
 * .why = enables declarative drift detection; the active flag is derived from the account's
 *   ONE active rule set. returns null when absent so the plan reads CREATE rather than throw
 *   (rule.forbid.plan-fail-on-apply-guided-prereq)
 */
export const getOneSesReceiptRuleSet = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsSesReceiptRuleSet>;
        unique: RefByUnique<typeof DeclaredAwsSesReceiptRuleSet>;
        ref: Ref<typeof DeclaredAwsSesReceiptRuleSet>;
      }>;
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<DeclaredAwsSesReceiptRuleSet | null> => {
    // the name is the whole key across primary, unique, and ref
    const name =
      input.by.primary?.name ?? input.by.unique?.name ?? input.by.ref?.name;
    if (!name)
      UnexpectedCodePathError.throw(
        'getOneSesReceiptRuleSet got a ref with no name',
        { input },
      );

    // read the rule set (null if absent)
    const found = await getReceiptRuleSet({ name }, context);
    if (!found) return null;

    // derive whether this rule set is the account's active one
    const activeSet = await getActiveReceiptRuleSet({}, context);
    const active = activeSet?.name === name;

    // cast to domain format
    return castIntoDeclaredAwsSesReceiptRuleSet({ name, active });
  },
);
