import { DomainLiteral } from 'domain-objects';

/**
 * .what = port range for a security group rule
 * .why = defines the port range for allowed traffic
 */
export interface DeclaredAwsVpcSecurityGroupRulePort {
  /**
   * .what = the start of the port range
   * .note = for protocol 'all', use 0
   */
  from: number;

  /**
   * .what = the end of the port range
   * .note = for protocol 'all', use 0
   */
  upto: number;
}

export class DeclaredAwsVpcSecurityGroupRulePort
  extends DomainLiteral<DeclaredAwsVpcSecurityGroupRulePort>
  implements DeclaredAwsVpcSecurityGroupRulePort {}
