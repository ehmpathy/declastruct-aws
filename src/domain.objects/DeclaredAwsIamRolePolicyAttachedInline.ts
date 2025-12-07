import { DomainEntity, RefByUnique } from 'domain-objects';

import { DeclaredAwsIamPolicyDocument } from './DeclaredAwsIamPolicyDocument';
import type { DeclaredAwsIamRole } from './DeclaredAwsIamRole';

/**
 * .what = an inline policy document attached to an iam role
 * .why = grants permissions to the role for specific aws actions
 *
 * .identity
 *   - @unique = [role, name] composite — the inline policy is uniquely identified by role + policy name
 *   - no @primary — inline policies do not have an arn
 *
 * .note
 *   - inline policies are embedded in the role, not standalone managed policies
 *   - use DeclaredAwsIamRolePolicyAttachedManaged for managed policy attachments
 */
export interface DeclaredAwsIamRolePolicyAttachedInline {
  /**
   * .what = the name of this inline policy
   * .note = unique within the role, not globally
   */
  name: string;

  /**
   * .what = reference to the role this policy is attached to
   */
  role: RefByUnique<typeof DeclaredAwsIamRole>;

  /**
   * .what = the policy document containing permission statements
   */
  document: DeclaredAwsIamPolicyDocument;
}

export class DeclaredAwsIamRolePolicyAttachedInline
  extends DomainEntity<DeclaredAwsIamRolePolicyAttachedInline>
  implements DeclaredAwsIamRolePolicyAttachedInline
{
  /**
   * .what = unique within the role, identified by role reference + policy name
   * .note
   *   - inline policies have no arn, so no primary key
   *   - identity is established via the composite unique key
   */
  public static unique = ['role', 'name'] as const;

  /**
   * .what = no metadata — inline policies have no aws-assigned identity
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
    document: DeclaredAwsIamPolicyDocument,
  };
}
