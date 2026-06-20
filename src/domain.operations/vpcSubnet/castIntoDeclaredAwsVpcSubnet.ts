import type { Subnet } from '@aws-sdk/client-ec2';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsVpcSubnet } from '@src/domain.objects/DeclaredAwsVpcSubnet';

/**
 * .what = casts an AWS SDK Subnet to a DeclaredAwsVpcSubnet
 * .why = maps AWS response shape to domain object
 *
 * @param input - the AWS SDK Subnet response
 * @param vpcExid - the exid of the VPC (resolved by caller)
 */
export const castIntoDeclaredAwsVpcSubnet = (
  input: Subnet,
  vpcExid: string,
): HasReadonly<typeof DeclaredAwsVpcSubnet> => {
  // extract exid from tags
  const exidTag = input.Tags?.find((tag) => tag.Key === 'exid');

  // failfast if exid tag is not defined
  if (!exidTag?.Value)
    UnexpectedCodePathError.throw(
      'subnet lacks exid tag; cannot cast to domain object',
      { input },
    );

  // failfast if subnet id is not defined
  if (!input.SubnetId)
    UnexpectedCodePathError.throw(
      'subnet lacks id; cannot cast to domain object',
      { input },
    );

  // failfast if vpc id is not defined
  if (!input.VpcId)
    UnexpectedCodePathError.throw(
      'subnet lacks vpc id; cannot cast to domain object',
      { input },
    );

  // failfast if cidr block is not defined
  if (!input.CidrBlock)
    UnexpectedCodePathError.throw(
      'subnet lacks cidr block; cannot cast to domain object',
      { input },
    );

  // failfast if availability zone is not defined
  if (!input.AvailabilityZone)
    UnexpectedCodePathError.throw(
      'subnet lacks availability zone; cannot cast to domain object',
      { input },
    );

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
    DeclaredAwsVpcSubnet.as({
      id: input.SubnetId,
      exid: exidTag.Value,
      vpc: { exid: vpcExid },
      cidr: { v4: input.CidrBlock },
      zone: { availability: input.AvailabilityZone },
      tags: tags && Object.keys(tags).length > 0 ? tags : null,
    }),
    hasReadonly({ of: DeclaredAwsVpcSubnet }),
  );
};
