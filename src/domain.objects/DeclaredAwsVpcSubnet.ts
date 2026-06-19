import { DomainEntity, RefByUnique, type Ref } from 'domain-objects';

import { DeclaredAwsTags } from './DeclaredAwsTags';
import type { DeclaredAwsVpc } from './DeclaredAwsVpc';
import { DeclaredAwsVpcCidrBlock } from './DeclaredAwsVpcCidrBlock';
import { DeclaredAwsVpcSubnetZone } from './DeclaredAwsVpcSubnetZone';

/**
 * .what = a declarative structure which represents an AWS VPC subnet
 * .why = enables declarative control of AWS VPC subnets
 *
 * .identity
 *   - @primary = [id] — assigned by AWS on creation
 *   - @unique = [exid] — tag-based lookup for declarative reference
 */
export interface DeclaredAwsVpcSubnet {
  /**
   * .what = the subnet id
   * .note = is @metadata -> identity assigned by AWS
   */
  id?: string;

  /**
   * .what = the external id tag for declarative reference
   * .note = used for RefByUnique lookup
   */
  exid: string;

  /**
   * .what = reference to the VPC this subnet belongs to
   */
  vpc: Ref<typeof DeclaredAwsVpc>;

  /**
   * .what = the CIDR block for the subnet
   */
  cidr: DeclaredAwsVpcCidrBlock;

  /**
   * .what = the availability zone for the subnet
   */
  zone: DeclaredAwsVpcSubnetZone;

  /**
   * .what = tags for the subnet
   */
  tags: DeclaredAwsTags | null;
}

export class DeclaredAwsVpcSubnet
  extends DomainEntity<DeclaredAwsVpcSubnet>
  implements DeclaredAwsVpcSubnet
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
    cidr: DeclaredAwsVpcCidrBlock,
    zone: DeclaredAwsVpcSubnetZone,
    tags: DeclaredAwsTags,
  };
}
