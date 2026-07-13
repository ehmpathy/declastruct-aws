import { DeleteNotificationCommand } from '@aws-sdk/client-budgets';
import { asProcedure } from 'as-procedure';
import { isRefByUnique, type Ref, type RefByUnique } from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { getAwsBudgetsClient } from '@src/access/sdks/getAwsBudgetsClient';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsBudgetNotification } from '@src/domain.objects/DeclaredAwsBudgetNotification';

/**
 * .what = deletes a budget notification by unique tuple or ref
 * .why = enables declarative teardown; idempotent — a no-op when already absent
 * .note
 *   - a delete of the notification also removes its subscribers
 *   - the alert tuple (basis + comparison + threshold.quant + threshold.unit)
 *     addresses the notification within its budget
 */
export const delBudgetNotification = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredAwsBudgetNotification>;
        ref: Ref<typeof DeclaredAwsBudgetNotification>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
    // handle by ref via a type guard
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsBudgetNotification })(input.by.ref))
        return delBudgetNotification({ by: { unique: input.by.ref } }, context);
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

    // declare the client (pinned to us-east-1)
    const client = getAwsBudgetsClient();

    try {
      await client.send(
        new DeleteNotificationCommand({
          AccountId: context.aws.credentials.account,
          BudgetName: unique.budget.name,
          Notification: {
            NotificationType: unique.basis,
            ComparisonOperator: unique.comparison,
            Threshold: unique.threshold.quant,
            ThresholdType: unique.threshold.unit,
          },
        }),
      );
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // idempotent: already absent
      if (error.name === 'NotFoundException') return;

      throw new HelpfulError('aws.delBudgetNotification error', {
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
