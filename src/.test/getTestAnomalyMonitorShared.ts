import {
  type AnomalyMonitor,
  type AnomalySubscription,
  GetAnomalyMonitorsCommand,
  GetAnomalySubscriptionsCommand,
} from '@aws-sdk/client-cost-explorer';
import type { HasReadonly } from 'domain-objects';
import type { VisualogicContext } from 'visualogic';

import { getAwsCostExplorerClient } from '@src/access/sdks/getAwsCostExplorerClient';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCostAnomalyMonitor } from '@src/domain.objects/DeclaredAwsCostAnomalyMonitor';
import { delCostAnomalyMonitor } from '@src/domain.operations/costAnomalyMonitor/delCostAnomalyMonitor';
import { setCostAnomalyMonitor } from '@src/domain.operations/costAnomalyMonitor/setCostAnomalyMonitor';
import { delCostAnomalySubscription } from '@src/domain.operations/costAnomalySubscription/delCostAnomalySubscription';

/**
 * .what = the single shared dimensional cost-anomaly monitor for the test account
 * .why = AWS caps DIMENSIONAL monitors at ONE per account, so every test that needs
 *        a dimensional monitor must findsert THIS one — never mint a uuid-named one —
 *        and never delete it. under parallel jest workers with no mutex, a shared
 *        findsert-only singleton is the only collision-free option.
 * .note
 *   - the name intentionally matches the acceptance monitor so acceptance AND both
 *     anomaly journeys (monitor + subscription) share the ONE dimensional slot
 *   - findsert is idempotent: whichever test runs first creates it, the rest reuse it;
 *     no test deletes it, so the single slot is never contended
 *   - destructive del of this singleton cannot be tested under parallel contention
 *     until a with-simple-mutex exists; the monitor journey covers del via the
 *     absent (no-op) path instead
 */
export const TEST_ANOMALY_MONITOR_NAME_SHARED = 'declastruct-acceptance-anomaly';

/**
 * .what = the shared dimensional monitor declaration, for findsert in test setup
 */
export const getTestAnomalyMonitorShared =
  (): DeclaredAwsCostAnomalyMonitor =>
    DeclaredAwsCostAnomalyMonitor.as({
      name: TEST_ANOMALY_MONITOR_NAME_SHARED,
      kind: 'DIMENSIONAL',
      dimension: 'SERVICE',
      tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
    });

/**
 * .what = sweeps orphan test anomaly monitors/subscriptions, then findserts the shared
 *         dimensional monitor and returns it
 * .why = the ONE dimensional slot can be squatted by a uuid-named monitor leaked from a
 *        pre-shared-fixture run; a findsert of the shared name would then fail with
 *        "Limit exceeded on dimensional spend monitor creation". this sweep clears any
 *        `declastruct-`-prefixed test dimensional monitor that is NOT the shared one
 *        (its subscriptions deleted first, since AWS forbids deletion of a monitor that
 *        still has subscriptions), then findserts the shared monitor into the freed
 *        slot. it also self-heals future leaks.
 * .note = raw-client enumeration is used only to FIND orphans; the actual deletes go
 *         through the declarative del ops. this is cleanup, not desired-state setup.
 */
export const genTestAnomalyMonitorShared = async (
  context: ContextAwsApi & VisualogicContext,
): Promise<HasReadonly<typeof DeclaredAwsCostAnomalyMonitor>> => {
  const client = getAwsCostExplorerClient();

  // page all subscriptions, then remove the orphan test ones (before their monitors)
  const subscriptions: AnomalySubscription[] = [];
  let subToken: string | undefined;
  do {
    const response = await client.send(
      new GetAnomalySubscriptionsCommand({ NextPageToken: subToken }),
    );
    subscriptions.push(...(response.AnomalySubscriptions ?? []));
    subToken = response.NextPageToken;
  } while (subToken);
  for (const subscription of subscriptions) {
    const name = subscription.SubscriptionName;
    if (name && name.startsWith('declastruct-test-'))
      await delCostAnomalySubscription({ by: { unique: { name } } }, context);
  }

  // page all monitors, then remove the orphan test dimensional ones (not the shared)
  const monitors: AnomalyMonitor[] = [];
  let monitorToken: string | undefined;
  do {
    const response = await client.send(
      new GetAnomalyMonitorsCommand({ NextPageToken: monitorToken }),
    );
    monitors.push(...(response.AnomalyMonitors ?? []));
    monitorToken = response.NextPageToken;
  } while (monitorToken);
  for (const monitor of monitors) {
    const name = monitor.MonitorName;
    if (
      name &&
      name !== TEST_ANOMALY_MONITOR_NAME_SHARED &&
      name.startsWith('declastruct-') &&
      monitor.MonitorType === 'DIMENSIONAL'
    )
      await delCostAnomalyMonitor({ by: { unique: { name } } }, context);
  }

  // findsert the shared monitor into the (now freed) single dimensional slot
  return setCostAnomalyMonitor(
    { findsert: getTestAnomalyMonitorShared() },
    context,
  );
};
