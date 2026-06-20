import { DomainEntity } from 'domain-objects';

import { DeclaredAwsTags } from './DeclaredAwsTags';
import { DeclaredAwsVpcCidrBlock } from './DeclaredAwsVpcCidrBlock';
import { DeclaredAwsVpcDnsChoices } from './DeclaredAwsVpcDnsChoices';

/**
 * .what = a declarative structure which represents an AWS VPC
 * .why = enables declarative control of AWS VPCs
 *
 * .identity
 *   - @primary = [id] — assigned by AWS on creation
 *   - @unique = [exid] — tag-based lookup for declarative reference
 */
export interface DeclaredAwsVpc {
  /**
   * .what = the VPC id
   * .note = is @metadata -> identity assigned by AWS
   */
  id?: string;

  /**
   * .what = the external id tag for declarative reference
   * .note = used for RefByUnique lookup
   */
  exid: string;

  /**
   * .what = the CIDR block for the VPC
   */
  cidr: DeclaredAwsVpcCidrBlock;

  /**
   * .what = DNS configuration for the VPC
   */
  dns: DeclaredAwsVpcDnsChoices;

  /**
   * .what = tags for the VPC
   */
  tags: DeclaredAwsTags | null;
}

export class DeclaredAwsVpc
  extends DomainEntity<DeclaredAwsVpc>
  implements DeclaredAwsVpc
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
   */
  public static nested = {
    cidr: DeclaredAwsVpcCidrBlock,
    dns: DeclaredAwsVpcDnsChoices,
    tags: DeclaredAwsTags,
  };
}
