import { DomainLiteral } from 'domain-objects';

import { DeclaredAwsVpcCidrBlock } from './DeclaredAwsVpcCidrBlock';

/**
 * .what = the destination for a VPC route
 * .why = wraps CIDR block for route destination with nested hydration
 */
export interface DeclaredAwsVpcRouteDestination {
  /**
   * .what = the CIDR block for the destination
   */
  cidr: DeclaredAwsVpcCidrBlock;
}

export class DeclaredAwsVpcRouteDestination
  extends DomainLiteral<DeclaredAwsVpcRouteDestination>
  implements DeclaredAwsVpcRouteDestination
{
  public static nested = {
    cidr: DeclaredAwsVpcCidrBlock,
  };
}
