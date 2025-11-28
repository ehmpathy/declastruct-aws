import type { Instance } from '@aws-sdk/client-ec2';
import { HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsEc2Instance } from '../../domain.objects/DeclaredAwsEc2Instance';

/**
 * .what = casts an AWS SDK Instance to a DeclaredAwsEc2Instance
 * .why = maps AWS response shape to domain object
 */
export const castToDeclaredAwsEc2Instance = (
  input: Instance,
): HasReadonly<typeof DeclaredAwsEc2Instance> => {
  // extract exid from tags
  const exidTag = input.Tags?.find((tag) => tag.Key === 'exid');

  // failfast if exid tag is not defined
  if (!exidTag?.Value)
    UnexpectedCodePathError.throw(
      'ec2 instance lacks exid tag; cannot cast to domain object',
      { input },
    );

  // map status to domain status type
  const status = input.State?.Name as DeclaredAwsEc2Instance['status'];

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsEc2Instance.as({
      id: input.InstanceId,
      exid: exidTag.Value,
      status,
      privateIp: input.PrivateIpAddress,
    }),
    hasReadonly({ of: DeclaredAwsEc2Instance }),
  );
};
