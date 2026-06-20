import { DomainEntity, type Ref, RefByUnique } from 'domain-objects';

import { DeclaredAwsTags } from './DeclaredAwsTags';
import type { DeclaredAwsVpc } from './DeclaredAwsVpc';
import { DeclaredAwsVpcRoute } from './DeclaredAwsVpcRoute';
import { DeclaredAwsVpcRouteTableAssociation } from './DeclaredAwsVpcRouteTableAssociation';

/**
 * .what = a declarative structure which represents an AWS VPC route table
 * .why = enables declarative control of AWS VPC route tables
 *
 * .identity
 *   - @primary = [id] — assigned by AWS on creation
 *   - @unique = [exid] — tag-based lookup for declarative reference
 */
export interface DeclaredAwsVpcRouteTable {
  /**
   * .what = the route table id
   * .note = is @metadata -> identity assigned by AWS
   */
  id?: string;

  /**
   * .what = the external id tag for declarative reference
   * .note = used for RefByUnique lookup
   */
  exid: string;

  /**
   * .what = reference to the VPC this route table belongs to
   */
  vpc: Ref<typeof DeclaredAwsVpc>;

  /**
   * .what = the routes in this route table
   * .note = does not include the implicit local route (AWS-managed)
   */
  routes: DeclaredAwsVpcRoute[];

  /**
   * .what = the subnet associations for this route table
   * .note = does not include the main route table association (AWS-managed)
   */
  associations: DeclaredAwsVpcRouteTableAssociation[];

  /**
   * .what = tags for the route table
   */
  tags: DeclaredAwsTags | null;
}

export class DeclaredAwsVpcRouteTable
  extends DomainEntity<DeclaredAwsVpcRouteTable>
  implements DeclaredAwsVpcRouteTable
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
    routes: DeclaredAwsVpcRoute,
    associations: DeclaredAwsVpcRouteTableAssociation,
    tags: DeclaredAwsTags,
  };
}
