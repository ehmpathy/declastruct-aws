import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { DeclaredAwsSesReceiptRuleSet } from '@src/domain.objects/DeclaredAwsSesReceiptRuleSet';

import { delSesReceiptRuleSet } from './delSesReceiptRuleSet';
import { getOneSesReceiptRuleSet } from './getOneSesReceiptRuleSet';
import { setSesReceiptRuleSet } from './setSesReceiptRuleSet';

/**
 * .what = journey test for the ses receipt-rule-set lifecycle (findsert -> get ->
 *   findsert-again -> upsert -> del -> del-again) — the sdkSes (v1) family's integration proof
 * .why = validates the full plan/apply/idempotency contract against real SES v1 receipt. the
 *   rule set is the inbound-mail rule container
 * .note
 *   - active:FALSE throughout — a live set-active would contend for the account's ONE active
 *     slot (rule.forbid.silent-resource-theft). the active-steal guard is unit-tested separately
 *   - the set requires an inbound-capable region; the test runs in the provider's configured
 *     region (us-east-1 for the demo account), so it is exercised there
 *   - both-ends cleanup: delete before AND after so a crashed run self-heals (del is
 *     idempotent — a no-op if the set is absent), no scene-guard, no skip
 */
describe('sesReceiptRuleSet.journey', () => {
  const testName = `declastruct-test-ruleset-${genTestUuid().slice(0, 8)}`;

  const testRuleSet = DeclaredAwsSesReceiptRuleSet.as({
    name: testName,
    active: false,
  });

  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();

    // cleanup before: remove any leftover from a prior crashed run
    await delSesReceiptRuleSet({ by: { unique: { name: testName } } }, context);

    return { context };
  });

  afterAll(async () => {
    // cleanup after: fresh context so teardown runs even if scene setup failed
    const context = await getSampleAwsApiContext();
    await delSesReceiptRuleSet({ by: { unique: { name: testName } } }, context);
  });

  given('[case1] ses receipt rule set lifecycle', () => {
    const createdRuleSet = useBeforeAll(async () => {
      const { context } = scene;
      return setSesReceiptRuleSet({ findsert: testRuleSet }, context);
    });

    when('[t1] findsert rule set', () => {
      then('rule set is created with the declared name, inactive', () => {
        expect(createdRuleSet.name).toBe(testName);
        expect(createdRuleSet.active).toBe(false);
      });
    });

    when('[t2] getOne by unique', () => {
      then('returns the rule set with active derived false', async () => {
        const { context } = scene;
        const found = await getOneSesReceiptRuleSet(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(found).not.toBeNull();
        expect(found?.name).toBe(testName);
        expect(found?.active).toBe(false);
      });
    });

    when('[t3] findsert again', () => {
      then('returns the extant rule set unchanged (idempotent)', async () => {
        const { context } = scene;
        const again = await setSesReceiptRuleSet(
          { findsert: testRuleSet },
          context,
        );
        expect(again.name).toBe(testName);
        expect(again.active).toBe(false);
      });
    });

    when('[t4] upsert (still inactive)', () => {
      then('converges to the same inactive rule set', async () => {
        const { context } = scene;
        const reupserted = await setSesReceiptRuleSet(
          { upsert: testRuleSet },
          context,
        );
        expect(reupserted.name).toBe(testName);
        expect(reupserted.active).toBe(false);
      });
    });

    when('[t5] del rule set', () => {
      then('rule set is removed and getOne returns null', async () => {
        const { context } = scene;
        await delSesReceiptRuleSet(
          { by: { unique: { name: testName } } },
          context,
        );
        const gone = await getOneSesReceiptRuleSet(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(gone).toBeNull();
      });
    });

    when('[t6] del again', () => {
      then('is a no-op (idempotent — an absent set converges)', async () => {
        const { context } = scene;
        await expect(
          delSesReceiptRuleSet({ by: { unique: { name: testName } } }, context),
        ).resolves.toBeUndefined();
      });
    });
  });
});
