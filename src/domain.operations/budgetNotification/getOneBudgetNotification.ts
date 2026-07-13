import {
  DescribeNotificationsForBudgetCommand,
  DescribeSubscribersForNotificationCommand,
} from '@aws-sdk/client-budgets';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  isRefByUnique,
  type Ref,
  RefByUnique,
} from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { getAwsBudgetsClient } from '@src/access/sdks/getAwsBudgetsClient';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsBudget } from '@src/domain.objects/DeclaredAwsBudget';
import { DeclaredAwsBudgetNotification } from '@src/domain.objects/DeclaredAwsBudgetNotification';

import { castIntoDeclaredAwsBudgetNotification } from './castIntoDeclaredAwsBudgetNotification';

/**
 * .what = retrieves a budget notification by unique tuple or ref
 * .why = enables lookup for idempotent findsert/upsert and drift detection
 * .note
 *   - a notification has no artificial primary key; it is addressed by
 *     AccountId (from context) + BudgetName + the alert tuple
 *   - our comparison maps 1:1 onto AWS ComparisonOperator (same values)
 *   - returns null if the notification is absent
 */
export const getOneBudgetNotification = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredAwsBudgetNotification>;
        ref: Ref<typeof DeclaredAwsBudgetNotification>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsBudgetNotification> | null> => {
    // handle by ref via a type guard
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsBudgetNotification })(input.by.ref))
        return getOneBudgetNotification(
          { by: { unique: input.by.ref } },
          context,
        );
      UnexpectedCodePathError.throw('notification ref is not a unique ref', {
        input,
      });
    }

    // determine the unique tuple
    const unique = input.by.unique
      ? input.by.unique
      : UnexpectedCodePathError.throw('not referenced by unique. how not?', {
          input,
        });

    // the budget this notification belongs to
    const budgetRef = RefByUnique.as<typeof DeclaredAwsBudget>({
      name: unique.budget.name,
    });

    // declare the client (pinned to us-east-1)
    const client = getAwsBudgetsClient();
    const accountId = context.aws.credentials.account;

    try {
      // list all notifications for the budget, then match the alert tuple
      const response = await client.send(
        new DescribeNotificationsForBudgetCommand({
          AccountId: accountId,
          BudgetName: unique.budget.name,
        }),
      );

      const notificationFound = (response.Notifications ?? []).find(
        (candidate) =>
          candidate.NotificationType === unique.basis &&
          candidate.ComparisonOperator === unique.comparison &&
          candidate.Threshold === unique.threshold.quant &&
          (candidate.ThresholdType ?? 'PERCENTAGE') === unique.threshold.unit,
      );
      if (!notificationFound) return null;

      // fetch the subscribers for the matched notification
      const subscribersResponse = await client.send(
        new DescribeSubscribersForNotificationCommand({
          AccountId: accountId,
          BudgetName: unique.budget.name,
          Notification: notificationFound,
        }),
      );

      return castIntoDeclaredAwsBudgetNotification({
        notification: notificationFound,
        subscribers: subscribersResponse.Subscribers ?? [],
        budgetRef,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // handle budget or notification absent
      if (error.name === 'NotFoundException') return null;

      throw new HelpfulError('aws.getOneBudgetNotification error', {
        cause: error,
        context: {
          errorName: error.name,
          errorMessage: error.message,
          input,
        },
      });
    }
  },
);
