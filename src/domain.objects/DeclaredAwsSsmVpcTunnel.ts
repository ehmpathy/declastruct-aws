import { DomainEntity, DomainLiteral, RefByUnique } from 'domain-objects';

import type { DeclaredAwsEc2Instance } from './DeclaredAwsEc2Instance';
import type { DeclaredAwsRdsCluster } from './DeclaredAwsRdsCluster';

/**
 * .what = the bastion instance to tunnel through and the mechanism
 */
export interface DeclaredAwsSsmVpcTunnelVia {
  mechanism: 'aws.ssm';
  bastion: RefByUnique<typeof DeclaredAwsEc2Instance>;
}
export class DeclaredAwsSsmVpcTunnelVia
  extends DomainLiteral<DeclaredAwsSsmVpcTunnelVia>
  implements DeclaredAwsSsmVpcTunnelVia
{
  public static nested = {
    bastion: RefByUnique<typeof DeclaredAwsEc2Instance>,
  };
}

/**
 * .what = the target resource to tunnel into
 */
export interface DeclaredAwsSsmVpcTunnelInto {
  cluster: RefByUnique<typeof DeclaredAwsRdsCluster>;
}
export class DeclaredAwsSsmVpcTunnelInto
  extends DomainLiteral<DeclaredAwsSsmVpcTunnelInto>
  implements DeclaredAwsSsmVpcTunnelInto
{
  public static nested = {
    cluster: RefByUnique<typeof DeclaredAwsRdsCluster>,
  };
}

/**
 * .what = the local binding for the tunnel
 */
export interface DeclaredAwsSsmVpcTunnelFrom {
  host: string;
  port: number;
}
export class DeclaredAwsSsmVpcTunnelFrom
  extends DomainLiteral<DeclaredAwsSsmVpcTunnelFrom>
  implements DeclaredAwsSsmVpcTunnelFrom {}

/**
 * .what = a declarative structure representing a VPC tunnel
 * .why = enables declarative control of SSM port-forwarding tunnels to private resources
 */
export interface DeclaredAwsSsmVpcTunnel {
  /**
   * .what = the aws account id whose credentials opened this tunnel
   */
  account: string;

  /**
   * .what = the aws region whose credentials opened this tunnel
   */
  region: string;

  /**
   * .what = the bastion instance to tunnel through and the mechanism
   */
  via: DeclaredAwsSsmVpcTunnelVia;

  /**
   * .what = the target resource to tunnel into
   */
  into: DeclaredAwsSsmVpcTunnelInto;

  /**
   * .what = the origin resource to tunnel from
   */
  from: DeclaredAwsSsmVpcTunnelFrom;

  /**
   * .what = the current tunnel status
   */
  status: 'OPEN' | 'CLOSED';

  /**
   * .what = the process id of the tunnel subprocess
   * .note = is @readonly -> null when CLOSED, number when OPEN, undefined on write
   */
  pid?: number | null;
}

export class DeclaredAwsSsmVpcTunnel
  extends DomainEntity<DeclaredAwsSsmVpcTunnel>
  implements DeclaredAwsSsmVpcTunnel
{
  public static unique = ['account', 'region', 'via', 'into', 'from'] as const;

  /**
   * .what = identity attributes assigned by the persistence layer
   * .note = vpc tunnels have no external identity; they are identified by unique keys
   */
  public static metadata = [] as const;

  /**
   * .what = intrinsic attributes resolved at runtime, not user-settable
   * .note = pid is null when CLOSED, number when OPEN
   */
  public static readonly = ['pid'] as const;

  /**
   * .what = defines nested object shapes for domain-objects manipulation
   * .why = enables serialization, comparison, and ref extraction
   */
  public static nested = {
    via: DeclaredAwsSsmVpcTunnelVia,
    into: DeclaredAwsSsmVpcTunnelInto,
    from: DeclaredAwsSsmVpcTunnelFrom,
  };
}
