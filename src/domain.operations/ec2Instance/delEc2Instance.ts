import { EC2Client, TerminateInstancesCommand } from '@aws-sdk/client-ec2';
import type { RefByPrimary, RefByUnique } from 'domain-objects';
import type { ContextLogTrail } from 'simple-log-methods';
import type { PickOne } from 'type-fns';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';

import { getEc2Instance } from './getEc2Instance';

/**
 * .what = terminates an EC2 instance
 * .why = enables declarative removal of EC2 instances
 * .note = idempotent — returns successfully if instance does not exist
 */
export const delEc2Instance = async (
  input: {
    by: PickOne<{
      primary: RefByPrimary<typeof DeclaredAwsEc2Instance>;
      unique: RefByUnique<typeof DeclaredAwsEc2Instance>;
    }>;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // lookup the instance
  const instance = await getEc2Instance(
    {
      by: input.by.primary
        ? { primary: input.by.primary }
        : { unique: input.by.unique! },
    },
    context,
  );

  // idempotent — if not found, already deleted
  if (!instance) return;

  // terminate the instance
  const ec2 = new EC2Client({ region: context.aws.credentials.region });
  await ec2.send(
    new TerminateInstancesCommand({
      InstanceIds: [instance.id],
    }),
  );
};
