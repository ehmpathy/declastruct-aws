import { asProcedure } from 'as-procedure';
import type { Ref, RefByPrimary, RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { delReceiptRuleSet } from '@src/access/sdks/sdkSes/delReceiptRuleSet';
import { getActiveReceiptRuleSet } from '@src/access/sdks/sdkSes/getActiveReceiptRuleSet';
import { setActiveReceiptRuleSet } from '@src/access/sdks/sdkSes/setActiveReceiptRuleSet';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSesReceiptRuleSet } from '@src/domain.objects/DeclaredAwsSesReceiptRuleSet';

/**
 * .what = deletes an SES receipt rule set by primary/unique (name) or ref
 * .why = the idempotent destroy path the DAO's set.delete drives; aws forbids a delete of the
 *   ACTIVE set, so ours is deactivated first. an absent set is a no-op so a repeat converges
 */
export const delSesReceiptRuleSet = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsSesReceiptRuleSet>;
        unique: RefByUnique<typeof DeclaredAwsSesReceiptRuleSet>;
        ref: Ref<typeof DeclaredAwsSesReceiptRuleSet>;
      }>;
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<void> => {
    // the name is the whole key across primary, unique, and ref
    const name =
      input.by.primary?.name ?? input.by.unique?.name ?? input.by.ref?.name;
    if (!name)
      UnexpectedCodePathError.throw(
        'delSesReceiptRuleSet got a ref with no name',
        { input },
      );

    // deactivate ours first if it holds the active slot (aws forbids a delete of the active set)
    const activeSet = await getActiveReceiptRuleSet({}, context);
    if (activeSet?.name === name)
      await setActiveReceiptRuleSet({ name: null }, context);

    // delete the rule set (idempotent)
    await delReceiptRuleSet({ name }, context);
  },
);
