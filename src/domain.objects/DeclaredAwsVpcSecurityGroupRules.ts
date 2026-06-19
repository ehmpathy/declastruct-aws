import { DomainLiteral } from 'domain-objects';

import { DeclaredAwsVpcSecurityGroupRule } from './DeclaredAwsVpcSecurityGroupRule';

/**
 * .what = ingress and egress rules for a VPC security group
 * .why = wraps rule arrays for nested hydration
 */
export interface DeclaredAwsVpcSecurityGroupRules {
  /**
   * .what = inbound traffic rules
   */
  ingress: DeclaredAwsVpcSecurityGroupRule[];

  /**
   * .what = outbound traffic rules
   */
  egress: DeclaredAwsVpcSecurityGroupRule[];
}

export class DeclaredAwsVpcSecurityGroupRules
  extends DomainLiteral<DeclaredAwsVpcSecurityGroupRules>
  implements DeclaredAwsVpcSecurityGroupRules
{
  public static nested = {
    ingress: DeclaredAwsVpcSecurityGroupRule,
    egress: DeclaredAwsVpcSecurityGroupRule,
  };
}
