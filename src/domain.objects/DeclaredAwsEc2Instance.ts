import { DomainEntity } from 'domain-objects';

/**
 * .what = a declarative structure which represents an AWS EC2 instance
 * .why = enables declarative control of AWS EC2 instances
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
   * .what = the current status of the instance
   * .note = is @readonly -> resolved from AWS
   */
  status?:
    | 'pending'
    | 'running'
    | 'stopping'
    | 'stopped'
    | 'shutting-down'
    | 'terminated';

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
   * .what = identity attributes assigned by the persistence layer
   * .note = describes the entity for persistence purposes, not intrinsic attributes
   */
  public static metadata = ['id'] as const;

  /**
   * .what = intrinsic attributes resolved from AWS, not user-settable
   * .note = these are real attributes of the resource, but derived from the source of truth
   */
  public static readonly = ['status', 'privateIp'] as const;
}
