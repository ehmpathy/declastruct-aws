import { DomainEntity, DomainLiteral, RefByUnique } from 'domain-objects';

import type { DeclaredAwsEc2Instance } from './DeclaredAwsEc2Instance';

/**
 * .what = the local end of the tunnel
 * .note = mirrors DeclaredAwsSsmVpcTunnelFrom for symmetry across tunnel types
 */
export interface DeclaredAwsSsmSshTunnelFrom {
  port: number;
}
export class DeclaredAwsSsmSshTunnelFrom
  extends DomainLiteral<DeclaredAwsSsmSshTunnelFrom>
  implements DeclaredAwsSsmSshTunnelFrom {}

/**
 * .what = the remote end on the instance to forward into
 * .note = mirrors DeclaredAwsSsmVpcTunnelInto for symmetry across tunnel types
 */
export interface DeclaredAwsSsmSshTunnelInto {
  port: number;
}
export class DeclaredAwsSsmSshTunnelInto
  extends DomainLiteral<DeclaredAwsSsmSshTunnelInto>
  implements DeclaredAwsSsmSshTunnelInto {}

/**
 * .what = a declarative structure for an SSH tunnel via SSM Session Manager
 * .why = enables declarative control of SSH tunnels through SSM to EC2 instances
 *
 * .identity
 *   - @unique = [instance.exid, from.port]
 *
 * .hazard mitigation
 *   - pid reuse detected via (pid + port + spawnedAt) triple check
 *   - rationale: OS PID reuse detected by timestamp mismatch; port bind fails if wrong process
 */
export interface DeclaredAwsSsmSshTunnel {
  /**
   * .what = the instance to tunnel into
   */
  instance: RefByUnique<typeof DeclaredAwsEc2Instance>;

  /**
   * .what = the local end to bind the tunnel to
   * .note = is @unique with instance -> one tunnel per local port per instance
   */
  from: DeclaredAwsSsmSshTunnelFrom;

  /**
   * .what = the remote end to forward to on the instance
   * .note = port 22 for SSH
   */
  into: DeclaredAwsSsmSshTunnelInto;

  /**
   * .what = the desired tunnel status
   */
  status: 'OPEN' | 'CLOSED';

  /**
   * .what = the process id of the tunnel subprocess
   * .note = is @readonly -> null when CLOSED, number when OPEN, undefined on write
   */
  pid?: number | null;

  /**
   * .what = when the tunnel process was spawned
   * .note = is @readonly -> used with pid for reuse detection
   */
  spawnedAt?: string | null;
}

export class DeclaredAwsSsmSshTunnel
  extends DomainEntity<DeclaredAwsSsmSshTunnel>
  implements DeclaredAwsSsmSshTunnel
{
  public static unique = ['instance', 'from'] as const;

  /**
   * .what = identity attributes assigned by the system
   */
  public static metadata = [] as const;

  /**
   * .what = intrinsic attributes resolved at runtime, not user-settable
   * .note = pid is null when CLOSED, number when OPEN
   */
  public static readonly = ['pid', 'spawnedAt'] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    instance: RefByUnique<typeof DeclaredAwsEc2Instance>,
    from: DeclaredAwsSsmSshTunnelFrom,
    into: DeclaredAwsSsmSshTunnelInto,
  };
}
