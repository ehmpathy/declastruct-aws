import {
  type _InstanceType,
  CreateLaunchTemplateCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';
import type { PickOne } from 'type-fns';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsEc2LaunchTemplate } from '@src/domain.objects/DeclaredAwsEc2LaunchTemplate';

import { getEc2LaunchTemplate } from './getEc2LaunchTemplate';

/**
 * .what = sets an EC2 launch template in AWS
 * .why = enables declarative control of EC2 launch template configuration
 */
export const setEc2LaunchTemplate = async (
  input: PickOne<{
    findsert: DeclaredAwsEc2LaunchTemplate;
    upsert: DeclaredAwsEc2LaunchTemplate;
  }>,
  context: ContextAwsApi & ContextLogTrail,
): Promise<HasReadonly<typeof DeclaredAwsEc2LaunchTemplate>> => {
  // create ec2 client
  const ec2 = new EC2Client({ region: context.aws.credentials.region });

  // get the template to set
  const template = input.findsert ?? input.upsert;
  if (!template)
    UnexpectedCodePathError.throw('either findsert or upsert required', {
      input,
    });

  // check if template already exists
  const templateFound = await getEc2LaunchTemplate(
    { by: { unique: { exid: template.exid } } },
    context,
  );

  // if findsert and found, return extant
  if (input.findsert && templateFound) return templateFound;

  // if upsert and found, launch templates are immutable — must create new version
  // .note = version support can be added later; for now throw to surface the constraint
  if (input.upsert && templateFound)
    return UnexpectedCodePathError.throw(
      'EC2 launch template upsert not supported — templates are immutable; create new version or delete and recreate',
      { template, templateFound },
    );

  // create new template
  const response = await ec2.send(
    new CreateLaunchTemplateCommand({
      LaunchTemplateName: `declastruct-${template.exid}`,
      LaunchTemplateData: {
        InstanceType: template.instanceType as _InstanceType,
        ImageId: template.imageId,
        HibernationOptions: {
          Configured: template.hibernation,
        },
        BlockDeviceMappings: [
          {
            DeviceName: '/dev/xvda',
            Ebs: {
              VolumeSize: template.rootVolumeSize,
              Encrypted: template.rootVolumeEncrypted,
              VolumeType: 'gp3',
              DeleteOnTermination: true,
            },
          },
        ],
        IamInstanceProfile: template.iamInstanceProfile
          ? { Name: template.iamInstanceProfile }
          : undefined,
        UserData: template.userData
          ? Buffer.from(template.userData).toString('base64')
          : undefined,
      },
      TagSpecifications: [
        {
          ResourceType: 'launch-template',
          Tags: [
            { Key: 'exid', Value: template.exid },
            ...(template.tags
              ? Object.entries(template.tags).map(([Key, Value]) => ({
                  Key,
                  Value,
                }))
              : []),
          ],
        },
      ],
    }),
  );

  // return created template
  const templateId = response.LaunchTemplate?.LaunchTemplateId;
  if (!templateId)
    return UnexpectedCodePathError.throw(
      'EC2 CreateLaunchTemplate did not return a template id',
      { response, template },
    );

  // get the created template to return full domain object
  const created = await getEc2LaunchTemplate(
    { by: { primary: { id: templateId } } },
    context,
  );

  if (!created)
    return UnexpectedCodePathError.throw(
      'could not find newly created EC2 launch template',
      { templateId, template },
    );
  return created;
};
