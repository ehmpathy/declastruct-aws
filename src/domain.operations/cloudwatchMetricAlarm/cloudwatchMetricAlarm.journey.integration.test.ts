import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { DeclaredAwsCloudwatchMetricAlarm } from '@src/domain.objects/DeclaredAwsCloudwatchMetricAlarm';

import { delCloudwatchMetricAlarm } from './delCloudwatchMetricAlarm';
import { getOneCloudwatchMetricAlarm } from './getOneCloudwatchMetricAlarm';
import { setCloudwatchMetricAlarm } from './setCloudwatchMetricAlarm';

/**
 * .what = journey test for the metric-alarm lifecycle (findsert -> get -> upsert -> del)
 * .why = validates the full plan/apply/idempotency contract against real CloudWatch
 * .note
 *   - a metric alarm can be created by the account for itself in any region — no
 *     management-account wall
 *   - uses a bespoke namespace/metric so the test does not depend on real metrics
 *   - both-ends cleanup: delete before AND after so a crashed run self-heals
 */
describe('cloudwatchMetricAlarm.journey', () => {
  const testName = `declastruct-test-alarm-${genTestUuid().slice(0, 8)}`;

  const testAlarm = DeclaredAwsCloudwatchMetricAlarm.as({
    name: testName,
    description: 'declastruct journey test alarm',
    namespace: 'Declastruct/Test',
    metricName: 'TestMetric',
    statistic: 'Maximum',
    dimensions: { Suite: 'journey' },
    period: 300,
    evaluationPeriods: 1,
    threshold: 1,
    comparisonOperator: 'GreaterThanThreshold',
    unit: null,
    alarmActions: [],
    tags: { managedBy: 'declastruct', purpose: 'integration-test' },
  });

  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();

    // cleanup before: remove any leftover from a prior crashed run
    await delCloudwatchMetricAlarm(
      { by: { unique: { name: testName } } },
      context,
    );

    return { context };
  });

  afterAll(async () => {
    // cleanup after: fresh context so teardown runs even if scene setup failed
    // (del is idempotent — a no-op if the resource is absent). no scene-guard, no skip
    const context = await getSampleAwsApiContext();
    await delCloudwatchMetricAlarm(
      { by: { unique: { name: testName } } },
      context,
    );
  });

  given('[case1] alarm lifecycle', () => {
    const createdAlarm = useBeforeAll(async () => {
      const { context } = scene;
      return setCloudwatchMetricAlarm({ findsert: testAlarm }, context);
    });

    when('[t1] findsert alarm', () => {
      then('alarm is created with an arn and the declared config', () => {
        expect(createdAlarm.name).toBe(testName);
        expect(createdAlarm.arn).toContain(':alarm:');
        expect(createdAlarm.threshold).toBe(1);
        expect(createdAlarm.comparisonOperator).toBe('GreaterThanThreshold');
      });
    });

    when('[t2] getOne by unique', () => {
      then('returns the alarm with tags', async () => {
        const { context } = scene;
        const alarmFound = await getOneCloudwatchMetricAlarm(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(alarmFound).not.toBeNull();
        expect(alarmFound?.name).toBe(testName);
        expect(alarmFound?.tags?.managedBy).toBe('declastruct');
      });
    });

    when('[t3] findsert again', () => {
      then('returns the extant alarm (idempotent)', async () => {
        const { context } = scene;
        const alarmAgain = await setCloudwatchMetricAlarm(
          { findsert: testAlarm },
          context,
        );
        expect(alarmAgain.name).toBe(testName);
        expect(alarmAgain.threshold).toBe(1);
      });
    });

    when('[t4] upsert with a raised threshold', () => {
      then('overwrites the threshold in place', async () => {
        const { context } = scene;
        const alarmRaised = await setCloudwatchMetricAlarm(
          {
            upsert: DeclaredAwsCloudwatchMetricAlarm.as({
              ...testAlarm,
              threshold: 5,
            }),
          },
          context,
        );
        expect(alarmRaised.threshold).toBe(5);
      });
    });

    when('[t5] del alarm', () => {
      then('alarm is removed and getOne returns null', async () => {
        const { context } = scene;
        await delCloudwatchMetricAlarm(
          { by: { unique: { name: testName } } },
          context,
        );
        const alarmGone = await getOneCloudwatchMetricAlarm(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(alarmGone).toBeNull();
      });
    });

    when('[t6] del again', () => {
      then('is a no-op (idempotent)', async () => {
        const { context } = scene;
        await expect(
          delCloudwatchMetricAlarm(
            { by: { unique: { name: testName } } },
            context,
          ),
        ).resolves.toBeUndefined();
      });
    });
  });
});
