import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { DeclaredAwsBudget } from '@src/domain.objects/DeclaredAwsBudget';

import { delBudget } from './delBudget';
import { getOneBudget } from './getOneBudget';
import { setBudget } from './setBudget';

/**
 * .what = journey test for the budget lifecycle (findsert -> get -> upsert -> del)
 * .why = validates the full plan/apply/idempotency contract against real AWS Budgets
 * .note
 *   - a budget can be created by the account for ITSELF, so this runs against the
 *     test/demo account (no management-account wall, unlike SCPs)
 *   - Budgets is pinned to us-east-1 inside getAwsBudgetsClient
 *   - both-ends cleanup: delete before AND after so a crashed run self-heals
 */
describe('budget.journey', () => {
  // a unique name per run so parallel runs never collide
  const testName = `declastruct-test-budget-${genTestUuid().slice(0, 8)}`;

  const testBudget = DeclaredAwsBudget.as({
    name: testName,
    kind: 'COST',
    limit: { amount: '21', unit: 'USD' },
    timeUnit: 'MONTHLY',
    costFilters: null,
    tags: { managedBy: 'declastruct', purpose: 'integration-test' },
  });

  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();

    // cleanup before: remove any leftover from a prior crashed run
    await delBudget({ by: { unique: { name: testName } } }, context);

    return { context };
  });

  afterAll(async () => {
    // cleanup after: fresh context so teardown runs even if scene setup failed
    // (del is idempotent — a no-op if the budget is absent). no scene-guard, no skip
    const context = await getSampleAwsApiContext();
    await delBudget({ by: { unique: { name: testName } } }, context);
  });

  given('[case1] budget lifecycle', () => {
    const createdBudget = useBeforeAll(async () => {
      const { context } = scene;
      return setBudget({ findsert: testBudget }, context);
    });

    when('[t1] findsert budget', () => {
      then('budget is created with the declared cap', () => {
        expect(createdBudget.name).toBe(testName);
        expect(createdBudget.limit.amount).toBe('21');
        expect(createdBudget.limit.unit).toBe('USD');
        expect(createdBudget.timeUnit).toBe('MONTHLY');
      });
    });

    when('[t2] getOne by unique', () => {
      then('returns the budget', async () => {
        const { context } = scene;
        const budgetFound = await getOneBudget(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(budgetFound).not.toBeNull();
        expect(budgetFound?.name).toBe(testName);
        expect(budgetFound?.tags?.managedBy).toBe('declastruct');
      });
    });

    when('[t3] findsert again', () => {
      then('returns the extant budget (idempotent)', async () => {
        const { context } = scene;
        const budgetAgain = await setBudget({ findsert: testBudget }, context);
        expect(budgetAgain.name).toBe(testName);
        expect(budgetAgain.limit.amount).toBe('21');
      });
    });

    when('[t4] upsert with a raised cap', () => {
      then('updates the cap in place', async () => {
        const { context } = scene;
        const budgetRaised = await setBudget(
          {
            upsert: DeclaredAwsBudget.as({
              ...testBudget,
              limit: { amount: '42', unit: 'USD' },
            }),
          },
          context,
        );
        expect(budgetRaised.limit.amount).toBe('42');
      });
    });

    when('[t5] del budget', () => {
      then('budget is removed and getOne returns null', async () => {
        const { context } = scene;
        await delBudget({ by: { unique: { name: testName } } }, context);
        const budgetGone = await getOneBudget(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(budgetGone).toBeNull();
      });
    });

    when('[t6] del again', () => {
      then('is a no-op (idempotent)', async () => {
        const { context } = scene;
        await expect(
          delBudget({ by: { unique: { name: testName } } }, context),
        ).resolves.toBeUndefined();
      });
    });
  });
});
