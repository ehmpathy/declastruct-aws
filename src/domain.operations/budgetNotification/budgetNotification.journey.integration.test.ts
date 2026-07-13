import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { DeclaredAwsBudget } from '@src/domain.objects/DeclaredAwsBudget';
import { DeclaredAwsBudgetNotification } from '@src/domain.objects/DeclaredAwsBudgetNotification';
import { delBudget } from '@src/domain.operations/budget/delBudget';
import { setBudget } from '@src/domain.operations/budget/setBudget';

import { delBudgetNotification } from './delBudgetNotification';
import { getOneBudgetNotification } from './getOneBudgetNotification';
import { setBudgetNotification } from './setBudgetNotification';

/**
 * .what = journey test for the budget notification lifecycle (findsert -> get -> del)
 * .why = validates the full plan/apply/idempotency contract against real AWS Budgets
 * .note
 *   - a budget + its notifications are self-account manageable, so this runs
 *     against the test/demo account (no management-account wall, unlike SCPs)
 *   - a notification REFERENCES a budget, so the budget is created first and torn
 *     down last; both-ends cleanup so a crashed run self-heals
 *   - Budgets is pinned to us-east-1 inside getAwsBudgetsClient
 */
describe('budgetNotification.journey', () => {
  // a unique budget name per run so parallel runs never collide
  const testBudgetName = `declastruct-test-budget-notif-${genTestUuid().slice(0, 8)}`;

  const testBudget = DeclaredAwsBudget.as({
    name: testBudgetName,
    kind: 'COST',
    limit: { amount: '21', unit: 'USD' },
    timeUnit: 'MONTHLY',
    costFilters: null,
    tags: null,
  });

  const testNotification = DeclaredAwsBudgetNotification.as({
    budget: { name: testBudgetName },
    basis: 'ACTUAL',
    comparison: 'GREATER_THAN',
    threshold: { quant: 80, unit: 'PERCENTAGE' },
    subscribers: [{ via: 'EMAIL', address: 'ops@ehmpath.com' }],
  });

  const notificationUnique = {
    budget: { name: testBudgetName },
    basis: 'ACTUAL' as const,
    comparison: 'GREATER_THAN' as const,
    threshold: { quant: 80, unit: 'PERCENTAGE' as const },
  };

  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();

    // cleanup before: remove any leftover from a prior crashed run
    await delBudgetNotification(
      { by: { unique: notificationUnique } },
      context,
    );
    await delBudget({ by: { unique: { name: testBudgetName } } }, context);

    // the notification references a budget, so create the budget first
    await setBudget({ findsert: testBudget }, context);

    return { context };
  });

  afterAll(async () => {
    // cleanup after: fresh context so teardown runs even if scene setup failed
    // (del is idempotent — a no-op if the resource is absent). no scene-guard, no skip
    const context = await getSampleAwsApiContext();
    // tear down the notification before its budget
    await delBudgetNotification(
      { by: { unique: notificationUnique } },
      context,
    );
    await delBudget({ by: { unique: { name: testBudgetName } } }, context);
  });

  given('[case1] budget notification lifecycle', () => {
    const createdNotification = useBeforeAll(async () => {
      const { context } = scene;
      return setBudgetNotification({ findsert: testNotification }, context);
    });

    when('[t1] findsert notification', () => {
      then('notification is created with the declared alert tuple', () => {
        expect(createdNotification.basis).toBe('ACTUAL');
        expect(createdNotification.comparison).toBe('GREATER_THAN');
        expect(createdNotification.threshold.quant).toBe(80);
        expect(createdNotification.threshold.unit).toBe('PERCENTAGE');
        expect(createdNotification.subscribers[0]?.address).toBe(
          'ops@ehmpath.com',
        );
      });
    });

    when('[t2] getOne by unique', () => {
      then('returns the notification', async () => {
        const { context } = scene;
        const notificationFound = await getOneBudgetNotification(
          { by: { unique: notificationUnique } },
          context,
        );
        expect(notificationFound).not.toBeNull();
        expect(notificationFound?.threshold.quant).toBe(80);
        expect(notificationFound?.threshold.unit).toBe('PERCENTAGE');
        expect(notificationFound?.subscribers[0]?.via).toBe('EMAIL');
      });
    });

    when('[t3] findsert again', () => {
      then('returns the extant notification (idempotent)', async () => {
        const { context } = scene;
        const notificationAgain = await setBudgetNotification(
          { findsert: testNotification },
          context,
        );
        expect(notificationAgain.threshold.quant).toBe(80);
        expect(notificationAgain.comparison).toBe('GREATER_THAN');
      });
    });

    when('[t4] del notification', () => {
      then('notification is removed and getOne returns null', async () => {
        const { context } = scene;
        await delBudgetNotification(
          { by: { unique: notificationUnique } },
          context,
        );
        const notificationGone = await getOneBudgetNotification(
          { by: { unique: notificationUnique } },
          context,
        );
        expect(notificationGone).toBeNull();
      });
    });

    when('[t5] del again', () => {
      then('is a no-op (idempotent)', async () => {
        const { context } = scene;
        await expect(
          delBudgetNotification(
            { by: { unique: notificationUnique } },
            context,
          ),
        ).resolves.toBeUndefined();
      });
    });
  });
});
