import { DescribeInstancesCommand, EC2Client } from '@aws-sdk/client-ec2';
import type { Ref } from 'domain-objects';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';
import {
  DeclaredAwsEc2InstanceSession,
  type DeclaredAwsEc2InstanceSession as DeclaredAwsEc2InstanceSessionType,
} from '@src/domain.objects/DeclaredAwsEc2InstanceSession';
import { getEc2Instance } from '@src/domain.operations/ec2Instance/getEc2Instance';

import { asEc2InstanceSessionStatus } from './asEc2InstanceSessionStatus';

/**
 * .what = gets the current session state for an EC2 instance
 * .why = enables read of instance lifecycle state (active/stopped/hibernated)
 */
export const getEc2InstanceSession = async (
  input: {
    by: {
      instance: Ref<typeof DeclaredAwsEc2Instance>;
    };
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<DeclaredAwsEc2InstanceSessionType | null> => {
  // create ec2 client
  const ec2 = new EC2Client({ region: context.aws.credentials.region });

  // lookup the instance
  const instance = await getEc2Instance(
    { by: { ref: input.by.instance } },
    context,
  );
  if (!instance) return null;

  // query instance details to get StateReason
  const describeResult = await ec2.send(
    new DescribeInstancesCommand({
      InstanceIds: [instance.id],
    }),
  );

  const awsInstance = describeResult.Reservations?.[0]?.Instances?.[0];
  if (!awsInstance) return null;

  // map AWS status to session status
  const status = asEc2InstanceSessionStatus({
    awsStatus: awsInstance.State?.Name,
    stateReasonCode: awsInstance.StateReason?.Code,
  });

  return DeclaredAwsEc2InstanceSession.as({
    instance: input.by.instance,
    status,
  });
};
