import { DomainEntity, type Ref, RefByUnique } from 'domain-objects';

import { DeclaredAwsTags } from './DeclaredAwsTags';
import type { DeclaredAwsVpc } from './DeclaredAwsVpc';

/**
 * .what = a declarative structure which represents an AWS VPC internet gateway
 * .why = enables declarative control of AWS VPC internet gateways
 *
 * .identity
 *   - @primary = [id] — assigned by AWS on creation
 *   - @unique = [exid] — tag-based lookup for declarative reference
 */
export interface DeclaredAwsVpcInternetGateway {
  /**
   * .what = the internet gateway id
   * .note = is @metadata -> identity assigned by AWS
   */
  id?: string;

  /**
   * .what = the external id tag for declarative reference
   * .note = used for RefByUnique lookup
   */
  exid: string;

  /**
   * .what = reference to the VPC this internet gateway is attached to
   */
  vpc: Ref<typeof DeclaredAwsVpc>;

  /**
   * .what = tags for the internet gateway
   */
  tags: DeclaredAwsTags | null;
}

export class DeclaredAwsVpcInternetGateway
  extends DomainEntity<DeclaredAwsVpcInternetGateway>
  implements DeclaredAwsVpcInternetGateway
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
    tags: DeclaredAwsTags,
  };
}
