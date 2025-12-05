import {
  EC2Client,
  StartInstancesCommand,
  StopInstancesCommand,
  waitUntilInstanceRunning,
  waitUntilInstanceStopped,
} from '@aws-sdk/client-ec2';
import type { HasReadonly, Ref } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsEc2Instance } from '../../domain.objects/DeclaredAwsEc2Instance';
import { getEc2Instance } from './getEc2Instance';

/**
 * .what = sets an EC2 instance status (running/stopped)
 * .why = enables declarative control of EC2 instance lifecycle
 */
export const setEc2InstanceStatus = async (
  input: {
    by: {
      instance: Ref<typeof DeclaredAwsEc2Instance>;
    };
    to: {
      status: 'running' | 'stopped';
    };
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<HasReadonly<typeof DeclaredAwsEc2Instance>> => {
  // create ec2 client
  const ec2 = new EC2Client({ region: context.aws.credentials.region });

  // resolve the instance
  const instance =
    (await getEc2Instance({ by: { ref: input.by.instance } }, context)) ??
    BadRequestError.throw(
      'cant find instance to set status of. does it exist?',
      {
        input,
      },
    );

  // skip if already in desired status (idempotent)
  if (instance.status === input.to.status) return instance;

  // transition instance to desired status
  await (async () => {
    // start instance if desired status is running
    if (input.to.status === 'running') {
      await ec2.send(new StartInstancesCommand({ InstanceIds: [instance.id] }));
      await waitUntilInstanceRunning(
        { client: ec2, maxWaitTime: 300 },
        { InstanceIds: [instance.id] },
      );
      return;
    }

    // stop instance if desired status is stopped
    if (input.to.status === 'stopped') {
      await ec2.send(new StopInstancesCommand({ InstanceIds: [instance.id] }));
      await waitUntilInstanceStopped(
        { client: ec2, maxWaitTime: 300 },
        { InstanceIds: [instance.id] },
      );
      return;
    }

    // failfast if unsupported status
    UnexpectedCodePathError.throw('unsupported status', { input });
  })();

  // return updated instance
  const updated =
    (await getEc2Instance({ by: { ref: input.by.instance } }, context)) ??
    UnexpectedCodePathError.throw(
      'how can instance not be found after status update?',
      { input, instance: { before: instance } },
    );

  return updated;
};
