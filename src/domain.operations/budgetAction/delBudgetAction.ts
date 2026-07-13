import { DeleteBudgetActionCommand } from '@aws-sdk/client-budgets';
import { asProcedure } from 'as-procedure';
import { isRefByUnique, type Ref, type RefByUnique } from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { getAwsBudgetsClient } from '@src/access/sdks/getAwsBudgetsClient';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsBudgetAction } from '@src/domain.objects/DeclaredAwsBudgetAction';

import { getOneBudgetAction } from './getOneBudgetAction';

/**
 * .what = deletes a budget action by unique tuple (budget + kind) or ref
 * .why = enables declarative teardown; idempotent — a no-op when already absent
 * .note
 *   - the aws-assigned actionId is needed to delete, so we look up the action first
 *   - AWS reverses the action's effect (SCP/IAM detach) as part of a delete
 */
export const delBudgetAction = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredAwsBudgetAction>;
        ref: Ref<typeof DeclaredAwsBudgetAction>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
    // handle by ref via a type guard
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsBudgetAction })(input.by.ref))
        return delBudgetAction({ by: { unique: input.by.ref } }, context);
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

    // look up the action to obtain its aws-assigned actionId
    const foundBefore = await getOneBudgetAction({ by: { unique } }, context);

    // idempotent: already absent
    if (!foundBefore?.actionId) return;

    // declare the client (pinned to us-east-1)
    const client = getAwsBudgetsClient();

    try {
      await client.send(
        new DeleteBudgetActionCommand({
          AccountId: context.aws.credentials.account,
          BudgetName: unique.budget.name,
          ActionId: foundBefore.actionId,
        }),
      );
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // idempotent: already absent
      if (error.name === 'NotFoundException') return;

      throw new HelpfulError('aws.delBudgetAction error', {
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
