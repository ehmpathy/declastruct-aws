import {
  DescribeBudgetCommand,
  ListTagsForResourceCommand,
} from '@aws-sdk/client-budgets';
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
import { DeclaredAwsBudget } from '@src/domain.objects/DeclaredAwsBudget';

import { asBudgetArn } from './asBudgetArn';
import { castIntoDeclaredAwsBudget } from './castIntoDeclaredAwsBudget';

/**
 * .what = retrieves a budget by unique (name) or ref
 * .why = enables lookup for idempotent findsert/upsert and drift detection
 * .note
 *   - a budget has no artificial primary key; it is addressed by
 *     AccountId (from context) + BudgetName
 *   - returns null if the budget is absent
 */
export const getOneBudget = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredAwsBudget>;
        ref: Ref<typeof DeclaredAwsBudget>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsBudget> | null> => {
    // handle by ref via a type guard
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsBudget })(input.by.ref))
        return getOneBudget({ by: { unique: input.by.ref } }, context);
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
    const accountId = context.aws.credentials.account;

    try {
      // describe the budget by account + name
      const response = await client.send(
        new DescribeBudgetCommand({
          AccountId: accountId,
          BudgetName: budgetName,
        }),
      );

      if (!response.Budget) return null;

      // fetch tags via the constructed budget ARN
      const tagsResponse = await client.send(
        new ListTagsForResourceCommand({
          ResourceARN: asBudgetArn({ accountId, budgetName }),
        }),
      );

      return castIntoDeclaredAwsBudget({
        budget: response.Budget,
        tags: tagsResponse.ResourceTags,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // handle budget absent
      if (error.name === 'NotFoundException') return null;

      throw new HelpfulError('aws.getOneBudget error', {
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
