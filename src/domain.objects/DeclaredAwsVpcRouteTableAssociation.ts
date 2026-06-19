import { DomainLiteral, type Ref, RefByUnique } from 'domain-objects';

import type { DeclaredAwsVpcSubnet } from './DeclaredAwsVpcSubnet';

/**
 * .what = an association between a route table and a subnet
 * .why = defines which subnet uses this route table
 */
export interface DeclaredAwsVpcRouteTableAssociation {
  /**
   * .what = reference to the subnet to associate
   */
  subnet: Ref<typeof DeclaredAwsVpcSubnet>;
}

export class DeclaredAwsVpcRouteTableAssociation
  extends DomainLiteral<DeclaredAwsVpcRouteTableAssociation>
  implements DeclaredAwsVpcRouteTableAssociation
{
  /**
   * .what = nested domain object definitions
   * .note = subnet is RefByUnique ref, not full domain object
   */
  public static nested = {
    subnet: RefByUnique<typeof DeclaredAwsVpcSubnet>,
  };
}
