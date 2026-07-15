import { RefByUnique } from 'domain-objects';
import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { DeclaredAwsBudget } from '@src/domain.objects/DeclaredAwsBudget';
import { DeclaredAwsBudgetAction } from '@src/domain.objects/DeclaredAwsBudgetAction';
import { DeclaredAwsIamRole } from '@src/domain.objects/DeclaredAwsIamRole';
import { setIamRole } from '@src/domain.operations/iamRole/setIamRole';

import { delBudget } from '../budget/delBudget';
import { setBudget } from '../budget/setBudget';
import { delBudgetAction } from './delBudgetAction';
import { getOneBudgetAction } from './getOneBudgetAction';
import { setBudgetAction } from './setBudgetAction';

/**
 * .what = journey test for the budget action (guard) lifecycle
 * .why = validates the full plan/apply/idempotency contract against real AWS Budgets
 * .note
 *   - exercises the APPLY_IAM_POLICY form — the member-account-safe guard shape:
 *     it attaches an AWS-managed policy (AWSDenyAll) to a role, so it needs NO
 *     management account (the SCP form does) and NO live instance id (the SSM form
 *     does). the test account CAN create this, so the case runs unconditionally
 *   - the guard's execution role is self-provisioned here via setIamRole (findsert),
 *     exactly as a user would declare it. it is a stable singleton (fixed name), so
 *     it is left in place across runs — findsert is a cheap no-op on repeat
 *   - the freeze target is the execution role itself: a harmless self-freeze that
 *     never fires at the test threshold (110% of a $21 budget with no real spend)
 *   - both-ends cleanup: delete the action + budget before AND after so a crashed
 *     run self-heals (the role persists — it is shared, stable infra)
 */
describe('budgetAction.journey', () => {
  // a unique name per run so parallel runs never collide
  const testName = `declastruct-test-action-${genTestUuid().slice(0, 8)}`;

  // the execution role AWS Budgets assumes to run the action (stable singleton)
  const executionRoleName = 'declastruct-test-budgets-action-role';

  // the execution role, trusted to budgets.amazonaws.com (self-provisioned in scene)
  const testRole = DeclaredAwsIamRole.as({
    name: executionRoleName,
    path: '/',
    description: 'role AWS Budgets assumes to run the journey-test guard',
    policies: [
      {
        effect: 'Allow',
        principal: { service: 'budgets.amazonaws.com' },
        action: 'sts:AssumeRole',
      },
    ],
    tags: { managedBy: 'declastruct', purpose: 'integration-test' },
  });

  const testBudget = DeclaredAwsBudget.as({
    name: testName,
    kind: 'COST',
    limit: { amount: '21', unit: 'USD' },
    timeUnit: 'MONTHLY',
    costFilters: null,
    tags: { managedBy: 'declastruct', purpose: 'integration-test' },
  });

  const testAction = DeclaredAwsBudgetAction.as({
    budget: { name: testName },
    kind: 'APPLY_IAM_POLICY',
    basis: 'ACTUAL',
    threshold: { quant: 110, unit: 'PERCENTAGE' },
    approvalModel: 'AUTOMATIC',
    executionRole: RefByUnique.as<typeof DeclaredAwsIamRole>({
      name: executionRoleName,
    }),
    definition: {
      scp: null,
      ssm: null,
      iam: {
        policyArn: 'arn:aws:iam::aws:policy/AWSDenyAll',
        roleNames: [executionRoleName],
        groupNames: [],
        userNames: [],
      },
    },
    subscribers: [{ via: 'EMAIL', address: 'ops@ehmpath.com' }],
  });

  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();

    // cleanup before: remove any leftover from a prior crashed run
    await delBudgetAction(
      {
        by: {
          unique: {
            budget: { name: testName },
            kind: 'APPLY_IAM_POLICY',
          },
        },
      },
      context,
    );
    await delBudget({ by: { unique: { name: testName } } }, context);

    // the action needs its execution role + its budget to exist first
    await setIamRole({ findsert: testRole }, context);
    await setBudget({ findsert: testBudget }, context);

    return { context };
  });

  afterAll(async () => {
    // cleanup after: fresh context so teardown runs even if scene setup failed
    // (del is idempotent — a no-op if the resource is absent). no scene-guard, no skip
    const context = await getSampleAwsApiContext();
    await delBudgetAction(
      {
        by: {
          unique: {
            budget: { name: testName },
            kind: 'APPLY_IAM_POLICY',
          },
        },
      },
      context,
    );
    await delBudget({ by: { unique: { name: testName } } }, context);
  });

  given('[case1] action lifecycle', () => {
    const createdAction = useBeforeAll(async () => {
      const { context } = scene;
      return setBudgetAction({ findsert: testAction }, context);
    });

    when('[t1] findsert action', () => {
      then(
        'action is created with an actionId and the declared threshold',
        () => {
          expect(createdAction.actionId).toBeDefined();
          expect(createdAction.kind).toBe('APPLY_IAM_POLICY');
          expect(createdAction.threshold.quant).toBe(110);
          expect(createdAction.definition.iam?.policyArn).toBe(
            'arn:aws:iam::aws:policy/AWSDenyAll',
          );
        },
      );
    });

    when('[t2] getOne by unique', () => {
      then('returns the action', async () => {
        const { context } = scene;
        const actionFound = await getOneBudgetAction(
          {
            by: {
              unique: {
                budget: { name: testName },
                kind: 'APPLY_IAM_POLICY',
              },
            },
          },
          context,
        );
        expect(actionFound).not.toBeNull();
        expect(actionFound?.kind).toBe('APPLY_IAM_POLICY');
      });
    });

    when('[t3] findsert again', () => {
      then('returns the extant action (idempotent)', async () => {
        const { context } = scene;
        const actionAgain = await setBudgetAction(
          { findsert: testAction },
          context,
        );
        expect(actionAgain.threshold.quant).toBe(110);
      });
    });

    when('[t4] upsert with a raised threshold', () => {
      then('overwrites the threshold in place', async () => {
        const { context } = scene;
        const actionRaised = await setBudgetAction(
          {
            upsert: DeclaredAwsBudgetAction.as({
              ...testAction,
              threshold: { quant: 120, unit: 'PERCENTAGE' },
            }),
          },
          context,
        );
        expect(actionRaised.threshold.quant).toBe(120);
      });
    });

    when('[t5] del action', () => {
      then('action is removed and getOne returns null', async () => {
        const { context } = scene;
        await delBudgetAction(
          {
            by: {
              unique: {
                budget: { name: testName },
                kind: 'APPLY_IAM_POLICY',
              },
            },
          },
          context,
        );
        const actionGone = await getOneBudgetAction(
          {
            by: {
              unique: {
                budget: { name: testName },
                kind: 'APPLY_IAM_POLICY',
              },
            },
          },
          context,
        );
        expect(actionGone).toBeNull();
      });
    });

    when('[t6] del again', () => {
      then('is a no-op (idempotent)', async () => {
        const { context } = scene;
        await expect(
          delBudgetAction(
            {
              by: {
                unique: {
                  budget: { name: testName },
                  kind: 'APPLY_IAM_POLICY',
                },
              },
            },
            context,
          ),
        ).resolves.toBeUndefined();
      });
    });
  });
});
