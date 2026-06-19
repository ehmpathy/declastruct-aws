import { DomainLiteral } from 'domain-objects';

/**
 * .what = a CIDR block for VPC resources (VPC, subnet, security group rules)
 * .why = enables declarative specification of IP address ranges
 *
 * .note = at least one of v4 or v6 should be provided; cast operations validate this at runtime
 *
 * .why optional fields = this type represents "either v4 or v6 or both". the type system
 *   cannot express discriminated unions cleanly with DomainLiteral. cast operations and
 *   set operations validate that at least one is present prior to AWS SDK calls.
 */
export interface DeclaredAwsVpcCidrBlock {
  /**
   * .what = IPv4 CIDR block
   * .example = '10.0.0.0/16'
   */
  v4?: string;

  /**
   * .what = IPv6 CIDR block
   * .example = '2001:db8::/32'
   */
  v6?: string;
}

export class DeclaredAwsVpcCidrBlock
  extends DomainLiteral<DeclaredAwsVpcCidrBlock>
  implements DeclaredAwsVpcCidrBlock {}
