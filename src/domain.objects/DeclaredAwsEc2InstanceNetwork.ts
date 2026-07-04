import { DomainLiteral, type Ref, RefByUnique } from 'domain-objects';

import { DeclaredAwsEc2InstanceNetworkInterface } from './DeclaredAwsEc2InstanceNetworkInterface';
import { DeclaredAwsEc2InstanceNetworkSecurity } from './DeclaredAwsEc2InstanceNetworkSecurity';
import type { DeclaredAwsVpcSubnet } from './DeclaredAwsVpcSubnet';

/**
 * .what = the network config of an ec2 instance
 * .why = groups all network concerns (placement, firewall, nic) under one bucket
 */
export interface DeclaredAwsEc2InstanceNetwork {
  /**
   * .what = reference to the subnet for placement
   * .note = ref by id or exid
   */
  subnet: Ref<typeof DeclaredAwsVpcSubnet>;

  /**
   * .what = the network security config (security group refs)
   */
  security: DeclaredAwsEc2InstanceNetworkSecurity;

  /**
   * .what = the primary network interface config (public ip, source/dest check)
   */
  interface: DeclaredAwsEc2InstanceNetworkInterface;
}

export class DeclaredAwsEc2InstanceNetwork
  extends DomainLiteral<DeclaredAwsEc2InstanceNetwork>
  implements DeclaredAwsEc2InstanceNetwork
{
  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    subnet: RefByUnique<typeof DeclaredAwsVpcSubnet>,
    security: DeclaredAwsEc2InstanceNetworkSecurity,
    interface: DeclaredAwsEc2InstanceNetworkInterface,
  };
}
