import { DomainLiteral } from 'domain-objects';

/**
 * .what = the IAM form of a budget action — attach an IAM policy to block spend
 * .why = maps to AWS's `IamActionDefinition` ({ PolicyArn, Roles, Groups, Users });
 *        the fallback for a standalone (non-org) account where SCPs are absent
 * .note
 *   - at least one of roles / groups / users must be present per AWS
 *   - AWS auto-reverses the IAM attach at the next budget period start
 */
export interface DeclaredAwsBudgetActionIam {
  /**
   * .what = the arn of the IAM policy to attach when the action fires
   */
  policyArn: string;

  /**
   * .what = the role names the policy attaches to; empty = none
   */
  roleNames: string[];

  /**
   * .what = the group names the policy attaches to; empty = none
   */
  groupNames: string[];

  /**
   * .what = the user names the policy attaches to; empty = none
   */
  userNames: string[];
}

export class DeclaredAwsBudgetActionIam
  extends DomainLiteral<DeclaredAwsBudgetActionIam>
  implements DeclaredAwsBudgetActionIam {}
