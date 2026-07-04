import { DomainEntity, type Ref, RefByUnique } from 'domain-objects';

import { DeclaredAwsEc2InstanceNetwork } from './DeclaredAwsEc2InstanceNetwork';
import type { DeclaredAwsEc2LaunchTemplate } from './DeclaredAwsEc2LaunchTemplate';
import { DeclaredAwsTags } from './DeclaredAwsTags';

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
   * .what = the network config (placement subnet, security groups, nic)
   */
  network: DeclaredAwsEc2InstanceNetwork;

  /**
   * .what = tags for the instance
   */
  tags: DeclaredAwsTags | null;
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
   * .note = nested via dot-path; the nic ip addresses live under network.interface
   */
  public static readonly = [
    'network.interface.privateIp',
    'network.interface.publicIp',
  ] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    template: RefByUnique<typeof DeclaredAwsEc2LaunchTemplate>,
    network: DeclaredAwsEc2InstanceNetwork,
    tags: DeclaredAwsTags,
  };
}
