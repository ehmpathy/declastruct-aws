import type { Budget, ResourceTag } from '@aws-sdk/client-budgets';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsBudget } from '@src/domain.objects/DeclaredAwsBudget';
import { DeclaredAwsBudgetLimit } from '@src/domain.objects/DeclaredAwsBudgetLimit';
import { DeclaredAwsTags } from '@src/domain.objects/DeclaredAwsTags';

import { asDecimalAmountCanonical } from './asDecimalAmountCanonical';

/**
 * .what = maps an AWS Budget (+ its tags) into a DeclaredAwsBudget
 * .why = the AWS shape (BudgetName, BudgetLimit{Amount,Unit}, CostFilters, ...)
 *        differs from our declared shape; this cast is the single decode point
 */
export const castIntoDeclaredAwsBudget = (input: {
  budget: Budget;
  tags: ResourceTag[] | undefined;
}): HasReadonly<typeof DeclaredAwsBudget> => {
  const { budget, tags } = input;

  // the cap amount + unit — amount canonicalized so AWS's "21.0" matches a declared "21"
  const limit = budget.BudgetLimit
    ? new DeclaredAwsBudgetLimit({
        amount: asDecimalAmountCanonical({
          amount:
            budget.BudgetLimit.Amount ??
            UnexpectedCodePathError.throw('budget limit lacks Amount', {
              budget,
            }),
        }),
        unit:
          budget.BudgetLimit.Unit ??
          UnexpectedCodePathError.throw('budget limit lacks Unit', { budget }),
      })
    : UnexpectedCodePathError.throw('budget lacks a BudgetLimit', { budget });

  // tags map, or null when absent
  const tagsMap = (() => {
    if (!tags || tags.length === 0) return null;
    const obj: Record<string, string> = {};
    for (const tag of tags) if (tag.Key) obj[tag.Key] = tag.Value ?? '';
    return new DeclaredAwsTags(obj);
  })();

  // the reset period — we do not model CUSTOM-period budgets
  const timeUnit = budget.TimeUnit;
  if (
    timeUnit !== 'DAILY' &&
    timeUnit !== 'MONTHLY' &&
    timeUnit !== 'QUARTERLY' &&
    timeUnit !== 'ANNUALLY'
  )
    UnexpectedCodePathError.throw(
      'budget has an unsupported TimeUnit (CUSTOM periods are not modeled)',
      { budget },
    );

  return assure(
    new DeclaredAwsBudget({
      name:
        budget.BudgetName ??
        UnexpectedCodePathError.throw('budget lacks a BudgetName', { budget }),
      kind:
        budget.BudgetType ??
        UnexpectedCodePathError.throw('budget lacks a BudgetType', { budget }),
      limit,
      timeUnit,
      costFilters: budget.CostFilters ?? null,
      tags: tagsMap,
    }),
    hasReadonly({ of: DeclaredAwsBudget }),
  );
};
