import type { Vpc } from '@aws-sdk/client-ec2';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsVpc } from '@src/domain.objects/DeclaredAwsVpc';

/**
 * .what = casts an AWS SDK Vpc to a DeclaredAwsVpc
 * .why = maps AWS response shape to domain object
 *
 * .note = dns attributes must be fetched separately via DescribeVpcAttribute
 */
export const castIntoDeclaredAwsVpc = (input: {
  vpc: Vpc;
  vpcDns: { hostnames: boolean; support: boolean };
}): HasReadonly<typeof DeclaredAwsVpc> => {
  // extract exid from tags
  const exidTag = input.vpc.Tags?.find((tag) => tag.Key === 'exid');

  // failfast if exid tag is not defined
  if (!exidTag?.Value)
    UnexpectedCodePathError.throw(
      'vpc lacks exid tag; cannot cast to domain object',
      { vpc: input.vpc },
    );

  // failfast if vpc id is not defined
  if (!input.vpc.VpcId)
    UnexpectedCodePathError.throw(
      'vpc lacks id; cannot cast to domain object',
      {
        vpc: input.vpc,
      },
    );

  // failfast if cidr block is not defined
  if (!input.vpc.CidrBlock)
    UnexpectedCodePathError.throw(
      'vpc lacks cidr block; cannot cast to domain object',
      { vpc: input.vpc },
    );

  // parse tags (only include if present)
  const tags = input.vpc.Tags?.length
    ? Object.fromEntries(
        input.vpc.Tags.filter(
          (tag) => tag.Key && tag.Value && tag.Key !== 'exid',
        ).map((tag) => [tag.Key!, tag.Value!]),
      )
    : null;

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsVpc.as({
      id: input.vpc.VpcId,
      exid: exidTag.Value,
      cidr: { v4: input.vpc.CidrBlock },
      dns: {
        hostnames: input.vpcDns.hostnames ? 'enabled' : 'disabled',
        support: input.vpcDns.support ? 'enabled' : 'disabled',
      },
      tags: tags && Object.keys(tags).length > 0 ? tags : null,
    }),
    hasReadonly({ of: DeclaredAwsVpc }),
  );
};
