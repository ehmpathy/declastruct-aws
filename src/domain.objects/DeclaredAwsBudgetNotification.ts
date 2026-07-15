import { DomainEntity, RefByUnique } from 'domain-objects';

import type { DeclaredAwsBudget } from './DeclaredAwsBudget';
import { DeclaredAwsBudgetSubscriber } from './DeclaredAwsBudgetSubscriber';
import { DeclaredAwsBudgetThreshold } from './DeclaredAwsBudgetThreshold';

/**
 * .what = a threshold-alert tier of an aws budget — fires when spend crosses a bar
 * .why = declares one alert rule that references a DeclaredAwsBudget and fans out
 *        to subscribers; AWS evaluates it a few times per day against the budget's
 *        actual/forecasted spend and notifies each subscriber when it trips
 *
 * .identity
 *   - @unique = [budget, basis, comparison, threshold] composite — a
 *     notification is addressed by the budget it belongs to plus the alert tuple
 *   - no @primary — AWS assigns no artificial id; the tuple is the identity
 *
 * .note
 *   - the BUDGET must exist before a notification for it can be created
 *   - subscribers are managed via separate CreateSubscriber/DeleteSubscriber calls
 *     and listed via DescribeSubscribersForNotification
 *   - Budgets is a global service pinned to us-east-1 (see getAwsBudgetsClient)
 *   - a budget delete cascades: it removes its notifications and subscribers too
 *
 * @see https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_budgets_CreateNotification.html
 * @see https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_budgets_Notification.html
 */
export interface DeclaredAwsBudgetNotification {
  /**
   * .what = reference to the budget this alert tier belongs to
   * .note = referenced by unique (name) for declarative definition
   */
  budget: RefByUnique<typeof DeclaredAwsBudget>;

  /**
   * .what = whether the alert watches actual or forecasted spend
   * .constraint = one of ACTUAL | FORECASTED (maps to AWS NotificationType)
   */
  basis: 'ACTUAL' | 'FORECASTED';

  /**
   * .what = how spend is compared against the threshold
   * .constraint = one of GREATER_THAN | LESS_THAN | EQUAL_TO
   * .note = maps to AWS ComparisonOperator
   */
  comparison: 'GREATER_THAN' | 'LESS_THAN' | 'EQUAL_TO';

  /**
   * .what = the bar that trips the alert — a quant plus the unit it is read in
   * .note = { quant, unit } where unit is PERCENTAGE (of the cap) or ABSOLUTE_VALUE
   */
  threshold: DeclaredAwsBudgetThreshold;

  /**
   * .what = the recipients the alert fans out to when it trips
   * .note = one SNS subscriber and up to 10 email subscribers per notification
   */
  subscribers: DeclaredAwsBudgetSubscriber[];
}

/**
 * .note = semantically a relationship (a tier attached to a budget), but extends
 *         DomainEntity for DAO infrastructure compatibility. has no primary key.
 */
export class DeclaredAwsBudgetNotification
  extends DomainEntity<DeclaredAwsBudgetNotification>
  implements DeclaredAwsBudgetNotification
{
  /**
   * .what = unique by budget + basis + comparison + threshold
   * .note = the alert tuple is unique within a budget
   */
  public static unique = [
    'budget',
    'basis',
    'comparison',
    'threshold',
  ] as const;

  /**
   * .what = no metadata — a notification has no aws-assigned identity
   */
  public static metadata = [] as const;

  /**
   * .what = no readonly fields — all fields are user-defined desired state
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   * .note = budget is a unique ref; subscribers are nested literals
   */
  public static nested = {
    budget: RefByUnique<typeof DeclaredAwsBudget>,
    threshold: DeclaredAwsBudgetThreshold,
    subscribers: DeclaredAwsBudgetSubscriber,
  };
}
