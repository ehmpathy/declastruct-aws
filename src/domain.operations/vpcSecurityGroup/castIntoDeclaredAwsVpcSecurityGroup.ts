import type { IpPermission, SecurityGroup } from '@aws-sdk/client-ec2';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsVpcSecurityGroup } from '@src/domain.objects/DeclaredAwsVpcSecurityGroup';
import type { DeclaredAwsVpcSecurityGroupRule } from '@src/domain.objects/DeclaredAwsVpcSecurityGroupRule';

/**
 * .what = maps AWS IpProtocol to domain protocol
 * .why = AWS uses '-1' for all, we use 'all'
 */
const castProtocol = (
  ipProtocol: string | undefined,
): DeclaredAwsVpcSecurityGroupRule['protocol'] => {
  if (!ipProtocol || ipProtocol === '-1') return 'all';
  if (ipProtocol === 'tcp') return 'tcp';
  if (ipProtocol === 'udp') return 'udp';
  if (ipProtocol === 'icmp') return 'icmp';

  // failfast on unknown protocol
  return UnexpectedCodePathError.throw(
    'unknown protocol in security group rule',
    {
      ipProtocol,
    },
  );
};

/**
 * .what = normalizes port values for protocol 'all'
 * .why = AWS uses -1 for all ports, we use 0
 */
const normalizePort = (port: number | undefined): number => {
  if (port === undefined || port === -1) return 0;
  return port;
};

/**
 * .what = casts AWS IpPermission to domain rule
 * .why = maps AWS response shape to domain object
 */
const castRule = (
  permission: IpPermission,
): DeclaredAwsVpcSecurityGroupRule => {
  const protocol = castProtocol(permission.IpProtocol);

  // extract CIDR blocks
  const cidrs = [
    ...(permission.IpRanges?.map((range) => ({ v4: range.CidrIp! })) ?? []),
    ...(permission.Ipv6Ranges?.map((range) => ({ v6: range.CidrIpv6! })) ?? []),
  ];

  // use description from first range (AWS stores per-range, we store per-rule)
  const description =
    permission.IpRanges?.[0]?.Description ??
    permission.Ipv6Ranges?.[0]?.Description ??
    null;

  return {
    protocol,
    port: {
      from: normalizePort(permission.FromPort),
      upto: normalizePort(permission.ToPort),
    },
    cidrs,
    description,
  };
};

/**
 * .what = casts an AWS SDK SecurityGroup to a DeclaredAwsVpcSecurityGroup
 * .why = maps AWS response shape to domain object
 *
 * @param input - the AWS SDK SecurityGroup response
 * @param vpcExid - the exid of the VPC (looked up by caller)
 */
export const castIntoDeclaredAwsVpcSecurityGroup = (
  input: SecurityGroup,
  vpcExid: string,
): HasReadonly<typeof DeclaredAwsVpcSecurityGroup> => {
  // extract exid from tags
  const exidTag = input.Tags?.find((tag) => tag.Key === 'exid');

  // failfast if exid tag is not defined
  if (!exidTag?.Value)
    UnexpectedCodePathError.throw(
      'security group lacks exid tag; cannot cast to domain object',
      { input },
    );

  // failfast if group id is not defined
  if (!input.GroupId)
    UnexpectedCodePathError.throw(
      'security group lacks id; cannot cast to domain object',
      { input },
    );

  // failfast if vpc id is not defined
  if (!input.VpcId)
    UnexpectedCodePathError.throw(
      'security group lacks vpc id; cannot cast to domain object',
      { input },
    );

  // failfast if group name is not defined
  if (!input.GroupName)
    UnexpectedCodePathError.throw(
      'security group lacks name; cannot cast to domain object',
      { input },
    );

  // cast rules
  const ingress = (input.IpPermissions ?? []).map(castRule);
  const egress = (input.IpPermissionsEgress ?? []).map(castRule);

  // parse tags (only include if present)
  const tags = input.Tags?.length
    ? Object.fromEntries(
        input.Tags.filter(
          (tag) => tag.Key && tag.Value && tag.Key !== 'exid',
        ).map((tag) => [tag.Key!, tag.Value!]),
      )
    : null;

  // cast and assure metadata fields are present
  return assure(
    DeclaredAwsVpcSecurityGroup.as({
      id: input.GroupId,
      exid: exidTag.Value,
      vpc: { exid: vpcExid },
      name: input.GroupName,
      description: input.Description ?? '',
      rules: { ingress, egress },
      tags: tags && Object.keys(tags).length > 0 ? tags : null,
    }),
    hasReadonly({ of: DeclaredAwsVpcSecurityGroup }),
  );
};
