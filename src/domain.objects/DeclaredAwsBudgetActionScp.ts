import {
  DomainLiteral,
  type Ref,
  RefByPrimary,
  RefByUnique,
} from 'domain-objects';

import type { DeclaredAwsOrganizationAccount } from './DeclaredAwsOrganizationAccount';
import type { DeclaredAwsOrganizationServiceControlPolicy } from './DeclaredAwsOrganizationServiceControlPolicy';

/**
 * .what = the SCP form of a budget action — attach a deny-SCP to block NEW spend
 * .why = maps to AWS's `ScpActionDefinition` ({ PolicyId, TargetIds }); at apply
 *        time the policy ref derives the PolicyId and the target ref derives the
 *        TargetIds (one account id)
 * .note
 *   - blocks new launches only; live resources stay active (pair with the SSM
 *     form to also halt active spend)
 *   - the management account is SCP-exempt, so a self-guard silently no-ops
 */
export interface DeclaredAwsBudgetActionScp {
  /**
   * .what = reference to the deny-SCP to attach when the action fires
   * .note = a unique (name) or primary (id) ref; apply derives the PolicyId
   */
  policy: Ref<typeof DeclaredAwsOrganizationServiceControlPolicy>;

  /**
   * .what = reference to the account the SCP attaches to when the action fires
   * .note = a unique (email) or primary (id) ref; apply derives the TargetIds
   */
  target: Ref<typeof DeclaredAwsOrganizationAccount>;
}

export class DeclaredAwsBudgetActionScp
  extends DomainLiteral<DeclaredAwsBudgetActionScp>
  implements DeclaredAwsBudgetActionScp
{
  /**
   * .what = nested ref definitions
   * .note = both refs are a union of primary or unique
   */
  public static nested = {
    policy: [RefByPrimary, RefByUnique],
    target: [RefByPrimary, RefByUnique],
  };
}
