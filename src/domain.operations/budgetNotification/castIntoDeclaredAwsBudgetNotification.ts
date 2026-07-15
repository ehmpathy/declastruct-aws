import type { Notification, Subscriber } from '@aws-sdk/client-budgets';
import {
  type HasReadonly,
  hasReadonly,
  type RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import type { DeclaredAwsBudget } from '@src/domain.objects/DeclaredAwsBudget';
import { DeclaredAwsBudgetNotification } from '@src/domain.objects/DeclaredAwsBudgetNotification';
import { DeclaredAwsBudgetSubscriber } from '@src/domain.objects/DeclaredAwsBudgetSubscriber';
import { DeclaredAwsBudgetThreshold } from '@src/domain.objects/DeclaredAwsBudgetThreshold';

/**
 * .what = maps an AWS Notification (+ its subscribers) into a DeclaredAwsBudgetNotification
 * .why = the AWS shape (NotificationType, ComparisonOperator, Threshold, ...)
 *        differs from our declared shape; this cast is the single decode point
 * .note
 *   - our comparison maps 1:1 onto AWS ComparisonOperator (same values)
 *   - budgetRef is carried in from the caller since AWS Notification omits the budget
 */
export const castIntoDeclaredAwsBudgetNotification = (input: {
  notification: Notification;
  subscribers: Subscriber[];
  budgetRef: RefByUnique<typeof DeclaredAwsBudget>;
}): HasReadonly<typeof DeclaredAwsBudgetNotification> => {
  const { notification, subscribers, budgetRef } = input;

  // the alert watches actual or forecasted spend
  const basis = notification.NotificationType;
  if (basis !== 'ACTUAL' && basis !== 'FORECASTED')
    UnexpectedCodePathError.throw(
      'notification has an unsupported NotificationType',
      { notification },
    );

  // how spend is compared against the threshold
  const comparison = notification.ComparisonOperator;
  if (
    comparison !== 'GREATER_THAN' &&
    comparison !== 'LESS_THAN' &&
    comparison !== 'EQUAL_TO'
  )
    UnexpectedCodePathError.throw(
      'notification has an unsupported ComparisonOperator',
      { notification },
    );

  // how the threshold is read (default to percentage, AWS's default)
  const thresholdType = notification.ThresholdType ?? 'PERCENTAGE';
  if (thresholdType !== 'PERCENTAGE' && thresholdType !== 'ABSOLUTE_VALUE')
    UnexpectedCodePathError.throw(
      'notification has an unsupported ThresholdType',
      { notification },
    );

  // decode each subscriber's channel + address
  const declaredSubscribers = subscribers.map((subscriber) => {
    const via = subscriber.SubscriptionType;
    if (via !== 'EMAIL' && via !== 'SNS')
      UnexpectedCodePathError.throw(
        'subscriber has an unsupported SubscriptionType',
        { subscriber },
      );
    return new DeclaredAwsBudgetSubscriber({
      via,
      address:
        subscriber.Address ??
        UnexpectedCodePathError.throw('subscriber lacks an Address', {
          subscriber,
        }),
    });
  });

  return assure(
    new DeclaredAwsBudgetNotification({
      budget: budgetRef,
      basis,
      comparison,
      threshold: new DeclaredAwsBudgetThreshold({
        quant:
          notification.Threshold ??
          UnexpectedCodePathError.throw('notification lacks a Threshold', {
            notification,
          }),
        unit: thresholdType,
      }),
      subscribers: declaredSubscribers,
    }),
    hasReadonly({ of: DeclaredAwsBudgetNotification }),
  );
};
