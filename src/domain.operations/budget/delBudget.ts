import { DeleteBudgetCommand } from '@aws-sdk/client-budgets';
import { asProcedure } from 'as-procedure';
import { isRefByUnique, type Ref, type RefByUnique } from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { getAwsBudgetsClient } from '@src/access/sdks/getAwsBudgetsClient';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsBudget } from '@src/domain.objects/DeclaredAwsBudget';

/**
 * .what = deletes a budget by unique (name) or ref
 * .why = enables declarative teardown; idempotent — a no-op when already absent
 * .note = a budget delete also removes its notifications, subscribers, and
 *         actions, so any DeclaredAwsBudgetNotification / DeclaredAwsBudgetAction
 *         that references it must be torn down first (declared-array order)
 */
export const delBudget = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredAwsBudget>;
        ref: Ref<typeof DeclaredAwsBudget>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
    // handle by ref via a type guard
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsBudget })(input.by.ref))
        return delBudget({ by: { unique: input.by.ref } }, context);
      UnexpectedCodePathError.throw('budget ref is not a unique ref', {
        input,
      });
    }

    // determine the budget name
    const budgetName = input.by.unique
      ? input.by.unique.name
      : UnexpectedCodePathError.throw('not referenced by unique. how not?', {
          input,
        });

    // declare the client (pinned to us-east-1)
    const client = getAwsBudgetsClient();

    try {
      await client.send(
        new DeleteBudgetCommand({
          AccountId: context.aws.credentials.account,
          BudgetName: budgetName,
        }),
      );
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // idempotent: already absent
      if (error.name === 'NotFoundException') return;

      throw new HelpfulError('aws.delBudget error', {
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
