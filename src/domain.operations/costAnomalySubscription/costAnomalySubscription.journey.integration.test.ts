import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import {
  genTestAnomalyMonitorShared,
  TEST_ANOMALY_MONITOR_NAME_SHARED,
} from '@src/.test/getTestAnomalyMonitorShared';
import { DeclaredAwsCostAnomalySubscription } from '@src/domain.objects/DeclaredAwsCostAnomalySubscription';

import { delCostAnomalySubscription } from './delCostAnomalySubscription';
import { getOneCostAnomalySubscription } from './getOneCostAnomalySubscription';
import { setCostAnomalySubscription } from './setCostAnomalySubscription';

/**
 * .what = journey test for the cost anomaly subscription lifecycle
 *         (findsert -> get -> findsert idempotent -> upsert tags -> del -> del no-op)
 * .why = validates the full plan/apply/idempotency contract against real AWS Cost
 *        Explorer Cost Anomaly Detection
 * .note
 *   - a subscription references a monitor. AWS caps DIMENSIONAL monitors at ONE per
 *     account, so this findserts the SHARED dimensional monitor (never a uuid one)
 *     and NEVER deletes it — see getTestAnomalyMonitorShared. only the subscription
 *     (which has no such cap) is uniquely named + torn down here
 *   - subscription CRUD is self-account manageable (no management-account wall)
 *   - Cost Explorer is pinned to us-east-1 inside getAwsCostExplorerClient
 *   - both-ends cleanup: delete the subscription before AND after so a crash self-heals
 */
describe('costAnomalySubscription.journey', () => {
  // a unique subscription name per run so parallel runs never collide (subscriptions
  // are not capped per account; the shared monitor is — hence the shared fixture)
  const testSubscriptionName = `declastruct-test-casub-${genTestUuid().slice(0, 8)}`;

  const testSubscription = DeclaredAwsCostAnomalySubscription.as({
    name: testSubscriptionName,
    monitor: { name: TEST_ANOMALY_MONITOR_NAME_SHARED },
    frequency: 'DAILY',
    threshold: { amount: '100', unit: 'USD' },
    subscribers: [{ via: 'EMAIL', address: 'declastruct-test@ehmpathy.com' }],
    tags: { managedBy: 'declastruct', purpose: 'integration-test' },
  });

  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();

    // cleanup before: remove any leftover subscription from a prior crashed run
    await delCostAnomalySubscription(
      { by: { unique: { name: testSubscriptionName } } },
      context,
    );

    // sweep orphan test monitors, then findsert the SHARED dimensional monitor
    // (reuse if extant; never delete it) so the subscription has a monitor to ref
    await genTestAnomalyMonitorShared(context);

    return { context };
  });

  afterAll(async () => {
    // cleanup after: fresh context so teardown runs even if scene setup failed
    // (del is idempotent — a no-op if the resource is absent). no scene-guard, no skip
    // tear down ONLY the subscription — the shared monitor is a persistent singleton
    const context = await getSampleAwsApiContext();
    await delCostAnomalySubscription(
      { by: { unique: { name: testSubscriptionName } } },
      context,
    );
  });

  given('[case1] subscription lifecycle', () => {
    const createdSubscription = useBeforeAll(async () => {
      const { context } = scene;
      return setCostAnomalySubscription(
        { findsert: testSubscription },
        context,
      );
    });

    when('[t1] findsert subscription', () => {
      then('subscription is created with the declared config', () => {
        expect(createdSubscription.arn).toBeDefined();
        expect(createdSubscription.name).toBe(testSubscriptionName);
        expect(createdSubscription.frequency).toBe('DAILY');
        expect(createdSubscription.threshold.amount).toBe('100');
        expect(createdSubscription.subscribers[0]?.address).toBe(
          'declastruct-test@ehmpathy.com',
        );
      });
      then('the declared tags round-trip back on read', () => {
        // .note = regression guard: the create path sets ResourceTags AND the
        //   get path must read them back via ListTagsForResource, else the
        //   subscription forever re-plans as UPDATE (tags null vs desired)
        expect(createdSubscription.tags?.managedBy).toBe('declastruct');
        expect(createdSubscription.tags?.purpose).toBe('integration-test');
      });
    });

    when('[t2] getOne by unique', () => {
      then('returns the subscription', async () => {
        const { context } = scene;
        const found = await getOneCostAnomalySubscription(
          { by: { unique: { name: testSubscriptionName } } },
          context,
        );
        expect(found).not.toBeNull();
        expect(found?.name).toBe(testSubscriptionName);
        expect(found?.monitor.name).toBe(TEST_ANOMALY_MONITOR_NAME_SHARED);
        expect(found?.tags?.purpose).toBe('integration-test');
      });
    });

    when('[t3] findsert again', () => {
      then('returns the extant subscription (idempotent)', async () => {
        const { context } = scene;
        const again = await setCostAnomalySubscription(
          { findsert: testSubscription },
          context,
        );
        expect(again.name).toBe(testSubscriptionName);
        expect(again.arn).toBe(createdSubscription.arn);
      });
    });

    when('[t4] upsert with changed tags', () => {
      then(
        'reconciles the tags (untag-then-tag) so the read reflects them',
        async () => {
          // .note = regression guard for the upsert tag path: UpdateAnomalySubscription
          //   does NOT reconcile tags, so setCostAnomalySubscription must syncTags. a
          //   change that removes `purpose` and adds `tier` exercises both untag + tag
          const { context } = scene;
          await setCostAnomalySubscription(
            {
              upsert: DeclaredAwsCostAnomalySubscription.as({
                ...testSubscription,
                tags: { managedBy: 'declastruct', tier: 'gold' },
              }),
            },
            context,
          );
          const found = await getOneCostAnomalySubscription(
            { by: { unique: { name: testSubscriptionName } } },
            context,
          );
          expect(found?.tags?.managedBy).toBe('declastruct');
          expect(found?.tags?.tier).toBe('gold');
          expect(found?.tags?.purpose).toBeUndefined();
        },
      );
    });

    when('[t5] del subscription', () => {
      then('subscription is removed and getOne returns null', async () => {
        const { context } = scene;
        await delCostAnomalySubscription(
          { by: { unique: { name: testSubscriptionName } } },
          context,
        );
        const gone = await getOneCostAnomalySubscription(
          { by: { unique: { name: testSubscriptionName } } },
          context,
        );
        expect(gone).toBeNull();
      });
    });

    when('[t6] del again', () => {
      then('is a no-op (idempotent)', async () => {
        const { context } = scene;
        await expect(
          delCostAnomalySubscription(
            { by: { unique: { name: testSubscriptionName } } },
            context,
          ),
        ).resolves.toBeUndefined();
      });
    });
  });
});
