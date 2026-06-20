import type { IpPermission } from '@aws-sdk/client-ec2';

import type { DeclaredAwsVpcSecurityGroupRule } from '@src/domain.objects/DeclaredAwsVpcSecurityGroupRule';

/**
 * .what = converts a domain security group rule to AWS IpPermission format
 * .why = transforms domain shape to AWS SDK shape for authorize/revoke commands
 */
export const asAwsIpPermission = (
  rule: DeclaredAwsVpcSecurityGroupRule,
): IpPermission => ({
  IpProtocol: rule.protocol === 'all' ? '-1' : rule.protocol,
  FromPort: rule.port.from,
  ToPort: rule.port.upto,
  IpRanges: rule.cidrs
    .filter((c) => c.v4)
    .map((c) => ({
      CidrIp: c.v4,
      Description: rule.description ?? undefined,
    })),
  Ipv6Ranges: rule.cidrs
    .filter((c) => c.v6)
    .map((c) => ({
      CidrIpv6: c.v6,
      Description: rule.description ?? undefined,
    })),
});
