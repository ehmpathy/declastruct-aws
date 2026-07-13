import { DomainLiteral } from 'domain-objects';

/**
 * .what = the SSM form of a budget action — run an SSM doc to halt ACTIVE spend
 * .why = maps to AWS's `SsmActionDefinition` ({ ActionSubType, Region,
 *        InstanceIds }); stops the live EC2/RDS instances that keep the bill up
 * .note
 *   - the stop is NOT auto-reversed at the next budget period; a human restarts
 *   - the instances must live in the given region
 */
export interface DeclaredAwsBudgetActionSsm {
  /**
   * .what = the kind of stop the SSM doc performs
   * .constraint = one of STOP_EC2_INSTANCES | STOP_RDS_INSTANCES (AWS ActionSubType)
   */
  kind: 'STOP_EC2_INSTANCES' | 'STOP_RDS_INSTANCES';

  /**
   * .what = the region the SSM doc runs in (where the instances live)
   */
  region: string;

  /**
   * .what = the EC2/RDS instance ids the SSM doc stops
   */
  instanceIds: string[];
}

export class DeclaredAwsBudgetActionSsm
  extends DomainLiteral<DeclaredAwsBudgetActionSsm>
  implements DeclaredAwsBudgetActionSsm {}
