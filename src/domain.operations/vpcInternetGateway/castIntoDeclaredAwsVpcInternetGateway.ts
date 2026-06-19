import type { InternetGateway } from '@aws-sdk/client-ec2';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsVpcInternetGateway } from '@src/domain.objects/DeclaredAwsVpcInternetGateway';

/**
 * .what = casts an AWS SDK InternetGateway to a DeclaredAwsVpcInternetGateway
 * .why = maps AWS response shape to domain object
 *
 * @param input - the AWS SDK InternetGateway response
 * @param vpcExid - the exid of the VPC (looked up by caller)
 */
export const castIntoDeclaredAwsVpcInternetGateway = (
  input: InternetGateway,
  vpcExid: string,
): HasReadonly<typeof DeclaredAwsVpcInternetGateway> => {
  // extract exid from tags
  const exidTag = input.Tags?.find((tag) => tag.Key === 'exid');

  // failfast if exid tag is not defined
  if (!exidTag?.Value)
    UnexpectedCodePathError.throw(
      'internet gateway lacks exid tag; cannot cast to domain object',
      { input },
    );

  // failfast if gateway id is not defined
  if (!input.InternetGatewayId)
    UnexpectedCodePathError.throw(
      'internet gateway lacks id; cannot cast to domain object',
      { input },
    );

  // get attached vpc (should be exactly one)
  // note: AWS SDK types define AttachmentStatus as 'attached' | 'attaching' | 'detached' | 'detaching'
  // but internet gateway attachments use 'available' when attached
  const attachment = input.Attachments?.find(
    (a) => (a.State as string) === 'available',
  );

  // failfast if not attached to a vpc
  if (!attachment?.VpcId)
    UnexpectedCodePathError.throw(
      'internet gateway not attached to a vpc; cannot cast to domain object',
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
    DeclaredAwsVpcInternetGateway.as({
      id: input.InternetGatewayId,
      exid: exidTag.Value,
      vpc: { exid: vpcExid },
      tags: tags && Object.keys(tags).length > 0 ? tags : null,
    }),
    hasReadonly({ of: DeclaredAwsVpcInternetGateway }),
  );
};
