import { DeleteLaunchTemplateCommand, EC2Client } from '@aws-sdk/client-ec2';
import type { RefByPrimary, RefByUnique } from 'domain-objects';
import type { ContextLogTrail } from 'simple-log-methods';
import type { PickOne } from 'type-fns';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsEc2LaunchTemplate } from '@src/domain.objects/DeclaredAwsEc2LaunchTemplate';

import { getEc2LaunchTemplate } from './getEc2LaunchTemplate';

/**
 * .what = deletes an EC2 launch template
 * .why = enables declarative removal of EC2 launch templates
 * .note = idempotent — returns successfully if template does not exist
 */
export const delEc2LaunchTemplate = async (
  input: {
    by: PickOne<{
      primary: RefByPrimary<typeof DeclaredAwsEc2LaunchTemplate>;
      unique: RefByUnique<typeof DeclaredAwsEc2LaunchTemplate>;
    }>;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // lookup the template
  const template = await getEc2LaunchTemplate(
    {
      by: input.by.primary
        ? { primary: input.by.primary }
        : { unique: input.by.unique! },
    },
    context,
  );

  // idempotent — if not found, already deleted
  if (!template) return;

  // delete the template
  const ec2 = new EC2Client({ region: context.aws.credentials.region });
  await ec2.send(
    new DeleteLaunchTemplateCommand({
      LaunchTemplateId: template.id,
    }),
  );
};
