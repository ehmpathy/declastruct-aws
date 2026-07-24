import type {
  AnomalySubscription,
  ResourceTag,
} from '@aws-sdk/client-cost-explorer';
import {
  type HasReadonly,
  hasReadonly,
  type RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsBudgetLimit } from '@src/domain.objects/DeclaredAwsBudgetLimit';
import type { DeclaredAwsCostAnomalyMonitor } from '@src/domain.objects/DeclaredAwsCostAnomalyMonitor';
import { DeclaredAwsCostAnomalySubscriber } from '@src/domain.objects/DeclaredAwsCostAnomalySubscriber';
import { DeclaredAwsCostAnomalySubscription } from '@src/domain.objects/DeclaredAwsCostAnomalySubscription';
import { DeclaredAwsTags } from '@src/domain.objects/DeclaredAwsTags';

/**
 * .what = maps an AWS AnomalySubscription into a DeclaredAwsCostAnomalySubscription
 * .why = the AWS shape (SubscriptionName, Subscribers[], ThresholdExpression,
 *        MonitorArnList, ...) differs from our declared shape; this cast is the
 *        single decode point
 * .note
 *   - the AWS subscription stores its monitor(s) as ARNs (MonitorArnList), but our
 *     `monitor` field is a RefByUnique keyed by NAME. the ARN cannot be cheaply
 *     turned back into a name here, so the caller supplies the monitor ref it
 *     derived and we pass it through
 *   - monitorRef is null when the remote subscription has an empty MonitorArnList
 *     (a malformed orphan whose monitor was pruned); we pass the null through so a
 *     plan reads the orphan as drift rather than a hard abort
 *   - the threshold is decoded from ThresholdExpression's
 *     ANOMALY_TOTAL_IMPACT_ABSOLUTE dimension value, in USD
 */
export const castIntoDeclaredAwsCostAnomalySubscription = (input: {
  subscription: AnomalySubscription;
  monitorRef: RefByUnique<typeof DeclaredAwsCostAnomalyMonitor> | null;
  tags: ResourceTag[] | undefined;
}): HasReadonly<typeof DeclaredAwsCostAnomalySubscription> => {
  const { subscription, monitorRef, tags } = input;

  // tags map, or null when absent
  const tagsMap = (() => {
    if (!tags || tags.length === 0) return null;
    const obj: Record<string, string> = {};
    for (const tag of tags) if (tag.Key) obj[tag.Key] = tag.Value ?? '';
    return new DeclaredAwsTags(obj);
  })();

  // the recipients (delivery channel + address each)
  const subscribers = (subscription.Subscribers ?? []).map((subscriber) => {
    const via = subscriber.Type;
    if (via !== 'EMAIL' && via !== 'SNS')
      UnexpectedCodePathError.throw(
        'subscription has a subscriber with an unsupported Type',
        { subscription },
      );
    return new DeclaredAwsCostAnomalySubscriber({
      via,
      address:
        subscriber.Address ??
        UnexpectedCodePathError.throw('subscriber lacks an Address', {
          subscription,
        }),
    });
  });

  // the dollar threshold, decoded from the ANOMALY_TOTAL_IMPACT_ABSOLUTE dimension
  const thresholdAmount = (() => {
    const dimensionValue =
      subscription.ThresholdExpression?.Dimensions?.Values?.[0];
    if (dimensionValue !== undefined) return dimensionValue;

    // fall back to the deprecated numeric Threshold when no expression is present
    if (subscription.Threshold !== undefined)
      return String(subscription.Threshold);

    return UnexpectedCodePathError.throw(
      'subscription lacks a ThresholdExpression and a Threshold',
      { subscription },
    );
  })();
  const threshold = new DeclaredAwsBudgetLimit({
    amount: thresholdAmount,
    unit: 'USD',
  });

  // the frequency at which notifications are sent
  const frequency = subscription.Frequency;
  if (
    frequency !== 'IMMEDIATE' &&
    frequency !== 'DAILY' &&
    frequency !== 'WEEKLY'
  )
    UnexpectedCodePathError.throw('subscription has an unsupported Frequency', {
      subscription,
    });

  return assure(
    new DeclaredAwsCostAnomalySubscription({
      arn:
        subscription.SubscriptionArn ??
        UnexpectedCodePathError.throw('subscription lacks a SubscriptionArn', {
          subscription,
        }),
      name:
        subscription.SubscriptionName ??
        UnexpectedCodePathError.throw('subscription lacks a SubscriptionName', {
          subscription,
        }),
      monitor: monitorRef,
      frequency,
      threshold,
      subscribers,
      tags: tagsMap,
    }),
    hasReadonly({ of: DeclaredAwsCostAnomalySubscription }),
  );
};
