import { DomainEntity, RefByPrimary, RefByUnique } from 'domain-objects';

import type { DeclaredAwsIamPolicy } from './DeclaredAwsIamPolicy';
import type { DeclaredAwsIamRole } from './DeclaredAwsIamRole';

/**
 * .what = a managed policy reference attached to an iam role
 * .why = attaches an existing managed policy to grant permissions to the role
 *
 * .identity
 *   - @unique = [role, policy] composite — the attachment is uniquely identified by role + policy
 *   - no @primary — attachments do not have an arn
 *
 * .note
 *   - managed policies are standalone resources (vs inline documents embedded in roles)
 *   - can reference aws-managed (arn:aws:iam::aws:policy/...) or customer-managed policies
 *   - use DeclaredAwsIamRolePolicyAttachedInline for inline policy documents
 */
export interface DeclaredAwsIamRolePolicyAttachedManaged {
  /**
   * .what = reference to the role this policy is attached to
   */
  role: RefByUnique<typeof DeclaredAwsIamRole>;

  /**
   * .what = reference to the managed policy to attach
   */
  policy: RefByPrimary<typeof DeclaredAwsIamPolicy>;
}

export class DeclaredAwsIamRolePolicyAttachedManaged
  extends DomainEntity<DeclaredAwsIamRolePolicyAttachedManaged>
  implements DeclaredAwsIamRolePolicyAttachedManaged
{
  /**
   * .what = unique by role + policy combination
   * .note = a policy can only be attached once per role
   */
  public static unique = ['role', 'policy'] as const;

  /**
   * .what = no metadata — attachments have no aws-assigned identity
   */
  public static metadata = [] as const;

  /**
   * .what = no readonly fields — all fields are user-defined
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    role: RefByUnique<typeof DeclaredAwsIamRole>,
    policy: RefByPrimary<typeof DeclaredAwsIamPolicy>,
  };
}
