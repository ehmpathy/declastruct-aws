import { DomainEntity } from 'domain-objects';

import { DeclaredAwsIamPolicyDocument } from './DeclaredAwsIamPolicyDocument';
import { DeclaredAwsTags } from './DeclaredAwsTags';

/**
 * .what = an aws iam managed policy
 * .why = defines reusable permission sets that can be attached to roles, users, or groups
 *
 * .identity
 *   - @primary = [arn] — assigned by aws on creation
 *   - @unique = [name, path] — policy names are unique within a path
 *
 * .note
 *   - managed policies are standalone resources (vs inline policies embedded in roles)
 *   - can be aws-managed (arn:aws:iam::aws:policy/...) or customer-managed
 *   - policy document is versioned; this represents the default version
 *
 * @see https://docs.aws.amazon.com/IAM/latest/APIReference/API_GetPolicy.html
 */
export interface DeclaredAwsIamPolicy {
  /**
   * .what = the arn of the policy
   * .note = @metadata — assigned by aws on creation
   */
  arn?: string;

  /**
   * .what = the name of the policy
   * .note = @unique (with path) — unique within the path
   */
  name: string;

  /**
   * .what = the path for the policy
   * .default = '/'
   */
  path?: string;

  /**
   * .what = optional description of the policy's purpose
   */
  description?: string;

  /**
   * .what = the policy document containing permission statements
   */
  document: DeclaredAwsIamPolicyDocument;

  /**
   * .what = optional tags for the policy
   */
  tags?: DeclaredAwsTags;
}

export class DeclaredAwsIamPolicy
  extends DomainEntity<DeclaredAwsIamPolicy>
  implements DeclaredAwsIamPolicy
{
  /**
   * .what = arn is the primary key assigned by aws
   */
  public static primary = ['arn'] as const;

  /**
   * .what = policy name + path is unique within the aws account
   */
  public static unique = ['name', 'path'] as const;

  /**
   * .what = identity attributes assigned by aws
   */
  public static metadata = ['arn'] as const;

  /**
   * .what = no readonly fields — all fields are either metadata or user-defined
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    document: DeclaredAwsIamPolicyDocument,
    tags: DeclaredAwsTags,
  };
}
