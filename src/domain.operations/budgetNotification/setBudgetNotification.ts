import {
  CreateNotificationCommand,
  CreateSubscriberCommand,
  DeleteSubscriberCommand,
  type Notification,
  type Subscriber,
} from '@aws-sdk/client-budgets';
import { asProcedure } from 'as-procedure';
import { type HasReadonly, RefByUnique } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { getAwsBudgetsClient } from '@src/access/sdks/getAwsBudgetsClient';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsBudgetNotification } from '@src/domain.objects/DeclaredAwsBudgetNotification';
import type { DeclaredAwsBudgetSubscriber } from '@src/domain.objects/DeclaredAwsBudgetSubscriber';

import { getOneBudgetNotification } from './getOneBudgetNotification';

/**
 * .what = builds the AWS Notification tuple from our declared shape
 * .why = the create/subscriber commands all address the notification by this tuple
 */
const asAwsNotification = (
  desired: DeclaredAwsBudgetNotification,
): Notification => ({
  NotificationType: desired.basis,
  ComparisonOperator: desired.comparison,
  Threshold: desired.threshold.quant,
  ThresholdType: desired.threshold.unit,
});

/**
 * .what = builds the AWS Subscriber from our declared subscriber
 */
const asAwsSubscriber = (
  subscriber: DeclaredAwsBudgetSubscriber,
): Subscriber => ({
  SubscriptionType: subscriber.via,
  Address: subscriber.address,
});

/**
 * .what = creates a budget notification, or reconciles its subscribers, idempotently
 * .why = enables declarative plan/apply with a cheap re-apply
 * .note
 *   - findsert: returns the extant notification if the tuple already exists (no change)
 *   - upsert: ensures the notification exists AND syncs its subscribers (add absent
 *     via CreateSubscriber, remove extra via DeleteSubscriber). AWS's identity tuple
 *     cannot be mutated in place, so upsert reconciles the subscriber set only
 *   - the BUDGET must exist first; AWS rejects a notification for an absent budget
 */
export const setBudgetNotification = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsBudgetNotification;
      upsert: DeclaredAwsBudgetNotification;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsBudgetNotification>> => {
    const desired = input.findsert ?? input.upsert;
    const isUpsert = !!input.upsert;

    // failfast if no input
    if (!desired) BadRequestError.throw('findsert or upsert is required');

    // declare the client (pinned to us-east-1)
    const client = getAwsBudgetsClient();
    const accountId = context.aws.credentials.account;
    const budgetName = desired.budget.name;
    const awsNotification = asAwsNotification(desired);

    // the unique ref used to re-read the notification after a write
    const uniqueRef = RefByUnique.as<typeof DeclaredAwsBudgetNotification>({
      budget: desired.budget,
      basis: desired.basis,
      comparison: desired.comparison,
      threshold: desired.threshold,
    });

    // check if the notification already exists
    const foundBefore = await getOneBudgetNotification(
      { by: { unique: uniqueRef } },
      context,
    );

    // findsert: return the extant notification without change
    if (foundBefore && !isUpsert) return foundBefore;

    // create the notification with its subscribers when absent
    if (!foundBefore) {
      await client.send(
        new CreateNotificationCommand({
          AccountId: accountId,
          BudgetName: budgetName,
          Notification: awsNotification,
          Subscribers: desired.subscribers.map(asAwsSubscriber),
        }),
      );
      return getOneAfter({ context, uniqueRef });
    }

    // upsert on an extant notification: reconcile the subscriber set
    const addressesBefore = new Set(
      foundBefore.subscribers.map((subscriber) => subscriber.address),
    );
    const addressesDesired = new Set(
      desired.subscribers.map((subscriber) => subscriber.address),
    );

    // add each desired subscriber that is absent from before
    for (const subscriber of desired.subscribers)
      if (!addressesBefore.has(subscriber.address))
        await client.send(
          new CreateSubscriberCommand({
            AccountId: accountId,
            BudgetName: budgetName,
            Notification: awsNotification,
            Subscriber: asAwsSubscriber(subscriber),
          }),
        );

    // remove each extant subscriber that is no longer desired
    for (const subscriber of foundBefore.subscribers)
      if (!addressesDesired.has(subscriber.address))
        await client.send(
          new DeleteSubscriberCommand({
            AccountId: accountId,
            BudgetName: budgetName,
            Notification: awsNotification,
            Subscriber: asAwsSubscriber(subscriber),
          }),
        );

    return getOneAfter({ context, uniqueRef });
  },
);

/**
 * .what = re-reads the notification after a write and failfasts if absent
 */
const getOneAfter = async (input: {
  context: ContextAwsApi & VisualogicContext;
  uniqueRef: RefByUnique<typeof DeclaredAwsBudgetNotification>;
}): Promise<HasReadonly<typeof DeclaredAwsBudgetNotification>> => {
  const foundAfter = await getOneBudgetNotification(
    { by: { unique: input.uniqueRef } },
    input.context,
  );
  if (!foundAfter)
    UnexpectedCodePathError.throw('notification not found after set', {
      uniqueRef: input.uniqueRef,
    });
  return foundAfter;
};
