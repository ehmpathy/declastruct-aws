import { DomainLiteral } from 'domain-objects';

/**
 * .what = reference to a NAT gateway by AWS id
 * .why = NAT gateways are not managed by declastruct, so we use AWS id
 */
export interface DeclaredAwsVpcRouteTargetNatGateway {
  /**
   * .what = the NAT gateway id
   */
  id: string;
}

export class DeclaredAwsVpcRouteTargetNatGateway
  extends DomainLiteral<DeclaredAwsVpcRouteTargetNatGateway>
  implements DeclaredAwsVpcRouteTargetNatGateway {}
