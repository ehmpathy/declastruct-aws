import { DomainEntity, DomainLiteral } from 'domain-objects';

import { DeclaredAwsIamPolicyStatement } from './DeclaredAwsIamPolicyStatement';

/**
 * .what = an aws iam role
 * .why = defines the identity and permissions that services or users assume at runtime
 *
 * .identity
 *   - @primary = [arn] — assigned by aws on creation
 *   - @unique = [name] — role names are unique within an aws account
 *
 * .note
 *   - the trust policy defines who can assume this role (e.g., lambda.amazonaws.com, ec2.amazonaws.com)
 *   - permissions are granted via attached policies (inline or managed)
 */
export interface DeclaredAwsIamRole {
  /**
   * .what = the arn of the role
   * .note = @metadata — assigned by aws on creation
   */
  arn?: string;

  /**
   * .what = the name of the role
   * .note = @unique — unique within the aws account
   */
  name: string;

  /**
   * .what = optional organizational path for the role
   * .default = '/'
   */
  path?: string;

  /**
   * .what = optional description of the role's purpose
   */
  description?: string;

  /**
   * .what = the trust policy defining who can assume this role
   * .why = supports all trust relationships: services, cross-account, federated, conditional
   * .note
   *   - for service roles: [{ effect: 'Allow', action: 'sts:AssumeRole', principal: { service: 'lambda.amazonaws.com' } }]
   *   - factories can simplify common patterns (e.g., assumableByService('lambda.amazonaws.com'))
   */
  policies: DeclaredAwsIamPolicyStatement[];

  /**
   * .what = optional tags for the role
   */
  tags?: Record<string, string>;
}

export class DeclaredAwsIamRole
  extends DomainEntity<DeclaredAwsIamRole>
  implements DeclaredAwsIamRole
{
  /**
   * .what = arn is the primary key assigned by aws
   */
  public static primary = ['arn'] as const;

  /**
   * .what = role name is unique within the aws account
   */
  public static unique = ['name'] as const;

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
   * .note = tags is Record<string, string>, marked as DomainLiteral for safe manipulation
   */
  public static nested = {
    policies: DeclaredAwsIamPolicyStatement,
    tags: DomainLiteral,
  };
}
