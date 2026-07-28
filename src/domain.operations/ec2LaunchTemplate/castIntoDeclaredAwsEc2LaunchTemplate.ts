import type { ResponseLaunchTemplateData } from '@aws-sdk/client-ec2';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsEc2LaunchTemplate } from '@src/domain.objects/DeclaredAwsEc2LaunchTemplate';

/**
 * .what = casts AWS SDK launch template data to domain object
 * .why = maps AWS response shape to domain object
 */
export const castIntoDeclaredAwsEc2LaunchTemplate = (input: {
  id: string;
  data: ResponseLaunchTemplateData;
  tags?: Array<{ Key?: string; Value?: string }>;
}): HasReadonly<typeof DeclaredAwsEc2LaunchTemplate> => {
  // extract exid from tags
  const exidTag = input.tags?.find((tag) => tag.Key === 'exid');

  // failfast if exid tag is not defined
  if (!exidTag?.Value)
    UnexpectedCodePathError.throw(
      'launch template lacks exid tag; cannot cast to domain object',
      { input },
    );

  // extract the root block device — family-agnostic: prefer a known root device
  // name (amazon-linux /dev/xvda, ubuntu /dev/sda1), else fall back to the sole
  // block device. setEc2LaunchTemplate writes exactly one root block device, so a
  // 3rd AMI family whose root is neither name still reads back correctly instead
  // of a fallback to the AMI defaults (rule.require.immutable-source-of-truth)
  const blockDevices = input.data.BlockDeviceMappings ?? [];
  const rootVolume =
    blockDevices.find(
      (bdm) => bdm.DeviceName === '/dev/xvda' || bdm.DeviceName === '/dev/sda1',
    ) ??
    // the sole-device fallback is safe only when there is at most one block
    // device (all templates setEc2LaunchTemplate writes). if a foreign template
    // has many devices and none match a known root name, the root is ambiguous —
    // fail loud rather than a silent guess (rule.require.immutable-source-of-truth)
    (blockDevices.length <= 1
      ? blockDevices[0]
      : UnexpectedCodePathError.throw(
          'launch template has multiple block devices and none match a known root name; cannot determine root volume unambiguously',
          { input },
        ));

  // cast to domain object and assure metadata is present
  return assure(
    DeclaredAwsEc2LaunchTemplate.as({
      id: input.id,
      exid: exidTag.Value,
      instanceType: input.data.InstanceType ?? '',
      imageId: input.data.ImageId ?? '',
      hibernation: input.data.HibernationOptions?.Configured ?? false,
      rootVolumeSize: rootVolume?.Ebs?.VolumeSize ?? 8,
      rootVolumeEncrypted: rootVolume?.Ebs?.Encrypted ?? false,
      iamInstanceProfile: input.data.IamInstanceProfile?.Name
        ? { name: input.data.IamInstanceProfile.Name }
        : null,
      userData: input.data.UserData
        ? Buffer.from(input.data.UserData, 'base64').toString('utf-8')
        : null,
      tags: (() => {
        // filter to valid tags (except exid) and build object immutably
        const tagEntries = (input.tags ?? [])
          .filter(
            (tag): tag is { Key: string; Value: string } =>
              !!tag.Key && !!tag.Value && tag.Key !== 'exid',
          )
          .map((tag) => [tag.Key, tag.Value] as const);
        // return null if no tags (other than exid)
        if (tagEntries.length === 0) return null;
        return Object.fromEntries(tagEntries);
      })(),
    }),
    hasReadonly({ of: DeclaredAwsEc2LaunchTemplate }),
  );
};
