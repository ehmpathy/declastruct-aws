import { DomainEntity, DomainLiteral, RefByUnique } from 'domain-objects';

import { DeclaredAwsEc2Instance } from './DeclaredAwsEc2Instance';
import { DeclaredAwsRdsCluster } from './DeclaredAwsRdsCluster';

/**
 * .what = the bastion instance to tunnel through and the mechanism
 */
export interface DeclaredAwsVpcTunnelVia {
  mechanism: 'aws.ssm';
  bastion: RefByUnique<typeof DeclaredAwsEc2Instance>;
}
export class DeclaredAwsVpcTunnelVia
  extends DomainLiteral<DeclaredAwsVpcTunnelVia>
  implements DeclaredAwsVpcTunnelVia
{
  public static nested = {
    bastion: DeclaredAwsEc2Instance,
  };
}

/**
 * .what = the target resource to tunnel into
 */
export interface DeclaredAwsVpcTunnelInto {
  cluster: RefByUnique<typeof DeclaredAwsRdsCluster>;
}
export class DeclaredAwsVpcTunnelInto
  extends DomainLiteral<DeclaredAwsVpcTunnelInto>
  implements DeclaredAwsVpcTunnelInto
{
  public static nested = {
    cluster: DeclaredAwsRdsCluster,
  };
}

/**
 * .what = the local binding for the tunnel
 */
export interface DeclaredAwsVpcTunnelFrom {
  host: string;
  port: number;
}
export class DeclaredAwsVpcTunnelFrom
  extends DomainLiteral<DeclaredAwsVpcTunnelFrom>
  implements DeclaredAwsVpcTunnelFrom {}

/**
 * .what = a declarative structure representing a VPC tunnel
 * .why = enables declarative control of SSM port-forwarding tunnels to private resources
 */
export interface DeclaredAwsVpcTunnel {
  /**
   * .what = the bastion instance to tunnel through and the mechanism
   */
  via: DeclaredAwsVpcTunnelVia;

  /**
   * .what = the target resource to tunnel into
   */
  into: DeclaredAwsVpcTunnelInto;

  /**
   * .what = the origin resource to tunnel from
   */
  from: DeclaredAwsVpcTunnelFrom;

  /**
   * .what = the current tunnel status
   * .note = is @readonly -> 'OPEN' when tunnel is active, 'CLOSED' when not
   */
  status: 'OPEN' | 'CLOSED';

  /**
   * .what = the process id of the tunnel subprocess
   * .note = is @readonly -> only present when tunnel is OPEN
   */
  pid?: number;
}

export class DeclaredAwsVpcTunnel
  extends DomainEntity<DeclaredAwsVpcTunnel>
  implements DeclaredAwsVpcTunnel
{
  public static unique = ['via', 'into', 'from'] as const;

  /**
   * .what = intrinsic attributes resolved at runtime, not user-settable
   * .note = these are real attributes of the tunnel, but derived from the active process
   */
  public static readonly = ['status', 'pid'] as const;

  /**
   * .what = defines nested object shapes for domain-objects manipulation
   * .why = enables serialization, comparison, and ref extraction
   */
  public static nested = {
    via: DeclaredAwsVpcTunnelVia,
    into: DeclaredAwsVpcTunnelInto,
    from: DeclaredAwsVpcTunnelFrom,
  };
}
