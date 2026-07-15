import {
  DomainEntity,
  type Ref,
  RefByPrimary,
  RefByUnique,
} from 'domain-objects';

import type { DeclaredAwsBudget } from './DeclaredAwsBudget';
import { DeclaredAwsBudgetActionDefinition } from './DeclaredAwsBudgetActionDefinition';
import { DeclaredAwsBudgetSubscriber } from './DeclaredAwsBudgetSubscriber';
import { DeclaredAwsBudgetThreshold } from './DeclaredAwsBudgetThreshold';
import type { DeclaredAwsIamRole } from './DeclaredAwsIamRole';

/**
 * .what = a guard on an aws budget — a hard action AWS runs when spend breaches
 * .why = declares a guard that references a DeclaredAwsBudget and, at a threshold,
 *        either blocks NEW spend (APPLY_SCP_POLICY) or halts ACTIVE spend
 *        (RUN_SSM_DOCUMENTS); declare both, at tiered thresholds, for a staged halt
 *
 * .identity
 *   - @unique = [budget, kind] — one guard of each kind per budget. AWS
 *     assigns a UUID (actionId), but a user cannot know it up front, so the
 *     declarative identity is the budget it guards plus the kind of action
 *   - no @primary — addressed by the unique tuple; actionId is aws-assigned metadata
 *
 * .note
 *   - the BUDGET and the executionRole must exist before the action is created
 *   - AWS auto-reverses an SCP/IAM action at the next budget period; an SSM stop is NOT reversed
 *   - AWS evaluates a few times per day, so the guard lags a fast spike
 *   - Budgets is a global service pinned to us-east-1 (see getAwsBudgetsClient)
 *
 * @see https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_budgets_CreateBudgetAction.html
 * @see https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_budgets_Action.html
 */
export interface DeclaredAwsBudgetAction {
  /**
   * .what = the aws-assigned UUID of the action
   * .note = @metadata — assigned by aws on creation
   */
  actionId?: string;

  /**
   * .what = reference to the budget this guard belongs to
   * .note = referenced by unique (name) for declarative definition
   */
  budget: RefByUnique<typeof DeclaredAwsBudget>;

  /**
   * .what = the kind of action AWS runs when the threshold breaches
   * .constraint = one of APPLY_IAM_POLICY | APPLY_SCP_POLICY | RUN_SSM_DOCUMENTS
   * .note = selects which form of `definition` is honored
   */
  kind: 'APPLY_IAM_POLICY' | 'APPLY_SCP_POLICY' | 'RUN_SSM_DOCUMENTS';

  /**
   * .what = whether the guard watches actual or forecasted spend
   * .constraint = one of ACTUAL | FORECASTED (maps to AWS NotificationType)
   */
  basis: 'ACTUAL' | 'FORECASTED';

  /**
   * .what = the bar that fires the guard
   */
  threshold: DeclaredAwsBudgetThreshold;

  /**
   * .what = whether AWS runs the action hands-off or awaits a human approval
   * .constraint = one of AUTOMATIC | MANUAL (maps to AWS ApprovalModel)
   */
  approvalModel: 'AUTOMATIC' | 'MANUAL';

  /**
   * .what = reference to the IAM role AWS assumes to run + reverse the action
   * .note = a unique (name) or primary (arn) ref; apply derives the ExecutionRoleArn
   */
  executionRole: Ref<typeof DeclaredAwsIamRole>;

  /**
   * .what = the type-specific parameters (the hammer the guard swings)
   * .note = exactly one form (scp | ssm | iam) is set, per kind
   */
  definition: DeclaredAwsBudgetActionDefinition;

  /**
   * .what = the recipients AWS notifies when the guard fires
   */
  subscribers: DeclaredAwsBudgetSubscriber[];
}

/**
 * .note = semantically a guard attached to a budget, but extends DomainEntity for
 *         DAO infrastructure compatibility. addressed by the unique tuple; the
 *         aws-assigned actionId is metadata.
 */
export class DeclaredAwsBudgetAction
  extends DomainEntity<DeclaredAwsBudgetAction>
  implements DeclaredAwsBudgetAction
{
  /**
   * .what = unique by budget + kind — one guard of each kind per budget
   */
  public static unique = ['budget', 'kind'] as const;

  /**
   * .what = metadata assigned by aws
   */
  public static metadata = ['actionId'] as const;

  /**
   * .what = no readonly fields — all non-metadata fields are user-defined desired state
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   * .note = budget + executionRole are refs; threshold, definition, subscribers are nested
   */
  public static nested = {
    budget: RefByUnique<typeof DeclaredAwsBudget>,
    executionRole: [RefByPrimary, RefByUnique],
    threshold: DeclaredAwsBudgetThreshold,
    definition: DeclaredAwsBudgetActionDefinition,
    subscribers: DeclaredAwsBudgetSubscriber,
  };
}
