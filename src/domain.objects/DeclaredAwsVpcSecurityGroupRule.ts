import { DomainLiteral } from 'domain-objects';

import { DeclaredAwsVpcCidrBlock } from './DeclaredAwsVpcCidrBlock';
import { DeclaredAwsVpcSecurityGroupRulePort } from './DeclaredAwsVpcSecurityGroupRulePort';

/**
 * .what = a security group rule (ingress or egress)
 * .why = defines allowed traffic for a security group
 */
export interface DeclaredAwsVpcSecurityGroupRule {
  /**
   * .what = the protocol for the rule
   */
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';

  /**
   * .what = the port range for the rule
   * .note = for protocol 'all', use { from: 0, upto: 0 }
   */
  port: DeclaredAwsVpcSecurityGroupRulePort;

  /**
   * .what = the CIDR blocks this rule applies to
   */
  cidrs: DeclaredAwsVpcCidrBlock[];

  /**
   * .what = optional description for the rule
   */
  description: string | null;
}

export class DeclaredAwsVpcSecurityGroupRule
  extends DomainLiteral<DeclaredAwsVpcSecurityGroupRule>
  implements DeclaredAwsVpcSecurityGroupRule
{
  public static nested = {
    port: DeclaredAwsVpcSecurityGroupRulePort,
    cidrs: DeclaredAwsVpcCidrBlock,
  };
}
