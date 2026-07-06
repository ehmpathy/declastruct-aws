import { DomainLiteral, type Ref, RefByUnique } from 'domain-objects';

import type { DeclaredAwsVpcInternetGateway } from './DeclaredAwsVpcInternetGateway';
import { DeclaredAwsVpcRouteTargetNatGateway } from './DeclaredAwsVpcRouteTargetNatGateway';
import { DeclaredAwsVpcRouteTargetNatInstance } from './DeclaredAwsVpcRouteTargetNatInstance';

/**
 * .what = the target for a VPC route
 * .why = defines where traffic that fits the route should be sent
 * .note = must specify exactly one target type
 */
export interface DeclaredAwsVpcRouteTarget {
  /**
   * .what = route to an internet gateway
   * .note = supports both id (from cast) and exid (for declarations)
   */
  gatewayInternet?: Ref<typeof DeclaredAwsVpcInternetGateway>;

  /**
   * .what = route to a NAT gateway by AWS id
   * .note = NAT gateways are not managed by declastruct, so we use AWS id
   */
  gatewayNat?: DeclaredAwsVpcRouteTargetNatGateway;

  /**
   * .what = route to a NAT instance (fck-nat) by EC2 instance id
   * .note = fck-nat instances are ephemeral and not managed by declastruct
   */
  instanceNat?: DeclaredAwsVpcRouteTargetNatInstance;
}

export class DeclaredAwsVpcRouteTarget
  extends DomainLiteral<DeclaredAwsVpcRouteTarget>
  implements DeclaredAwsVpcRouteTarget
{
  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    gatewayInternet: RefByUnique<typeof DeclaredAwsVpcInternetGateway>,
    gatewayNat: DeclaredAwsVpcRouteTargetNatGateway,
    instanceNat: DeclaredAwsVpcRouteTargetNatInstance,
  };
}
