import { DomainEntity, type Ref, RefByUnique } from 'domain-objects';

import type { DeclaredAwsEc2LaunchTemplate } from './DeclaredAwsEc2LaunchTemplate';
import { DeclaredAwsTags } from './DeclaredAwsTags';
import type { DeclaredAwsVpcSecurityGroup } from './DeclaredAwsVpcSecurityGroup';
import type { DeclaredAwsVpcSubnet } from './DeclaredAwsVpcSubnet';

/**
 * .what = a declarative structure which represents an AWS EC2 instance
 * .why = enables declarative control of AWS EC2 instances (where to place it + identity)
 *
 * .identity
 *   - @primary = [id] — assigned by AWS on creation
 *   - @unique = [exid] — tag-based lookup for declarative reference
 */
export interface DeclaredAwsEc2Instance {
  /**
   * .what = the instance id
   * .note = is @metadata -> identity assigned by AWS
   */
  id?: string;

  /**
   * .what = the external id tag for declarative reference
   * .note = used for RefByUnique lookup
   */
  exid: string;

  /**
   * .what = the launch template to use
   * .note = null for instances without template (backwards compat)
   */
  template: Ref<typeof DeclaredAwsEc2LaunchTemplate> | null;

  /**
   * .what = reference to the subnet for placement
   */
  subnet: Ref<typeof DeclaredAwsVpcSubnet>;

  /**
   * .what = references to the security groups
   */
  securityGroups: Ref<typeof DeclaredAwsVpcSecurityGroup>[];

  /**
   * .what = tags for the instance
   */
  tags: DeclaredAwsTags | null;

  /**
   * .what = the private IP address
   * .note = is @readonly -> resolved from AWS
   */
  privateIp?: string;
}

export class DeclaredAwsEc2Instance
  extends DomainEntity<DeclaredAwsEc2Instance>
  implements DeclaredAwsEc2Instance
{
  public static primary = ['id'] as const;
  public static unique = ['exid'] as const;

  /**
   * .what = identity attributes assigned by AWS
   */
  public static metadata = ['id'] as const;

  /**
   * .what = intrinsic attributes resolved from AWS, not user-settable
   */
  public static readonly = ['privateIp'] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    template: RefByUnique<typeof DeclaredAwsEc2LaunchTemplate>,
    subnet: RefByUnique<typeof DeclaredAwsVpcSubnet>,
    securityGroups: [RefByUnique<typeof DeclaredAwsVpcSecurityGroup>],
    tags: DeclaredAwsTags,
  };
}
