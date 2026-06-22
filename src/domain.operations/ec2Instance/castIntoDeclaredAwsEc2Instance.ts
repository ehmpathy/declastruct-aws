import type { Instance } from '@aws-sdk/client-ec2';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';

/**
 * .what = casts an AWS SDK Instance to a DeclaredAwsEc2Instance
 * .why = maps AWS response shape to domain object
 *
 * @param input.instance - the AWS SDK Instance response
 * @param input.subnetExid - the exid of the subnet (resolved by caller)
 * @param input.securityGroupExids - the exids of the security groups (resolved by caller)
 * @param input.templateExid - the exid of the launch template (resolved by caller, null if none)
 */
export const castIntoDeclaredAwsEc2Instance = (input: {
  instance: Instance;
  subnetExid: string;
  securityGroupExids: string[];
  templateExid: string | null;
}): HasReadonly<typeof DeclaredAwsEc2Instance> => {
  // extract exid from tags
  const exidTag = input.instance.Tags?.find((tag) => tag.Key === 'exid');

  // failfast if exid tag is not defined
  if (!exidTag?.Value)
    UnexpectedCodePathError.throw(
      'ec2 instance lacks exid tag; cannot cast to domain object',
      { input },
    );

  // extract tags (exclude system tags and internal metadata tags)
  const tags = (input.instance.Tags ?? [])
    .filter(
      (tag) =>
        tag.Key &&
        !tag.Key.startsWith('aws:') &&
        tag.Key !== 'exid' &&
        tag.Key !== 'templateExid',
    )
    .reduce(
      (acc, tag) => {
        if (tag.Key && tag.Value) acc[tag.Key] = tag.Value;
        return acc;
      },
      {} as Record<string, string>,
    );

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsEc2Instance.as({
      id: input.instance.InstanceId,
      exid: exidTag.Value,
      template: input.templateExid ? { exid: input.templateExid } : null,
      subnet: { exid: input.subnetExid },
      securityGroups: input.securityGroupExids.map((exid) => ({ exid })),
      tags: Object.keys(tags).length > 0 ? tags : null,
      privateIp: input.instance.PrivateIpAddress,
    }),
    hasReadonly({ of: DeclaredAwsEc2Instance }),
  );
};
