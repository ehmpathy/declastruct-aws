import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsBudget } from '@src/domain.objects/DeclaredAwsBudget';
import { delBudget } from '@src/domain.operations/budget/delBudget';
import { getOneBudget } from '@src/domain.operations/budget/getOneBudget';
import { setBudget } from '@src/domain.operations/budget/setBudget';

/**
 * .what = declastruct DAO for AWS Budget resources
 * .why = wraps budget operations to conform to the declastruct interface
 * .note
 *   - identified by name (unique), no primary key — a budget has no AWS-assigned id
 *   - findsert = create if absent, return extant (idempotent)
 *   - upsert = create or update cap/period/filters/tags
 *   - delete = remove the budget (also removes its notifications + actions)
 */
export const DeclaredAwsBudgetDao = genDeclastructDao<
  typeof DeclaredAwsBudget,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsBudget,
  get: {
    one: {
      byPrimary: null, // no primary key — addressed by name
      byUnique: async (input, context) => {
        return getOneBudget({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setBudget({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setBudget({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delBudget({ by: { ref: input } }, context);
    },
  },
});
