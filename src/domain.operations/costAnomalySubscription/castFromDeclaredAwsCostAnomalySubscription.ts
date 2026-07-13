import type { AnomalySubscription } from '@aws-sdk/client-cost-explorer';

import type { DeclaredAwsCostAnomalySubscription } from '@src/domain.objects/DeclaredAwsCostAnomalySubscription';

/**
 * .what = maps a DeclaredAwsCostAnomalySubscription into the AWS AnomalySubscription
 *         request shape, given the monitor's ARN
 * .why = CreateAnomalySubscription/UpdateAnomalySubscription take AWS's
 *        AnomalySubscription object; this is the single encode point from our
 *        declared shape to theirs
 * .note
 *   - the monitor name-ref cannot be turned into an ARN here (that needs an API
 *     call), so the caller derives it and passes monitorArn in
 *   - the dollar threshold becomes a ThresholdExpression on the
 *     ANOMALY_TOTAL_IMPACT_ABSOLUTE dimension with GREATER_THAN_OR_EQUAL — the
 *     current (non-deprecated) way to specify a threshold
 */
export const castFromDeclaredAwsCostAnomalySubscription = (input: {
  desired: DeclaredAwsCostAnomalySubscription;
  monitorArn: string;
}): AnomalySubscription => {
  const { desired, monitorArn } = input;
  return {
    SubscriptionName: desired.name,
    MonitorArnList: [monitorArn],
    Frequency: desired.frequency,
    Subscribers: desired.subscribers.map((subscriber) => ({
      Type: subscriber.via,
      Address: subscriber.address,
    })),
    ThresholdExpression: {
      Dimensions: {
        Key: 'ANOMALY_TOTAL_IMPACT_ABSOLUTE',
        MatchOptions: ['GREATER_THAN_OR_EQUAL'],
        Values: [desired.threshold.amount],
      },
    },
  };
};
