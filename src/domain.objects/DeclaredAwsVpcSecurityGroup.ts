import { DomainEntity, type Ref, RefByUnique } from 'domain-objects';

import { DeclaredAwsTags } from './DeclaredAwsTags';
import type { DeclaredAwsVpc } from './DeclaredAwsVpc';
import { DeclaredAwsVpcSecurityGroupRules } from './DeclaredAwsVpcSecurityGroupRules';

/**
 * .what = a declarative structure which represents an AWS VPC security group
 * .why = enables declarative control of AWS VPC security groups
 *
 * .identity
 *   - @primary = [id] — assigned by AWS on creation
 *   - @unique = [exid] — tag-based lookup for declarative reference
 */
export interface DeclaredAwsVpcSecurityGroup {
  /**
   * .what = the security group id
   * .note = is @metadata -> identity assigned by AWS
   */
  id?: string;

  /**
   * .what = the external id tag for declarative reference
   * .note = used for RefByUnique lookup
   */
  exid: string;

  /**
   * .what = reference to the VPC this security group belongs to
   */
  vpc: Ref<typeof DeclaredAwsVpc>;

  /**
   * .what = the name of the security group
   */
  name: string;

  /**
   * .what = the description of the security group
   */
  description: string;

  /**
   * .what = the rules for the security group
   */
  rules: DeclaredAwsVpcSecurityGroupRules;

  /**
   * .what = tags for the security group
   */
  tags: DeclaredAwsTags | null;
}

export class DeclaredAwsVpcSecurityGroup
  extends DomainEntity<DeclaredAwsVpcSecurityGroup>
  implements DeclaredAwsVpcSecurityGroup
{
  public static primary = ['id'] as const;
  public static unique = ['exid'] as const;

  /**
   * .what = identity attributes assigned by AWS
   */
  public static metadata = ['id'] as const;

  /**
   * .what = no readonly fields — all fields are either metadata or user-defined
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   * .note = vpc is RefByUnique ref, not full domain object
   */
  public static nested = {
    vpc: RefByUnique<typeof DeclaredAwsVpc>,
    rules: DeclaredAwsVpcSecurityGroupRules,
    tags: DeclaredAwsTags,
  };
}
