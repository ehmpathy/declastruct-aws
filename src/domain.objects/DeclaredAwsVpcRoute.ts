import { DomainLiteral } from 'domain-objects';

import { DeclaredAwsVpcRouteDestination } from './DeclaredAwsVpcRouteDestination';
import { DeclaredAwsVpcRouteTarget } from './DeclaredAwsVpcRouteTarget';

/**
 * .what = a route in a VPC route table
 * .why = defines how traffic is routed for a given destination
 */
export interface DeclaredAwsVpcRoute {
  /**
   * .what = the destination CIDR block for the route
   */
  destination: DeclaredAwsVpcRouteDestination;

  /**
   * .what = the target for the route
   * .note = must specify exactly one target type
   */
  target: DeclaredAwsVpcRouteTarget;
}

export class DeclaredAwsVpcRoute
  extends DomainLiteral<DeclaredAwsVpcRoute>
  implements DeclaredAwsVpcRoute
{
  public static nested = {
    destination: DeclaredAwsVpcRouteDestination,
    target: DeclaredAwsVpcRouteTarget,
  };
}
