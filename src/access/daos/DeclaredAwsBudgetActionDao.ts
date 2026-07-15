import { genDeclastructDao } from 'declastruct';
import { isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsBudgetAction } from '@src/domain.objects/DeclaredAwsBudgetAction';
import { delBudgetAction } from '@src/domain.operations/budgetAction/delBudgetAction';
import { getOneBudgetAction } from '@src/domain.operations/budgetAction/getOneBudgetAction';
import { setBudgetAction } from '@src/domain.operations/budgetAction/setBudgetAction';

/**
 * .what = declastruct DAO for AWS Budget Action (guard) resources
 * .why = wraps budget action operations to conform to the declastruct interface
 * .note
 *   - identified by composite key (budget + kind), no primary key — AWS
 *     assigns a UUID (actionId) a user cannot know up front
 *   - findsert = create if absent, return extant (idempotent)
 *   - upsert = ensure the action exists AND overwrite its mutable fields
 *   - delete = remove the action (AWS reverses its effect as part of the delete)
 *   - the budget + executionRole must exist before an action can be created
 */
export const DeclaredAwsBudgetActionDao = genDeclastructDao<
  typeof DeclaredAwsBudgetAction,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsBudgetAction,
  get: {
    one: {
      byPrimary: null, // composite key, no primary
      byUnique: async (input, context) => {
        return getOneBudgetAction({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setBudgetAction({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setBudgetAction({ upsert: input }, context);
    },
    delete: async (input, context) => {
      // narrow the declastruct Ref to a unique ref via a guard (no primary exists,
      // so a well-formed ref is always unique); failfast if it is not
      if (!isRefByUnique({ of: DeclaredAwsBudgetAction })(input))
        UnexpectedCodePathError.throw(
          'budget action has no primary; delete ref must be unique',
          { input },
        );
      await delBudgetAction({ by: { unique: input } }, context);
    },
  },
});
