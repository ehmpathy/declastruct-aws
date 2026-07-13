import { DescribeBudgetActionsForBudgetCommand } from '@aws-sdk/client-budgets';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  isRefByUnique,
  type Ref,
  type RefByUnique,
} from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { getAwsBudgetsClient } from '@src/access/sdks/getAwsBudgetsClient';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsBudgetAction } from '@src/domain.objects/DeclaredAwsBudgetAction';

import { castIntoDeclaredAwsBudgetAction } from './castIntoDeclaredAwsBudgetAction';

/**
 * .what = retrieves a budget action by unique tuple (budget + kind) or ref
 * .why = enables lookup for idempotent findsert/upsert and drift detection
 * .note
 *   - an action has no artificial primary key a user can know up front; it is
 *     addressed by AccountId (from context) + BudgetName + kind
 *   - lists all actions for the budget, then finds the one whose ActionType fits
 *   - returns null if the action (or its budget) is absent
 */
export const getOneBudgetAction = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredAwsBudgetAction>;
        ref: Ref<typeof DeclaredAwsBudgetAction>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsBudgetAction> | null> => {
    // handle by ref via a type guard
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsBudgetAction })(input.by.ref))
        return getOneBudgetAction({ by: { unique: input.by.ref } }, context);
      UnexpectedCodePathError.throw('action ref is not a unique ref', {
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
    const accountId = context.aws.credentials.account;
    const budgetName = unique.budget.name;

    try {
      // list all actions for the budget, one page at a time
      let nextToken: string | undefined;
      do {
        const response = await client.send(
          new DescribeBudgetActionsForBudgetCommand({
            AccountId: accountId,
            BudgetName: budgetName,
            NextToken: nextToken,
          }),
        );

        // find the action whose ActionType fits the unique tuple
        const actionFound = (response.Actions ?? []).find(
          (candidate) => candidate.ActionType === unique.kind,
        );
        if (actionFound)
          return castIntoDeclaredAwsBudgetAction({ action: actionFound });

        nextToken = response.NextToken;
      } while (nextToken);

      // no action of this kind on the budget
      return null;
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // handle budget or action absent
      if (error.name === 'NotFoundException') return null;

      throw new HelpfulError('aws.getOneBudgetAction error', {
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
