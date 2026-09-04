import { asProcedure } from 'as-procedure';
import { isRefByUnique, type Ref } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import { delReceiptRule } from '@src/access/sdks/sdkSes/delReceiptRule';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSesReceiptRule } from '@src/domain.objects/DeclaredAwsSesReceiptRule';

/**
 * .what = deletes an SES receipt rule by unique ref (ruleSet + name)
 * .why = the idempotent destroy path the DAO's set.delete drives; an absent rule is a no-op
 *   so a repeat delete converges
 */
export const delSesReceiptRule = asProcedure(
  async (
    input: {
      by: { ref: Ref<typeof DeclaredAwsSesReceiptRule> };
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<void> => {
    // a receipt rule is keyed only by its unique (rule set + name)
    if (!isRefByUnique({ of: DeclaredAwsSesReceiptRule })(input.by.ref))
      UnexpectedCodePathError.throw(
        'receipt rules only support a unique ref for deletion',
        { ref: input.by.ref },
      );
    const ref = input.by.ref;

    // drop the receipt rule (idempotent)
    await delReceiptRule(
      { ruleSetName: ref.ruleSet.name, ruleName: ref.name },
      context,
    );
  },
);
