import { asProcedure } from 'as-procedure';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { createReceiptRuleSet } from '@src/access/sdks/sdkSes/createReceiptRuleSet';
import { getActiveReceiptRuleSet } from '@src/access/sdks/sdkSes/getActiveReceiptRuleSet';
import { setActiveReceiptRuleSet } from '@src/access/sdks/sdkSes/setActiveReceiptRuleSet';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSesReceiptRuleSet } from '@src/domain.objects/DeclaredAwsSesReceiptRuleSet';

import { assertSesInboundRegion } from './assertSesInboundRegion';
import { getOneSesReceiptRuleSet } from './getOneSesReceiptRuleSet';
import { getReceiptRuleSetActiveVerdict } from './getReceiptRuleSetActiveVerdict';

/**
 * .what = creates or updates an SES receipt rule set + its active status (findsert | upsert)
 * .why = enables declarative management of the inbound-mail rule container
 *
 * .idempotency
 *   - findsert on the FULL unique key (name): return the extant unchanged if present, else
 *     create + reconcile active. a re-run converges to KEEP.
 *   - upsert reconciles the active status every time.
 *
 * .guard = one active receipt rule set per account+region. a set-active while a DIFFERENT
 *   set is active fails loud (rule.forbid.silent-resource-theft) — never a silent steal of
 *   the one active slot.
 */
export const setSesReceiptRuleSet = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsSesReceiptRuleSet;
      upsert: DeclaredAwsSesReceiptRuleSet;
    }>,
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<DeclaredAwsSesReceiptRuleSet> => {
    const desired = input.findsert ?? input.upsert;

    // fail loud early if the region cannot receive mail — a receipt rule set in a
    // non-inbound region would surface a cryptic SES error deep in rule-create instead
    assertSesInboundRegion({ region: context.aws.credentials.region });

    // find the extant rule set by unique name
    const foundBefore = await getOneSesReceiptRuleSet(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // findsert: return the extant unchanged
    if (foundBefore && input.findsert) return foundBefore;

    // create the rule set (a no-op if already ours)
    await createReceiptRuleSet({ name: desired.name }, context);

    // reconcile the active status
    const activeSet = await getActiveReceiptRuleSet({}, context);
    const activeName = activeSet?.name ?? null;

    // decide how to reconcile the one active slot (fails loud on a FOREIGN active set)
    const verdict = getReceiptRuleSetActiveVerdict({
      desiredName: desired.name,
      desiredActive: desired.active,
      activeName,
    });

    // claim the active slot for ours
    if (verdict === 'activate')
      await setActiveReceiptRuleSet({ name: desired.name }, context);

    // clear the active slot ours currently holds
    if (verdict === 'deactivate')
      await setActiveReceiptRuleSet({ name: null }, context);

    // read back the written rule set
    const foundAfter = await getOneSesReceiptRuleSet(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // failfast if absent after set
    if (!foundAfter)
      UnexpectedCodePathError.throw(
        'ses receipt rule set not found after set',
        {
          desired,
        },
      );

    return foundAfter;
  },
);
