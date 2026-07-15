import type { Budget } from '@aws-sdk/client-budgets';

import type { DeclaredAwsBudget } from '@src/domain.objects/DeclaredAwsBudget';

/**
 * .what = maps a DeclaredAwsBudget into the AWS Budget request shape
 * .why = CreateBudget/UpdateBudget take AWS's Budget object; this is the single
 *        encode point from our declared shape to theirs
 */
export const castFromDeclaredAwsBudget = (
  desired: DeclaredAwsBudget,
): Budget => {
  return {
    BudgetName: desired.name,
    BudgetType: desired.kind,
    BudgetLimit: {
      Amount: desired.limit.amount,
      Unit: desired.limit.unit,
    },
    TimeUnit: desired.timeUnit,
    CostFilters: desired.costFilters ?? undefined,
  };
};
