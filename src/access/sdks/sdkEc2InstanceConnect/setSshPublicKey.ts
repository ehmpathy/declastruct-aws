import {
  EC2InstanceConnectClient,
  SendSSHPublicKeyCommand,
} from '@aws-sdk/client-ec2-instance-connect';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

/**
 * .what = pushes an SSH public key to an EC2 instance for temporary authorization
 * .why = raw i/o communicator for EC2 Instance Connect
 * .note = key remains valid for 60 seconds
 */
export const setSshPublicKey = async (
  input: {
    instanceId: string;
    instanceOsUser: string;
    sshPublicKey: string;
    availabilityZone?: string;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<{
  requestId: string;
  success: boolean;
}> => {
  // create ec2 instance connect client
  const client = new EC2InstanceConnectClient({
    region: context.aws.credentials.region,
  });

  // send ssh public key
  const response = await client.send(
    new SendSSHPublicKeyCommand({
      InstanceId: input.instanceId,
      InstanceOSUser: input.instanceOsUser,
      SSHPublicKey: input.sshPublicKey,
      AvailabilityZone: input.availabilityZone,
    }),
  );

  // return result
  return {
    requestId: response.RequestId ?? '',
    success: response.Success ?? false,
  };
};
