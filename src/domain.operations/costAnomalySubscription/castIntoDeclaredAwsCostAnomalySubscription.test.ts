import type { AnomalySubscription } from '@aws-sdk/client-cost-explorer';
import { RefByUnique } from 'domain-objects';
import { given, then, when } from 'test-fns';

import type { DeclaredAwsCostAnomalyMonitor } from '@src/domain.objects/DeclaredAwsCostAnomalyMonitor';

import { castIntoDeclaredAwsCostAnomalySubscription } from './castIntoDeclaredAwsCostAnomalySubscription';

// a well-formed AWS subscription (monitor arn present, one email subscriber, a
// threshold expression) — the shared fixture the cases tweak
const awsSubscription: AnomalySubscription = {
  SubscriptionArn:
    'arn:aws:ce::123456789012:anomalysubscription/00000000-0000-0000-0000-000000000000',
  SubscriptionName: 'demo-anomaly-sub',
  MonitorArnList: [
    'arn:aws:ce::123456789012:anomalymonitor/11111111-1111-1111-1111-111111111111',
  ],
  Frequency: 'DAILY',
  Subscribers: [{ Type: 'EMAIL', Address: 'ops@example.com' }],
  ThresholdExpression: {
    Dimensions: {
      Key: 'ANOMALY_TOTAL_IMPACT_ABSOLUTE',
      MatchOptions: ['GREATER_THAN_OR_EQUAL'],
      Values: ['10'],
    },
  },
};

describe('castIntoDeclaredAwsCostAnomalySubscription', () => {
  given('a well-formed subscription with a monitor ref', () => {
    const monitorRef = RefByUnique.as<typeof DeclaredAwsCostAnomalyMonitor>({
      name: 'demo-anomaly',
    });

    when('cast to domain object', () => {
      then('it maps every field and keeps the monitor ref', () => {
        const result = castIntoDeclaredAwsCostAnomalySubscription({
          subscription: awsSubscription,
          monitorRef,
          tags: [{ Key: 'purpose', Value: 'demo' }],
        });
        expect(result).toMatchObject({
          name: 'demo-anomaly-sub',
          monitor: { name: 'demo-anomaly' },
          frequency: 'DAILY',
          threshold: { amount: '10', unit: 'USD' },
        });
        expect(result.subscribers[0]).toMatchObject({
          via: 'EMAIL',
          address: 'ops@example.com',
        });
      });
    });
  });

  given(
    'a malformed orphan subscription whose monitor was pruned (monitorRef=null)',
    () => {
      // note: AWS can return a subscription with an empty MonitorArnList after its
      //   monitor is deleted out from under it. getOne reads such an orphan with
      //   monitorRef=null so the plan sees drift and reconciles, rather than a throw
      //   that aborts the whole plan (rule.forbid.plan-fail-on-apply-guided-prereq)
      const orphan: AnomalySubscription = {
        ...awsSubscription,
        MonitorArnList: [],
      };

      when('cast to domain object with a null monitor ref', () => {
        then('it casts with monitor=null and does not throw', () => {
          const result = castIntoDeclaredAwsCostAnomalySubscription({
            subscription: orphan,
            monitorRef: null,
            tags: undefined,
          });
          expect(result.monitor).toBeNull();
          expect(result.name).toBe('demo-anomaly-sub');
          expect(result.arn).toBe(awsSubscription.SubscriptionArn);
        });
      });
    },
  );
});
