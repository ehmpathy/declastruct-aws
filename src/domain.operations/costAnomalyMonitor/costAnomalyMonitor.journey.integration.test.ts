import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import {
  genTestAnomalyMonitorShared,
  getTestAnomalyMonitorShared,
  TEST_ANOMALY_MONITOR_NAME_SHARED,
} from '@src/.test/getTestAnomalyMonitorShared';

import { delCostAnomalyMonitor } from './delCostAnomalyMonitor';
import { getOneCostAnomalyMonitor } from './getOneCostAnomalyMonitor';
import { setCostAnomalyMonitor } from './setCostAnomalyMonitor';

/**
 * .what = journey test for the monitor lifecycle (findsert -> get -> findsert -> del)
 * .why = validates the full plan/apply/idempotency contract against real Cost Explorer
 * .note
 *   - AWS caps DIMENSIONAL monitors at ONE per account, so this findserts the SHARED
 *     singleton monitor (never a uuid one) and NEVER deletes it — under parallel jest
 *     workers with no mutex, a shared findsert-only slot is the only collision-free way
 *     (see getTestAnomalyMonitorShared). the destructive del of the singleton cannot be
 *     tested under contention until a with-simple-mutex exists; del is covered here via
 *     the absent (no-op) path instead
 *   - a monitor is self-account manageable (no management-account wall)
 *   - Cost Explorer is pinned to us-east-1 inside getAwsCostExplorerClient
 */
describe('costAnomalyMonitor.journey', () => {
  // a name that never exists, to exercise the del no-op (absent) path safely, apart
  // from the shared singleton
  const absentName = `declastruct-test-monitor-absent-${genTestUuid().slice(0, 8)}`;

  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();
    return { context };
  });

  given('[case1] monitor lifecycle', () => {
    const createdMonitor = useBeforeAll(async () => {
      const { context } = scene;
      // sweep orphan test monitors, then findsert the SHARED dimensional monitor
      // (reuse if extant; never delete it)
      return genTestAnomalyMonitorShared(context);
    });

    when('[t1] findsert monitor', () => {
      then('monitor is created with the declared shape', () => {
        expect(createdMonitor.arn).toBeDefined();
        expect(createdMonitor.name).toBe(TEST_ANOMALY_MONITOR_NAME_SHARED);
        expect(createdMonitor.kind).toBe('DIMENSIONAL');
        expect(createdMonitor.dimension).toBe('SERVICE');
      });
    });

    when('[t2] getOne by unique', () => {
      then('returns the monitor', async () => {
        const { context } = scene;
        const monitorFound = await getOneCostAnomalyMonitor(
          { by: { unique: { name: TEST_ANOMALY_MONITOR_NAME_SHARED } } },
          context,
        );
        expect(monitorFound).not.toBeNull();
        expect(monitorFound?.name).toBe(TEST_ANOMALY_MONITOR_NAME_SHARED);
        expect(monitorFound?.tags?.managedBy).toBe('declastruct');
      });
    });

    when('[t3] findsert again', () => {
      then('returns the extant monitor (idempotent)', async () => {
        const { context } = scene;
        const monitorAgain = await setCostAnomalyMonitor(
          { findsert: getTestAnomalyMonitorShared() },
          context,
        );
        expect(monitorAgain.name).toBe(TEST_ANOMALY_MONITOR_NAME_SHARED);
        expect(monitorAgain.arn).toBe(createdMonitor.arn);
      });
    });

    when('[t4] del an absent monitor', () => {
      then('is a no-op and getOne returns null', async () => {
        // .note = the destructive del of the shared singleton is untestable under
        //   parallel contention (one dimensional slot, no mutex); this covers the del
        //   op's absent (no-op) path apart from the shared monitor
        const { context } = scene;
        await delCostAnomalyMonitor(
          { by: { unique: { name: absentName } } },
          context,
        );
        const monitorGone = await getOneCostAnomalyMonitor(
          { by: { unique: { name: absentName } } },
          context,
        );
        expect(monitorGone).toBeNull();
      });
    });

    when('[t5] del again', () => {
      then('is a no-op (idempotent)', async () => {
        const { context } = scene;
        await expect(
          delCostAnomalyMonitor(
            { by: { unique: { name: absentName } } },
            context,
          ),
        ).resolves.toBeUndefined();
      });
    });
  });
});
