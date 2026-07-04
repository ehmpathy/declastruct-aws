import {
  EC2Client,
  StartInstancesCommand,
  StopInstancesCommand,
  waitUntilInstanceRunning,
  waitUntilInstanceStopped,
} from '@aws-sdk/client-ec2';
import type { Ref } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';
import type { DeclaredAwsEc2InstanceSession } from '@src/domain.objects/DeclaredAwsEc2InstanceSession';
import { getEc2Instance } from '@src/domain.operations/ec2Instance/getEc2Instance';

import { getEc2InstanceSession } from './getEc2InstanceSession';

/**
 * .what = sets an EC2 instance session (lifecycle state)
 * .why = enables declarative control of EC2 instance lifecycle (active/stopped/hibernated)
 */
export const setEc2InstanceSession = async (
  input: {
    session: DeclaredAwsEc2InstanceSession;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<DeclaredAwsEc2InstanceSession> => {
  // create ec2 client
  const ec2 = new EC2Client({ region: context.aws.credentials.region });

  // lookup the instance
  const instance =
    (await getEc2Instance(
      {
        by: {
          ref: input.session.instance as Ref<typeof DeclaredAwsEc2Instance>,
        },
      },
      context,
    )) ??
    BadRequestError.throw('cant find instance for session. does it exist?', {
      input,
    });

  // get current session state
  const sessionCurrent = await getEc2InstanceSession(
    {
      by: {
        instance: input.session.instance as Ref<typeof DeclaredAwsEc2Instance>,
      },
    },
    context,
  );

  // skip if already in desired status (idempotent)
  if (sessionCurrent?.status === input.session.status) return input.session;

  // transition instance to desired status
  await (async () => {
    // start instance if desired status is active
    if (input.session.status === 'active') {
      await ec2.send(new StartInstancesCommand({ InstanceIds: [instance.id] }));
      await waitUntilInstanceRunning(
        { client: ec2, maxWaitTime: 300 },
        { InstanceIds: [instance.id] },
      );
      return;
    }

    // stop instance if desired status is stopped
    if (input.session.status === 'stopped') {
      await ec2.send(
        new StopInstancesCommand({
          InstanceIds: [instance.id],
          Hibernate: false,
        }),
      );
      await waitUntilInstanceStopped(
        { client: ec2, maxWaitTime: 300 },
        { InstanceIds: [instance.id] },
      );
      return;
    }

    // hibernate instance if desired status is hibernated
    if (input.session.status === 'hibernated') {
      // note: a freshly booted instance reports "not ready to hibernate yet"
      //       until its hibernation agent signals readiness; retry with backoff
      const maxAttempts = 20;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await ec2.send(
            new StopInstancesCommand({
              InstanceIds: [instance.id],
              Hibernate: true,
            }),
          );
          break;
        } catch (error) {
          const notReady =
            error instanceof Error &&
            error.message.includes('not ready to hibernate yet');
          if (!notReady || attempt === maxAttempts) throw error;
          context.log.info('instance not ready to hibernate yet, retry', {
            instanceId: instance.id,
            attempt,
          });
          await new Promise((done) => setTimeout(done, 15_000));
        }
      }
      await waitUntilInstanceStopped(
        { client: ec2, maxWaitTime: 300 },
        { InstanceIds: [instance.id] },
      );
      return;
    }

    // failfast if unsupported status
    UnexpectedCodePathError.throw('unsupported session status', { input });
  })();

  // return the session as declared
  return input.session;
};
