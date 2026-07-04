import { DomainLiteral, type Ref, RefByUnique } from 'domain-objects';

import type { DeclaredAwsVpcSecurityGroup } from './DeclaredAwsVpcSecurityGroup';

/**
 * .what = the network security config of an ec2 instance
 * .why = groups the firewall (security group) refs under one network.security bucket
 * .note = leaves room for related members (e.g., nacls) without a rename
 */
export interface DeclaredAwsEc2InstanceNetworkSecurity {
  /**
   * .what = references to the security groups applied to the instance
   * .note = ref by id or exid
   */
  groups: Ref<typeof DeclaredAwsVpcSecurityGroup>[];
}

export class DeclaredAwsEc2InstanceNetworkSecurity
  extends DomainLiteral<DeclaredAwsEc2InstanceNetworkSecurity>
  implements DeclaredAwsEc2InstanceNetworkSecurity
{
  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    groups: [RefByUnique<typeof DeclaredAwsVpcSecurityGroup>],
  };
}
