import { DomainEntity } from 'domain-objects';

import { DeclaredAwsBudgetLimit } from './DeclaredAwsBudgetLimit';
import { DeclaredAwsTags } from './DeclaredAwsTags';

/**
 * .what = the cost/usage configuration of an aws budget — the spend cap
 * .why = declares a per-account spend limit that AWS tracks and evaluates a few
 *        times per day; alerts (DeclaredAwsBudgetNotification) and guards
 *        (DeclaredAwsBudgetAction) are SEPARATE resources that reference it
 *
 * .identity
 *   - @unique = [name] — budget names are unique within an account
 *   - no @primary — AWS assigns no artificial id; a budget is addressed by
 *     AccountId + BudgetName (the account comes from context)
 *
 * .note
 *   - this models the CAP ONLY. AWS's CreateBudget can inline notifications, but
 *     the SDK exposes independent CRUD for them, so we split each alert tier into
 *     its own DeclaredAwsBudgetNotification that references this budget
 *   - Budgets is a global service pinned to us-east-1 (see getAwsBudgetsClient)
 *   - lives in the payer/management account; costFilters scope it to a member
 *
 * @see https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_budgets_CreateBudget.html
 * @see https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_budgets_Budget.html
 */
export interface DeclaredAwsBudget {
  /**
   * .what = the friendly name of the budget
   * .note = @unique within the account
   * .constraint = may not contain ':' '\' or the '/action/' token
   */
  name: string;

  /**
   * .what = what the budget tracks
   * .constraint = one of COST | USAGE | RI_UTILIZATION | RI_COVERAGE |
   *   SAVINGS_PLANS_UTILIZATION | SAVINGS_PLANS_COVERAGE
   */
  kind:
    | 'COST'
    | 'USAGE'
    | 'RI_UTILIZATION'
    | 'RI_COVERAGE'
    | 'SAVINGS_PLANS_UTILIZATION'
    | 'SAVINGS_PLANS_COVERAGE';

  /**
   * .what = the spend cap (amount + unit)
   * .note = required for COST and USAGE budgets
   */
  limit: DeclaredAwsBudgetLimit;

  /**
   * .what = the period over which the actual and forecasted spend reset
   * .constraint = one of DAILY | MONTHLY | QUARTERLY | ANNUALLY
   */
  timeUnit: 'DAILY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';

  /**
   * .what = optional cost filters that scope the budget (e.g. by service, region,
   *         or linked account); null = the whole account
   * .note = a map of dimension -> allowed values, mirrors AWS's CostFilters
   */
  costFilters: Record<string, string[]> | null;

  /**
   * .what = optional tags for the budget
   */
  tags: DeclaredAwsTags | null;
}

export class DeclaredAwsBudget
  extends DomainEntity<DeclaredAwsBudget>
  implements DeclaredAwsBudget
{
  /**
   * .what = unique constraint — budget name is unique within the account
   */
  public static unique = ['name'] as const;

  /**
   * .what = no metadata — AWS assigns no artificial id to a budget
   */
  public static metadata = [] as const;

  /**
   * .what = no readonly fields — all fields are user-defined desired state
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    limit: DeclaredAwsBudgetLimit,
    tags: DeclaredAwsTags,
  };
}
