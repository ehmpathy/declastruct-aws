import { DomainEntity, RefByUnique } from 'domain-objects';

import type { DeclaredAwsIamInstanceProfile } from './DeclaredAwsIamInstanceProfile';
import { DeclaredAwsTags } from './DeclaredAwsTags';

/**
 * .what = a declarative structure representing an AWS EC2 launch template
 * .why = enables declarative control of EC2 instance configuration (what the machine is)
 */
export interface DeclaredAwsEc2LaunchTemplate {
  /**
   * .what = the launch template id
   * .note = is @metadata -> identity assigned by AWS
   */
  id?: string;

  /**
   * .what = the external id tag for declarative reference
   * .note = used for RefByUnique lookup
   */
  exid: string;

  /**
   * .what = the instance type
   * .note = e.g., 't3.medium', 't3.large'
   */
  instanceType: string;

  /**
   * .what = the AMI image id
   * .note = e.g., 'ami-0abcd1234567890ef'
   */
  imageId: string;

  /**
   * .what = whether hibernation is enabled
   * .note = requires rootVolumeEncrypted: true
   */
  hibernation: boolean;

  /**
   * .what = the root volume size in GiB
   */
  rootVolumeSize: number;

  /**
   * .what = whether the root volume is encrypted
   * .note = required for hibernation
   */
  rootVolumeEncrypted: boolean;

  /**
   * .what = reference to the IAM instance profile
   * .note = null if no profile
   */
  iamInstanceProfile: RefByUnique<typeof DeclaredAwsIamInstanceProfile> | null;

  /**
   * .what = user data (base64-encoded)
   * .note = null if no user data
   */
  userData: string | null;

  /**
   * .what = AWS tags
   * .note = null defaults to exid tag only
   */
  tags: DeclaredAwsTags | null;
}

export class DeclaredAwsEc2LaunchTemplate
  extends DomainEntity<DeclaredAwsEc2LaunchTemplate>
  implements DeclaredAwsEc2LaunchTemplate
{
  public static primary = ['id'] as const;
  public static unique = ['exid'] as const;

  /**
   * .what = identity attributes assigned by the persistence layer
   * .note = describes the entity for persistence purposes, not intrinsic attributes
   */
  public static metadata = ['id'] as const;

  /**
   * .what = intrinsic attributes resolved from AWS, not user-settable
   * .note = launch templates have no readonly fields - all config is user-set
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    iamInstanceProfile: RefByUnique<typeof DeclaredAwsIamInstanceProfile>,
    tags: DeclaredAwsTags,
  };
}
