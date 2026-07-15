import { DomainLiteral } from 'domain-objects';

import { DeclaredAwsBudgetActionIam } from './DeclaredAwsBudgetActionIam';
import { DeclaredAwsBudgetActionScp } from './DeclaredAwsBudgetActionScp';
import { DeclaredAwsBudgetActionSsm } from './DeclaredAwsBudgetActionSsm';

/**
 * .what = the type-specific parameters of a budget action — the hammer it swings
 * .why = maps to AWS's `Definition` union ({ ScpActionDefinition,
 *        SsmActionDefinition, IamActionDefinition }); the action's kind
 *        selects which form is honored
 * .note
 *   - exactly one form is set, per the action's kind; the others are null
 *   - scp = block new spend, ssm = halt active spend, iam = block via IAM policy
 */
export interface DeclaredAwsBudgetActionDefinition {
  /**
   * .what = the SCP form (block new spend); null when kind is not APPLY_SCP_POLICY
   */
  scp: DeclaredAwsBudgetActionScp | null;

  /**
   * .what = the SSM form (halt active spend); null when kind is not RUN_SSM_DOCUMENTS
   */
  ssm: DeclaredAwsBudgetActionSsm | null;

  /**
   * .what = the IAM form (block via IAM policy); null when kind is not APPLY_IAM_POLICY
   */
  iam: DeclaredAwsBudgetActionIam | null;
}

export class DeclaredAwsBudgetActionDefinition
  extends DomainLiteral<DeclaredAwsBudgetActionDefinition>
  implements DeclaredAwsBudgetActionDefinition
{
  /**
   * .what = nested domain object definitions for each form
   */
  public static nested = {
    scp: DeclaredAwsBudgetActionScp,
    ssm: DeclaredAwsBudgetActionSsm,
    iam: DeclaredAwsBudgetActionIam,
  };
}
