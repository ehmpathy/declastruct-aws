import { DomainLiteral } from 'domain-objects';

/**
 * .what = availability zone configuration for an AWS VPC subnet
 * .why = specifies which AZ the subnet resides in
 */
export interface DeclaredAwsVpcSubnetZone {
  /**
   * .what = the availability zone name
   * .example = 'us-east-1a'
   */
  availability: string;
}

export class DeclaredAwsVpcSubnetZone
  extends DomainLiteral<DeclaredAwsVpcSubnetZone>
  implements DeclaredAwsVpcSubnetZone {}
