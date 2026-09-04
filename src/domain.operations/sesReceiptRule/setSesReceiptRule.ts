import { asProcedure } from 'as-procedure';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { createReceiptRule } from '@src/access/sdks/sdkSes/createReceiptRule';
import { updateReceiptRule } from '@src/access/sdks/sdkSes/updateReceiptRule';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSesReceiptRule } from '@src/domain.objects/DeclaredAwsSesReceiptRule';

import { asReceiptRuleResolved } from './asReceiptRuleResolved';
import { getOneSesReceiptRule } from './getOneSesReceiptRule';

/**
 * .what = creates or updates an SES receipt rule (findsert | upsert)
 * .why = enables declarative management of the rule that routes inbound mail to actions
 *
 * .idempotency
 *   - findsert on the FULL unique key (ruleSet + name): return the extant unchanged if
 *     present, else create. a re-run converges to KEEP.
 *   - upsert converges the extant rule in place via UpdateReceiptRule.
 */
export const setSesReceiptRule = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsSesReceiptRule;
      upsert: DeclaredAwsSesReceiptRule;
    }>,
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<DeclaredAwsSesReceiptRule> => {
    const desired = input.findsert ?? input.upsert;
    const ruleSetName = desired.ruleSet.name;

    // find the extant rule by unique (rule set + name)
    const foundBefore = await getOneSesReceiptRule(
      { by: { unique: { ruleSet: desired.ruleSet, name: desired.name } } },
      context,
    );

    // findsert: return the extant unchanged
    if (foundBefore && input.findsert) return foundBefore;

    // derive the resolved rule (refs → arns) for the sdk boundary
    const resolved = asReceiptRuleResolved(desired, {
      account: context.aws.credentials.account,
      region: context.aws.credentials.region,
    });

    // update the extant rule in place; create it when absent
    if (foundBefore)
      await updateReceiptRule({ ruleSetName, rule: resolved }, context);
    if (!foundBefore)
      await createReceiptRule({ ruleSetName, rule: resolved }, context);

    // read back the written rule
    const foundAfter = await getOneSesReceiptRule(
      { by: { unique: { ruleSet: desired.ruleSet, name: desired.name } } },
      context,
    );

    // failfast if absent after set
    if (!foundAfter)
      UnexpectedCodePathError.throw('ses receipt rule not found after set', {
        desired,
      });

    return foundAfter;
  },
);
