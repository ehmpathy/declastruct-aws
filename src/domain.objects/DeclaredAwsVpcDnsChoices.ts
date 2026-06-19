import { DomainLiteral } from 'domain-objects';

/**
 * .what = DNS configuration for an AWS VPC
 * .why = controls DNS hostname and resolution settings
 */
export interface DeclaredAwsVpcDnsChoices {
  /**
   * .what = whether instances with public IPs get public DNS hostnames
   */
  hostnames: 'enabled' | 'disabled';

  /**
   * .what = whether DNS resolution is supported in the VPC
   */
  support: 'enabled' | 'disabled';
}

export class DeclaredAwsVpcDnsChoices
  extends DomainLiteral<DeclaredAwsVpcDnsChoices>
  implements DeclaredAwsVpcDnsChoices {}
