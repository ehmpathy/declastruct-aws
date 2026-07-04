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

  // extract root volume config
  const rootVolume = input.data.BlockDeviceMappings?.find(
    (bdm) => bdm.DeviceName === '/dev/xvda' || bdm.DeviceName === '/dev/sda1',
  );

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
