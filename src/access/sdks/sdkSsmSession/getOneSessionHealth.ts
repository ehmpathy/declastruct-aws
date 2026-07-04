import { GetConnectionStatusCommand, SSMClient } from '@aws-sdk/client-ssm';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

/**
 * .what = retrieves the Session Manager connection status for an EC2 instance
 * .why = raw i/o communicator for SSM Session Manager health check
 */
export const getOneSessionHealth = async (
  input: {
    instanceId: string;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<{
  instanceId: string;
  status: 'connected' | 'notconnected';
}> => {
  // create ssm client
  const ssm = new SSMClient({ region: context.aws.credentials.region });

  // get connection status
  const response = await ssm.send(
    new GetConnectionStatusCommand({
      Target: input.instanceId,
    }),
  );

  // return status
  return {
    instanceId: response.Target ?? input.instanceId,
    status: (response.Status as 'connected' | 'notconnected') ?? 'notconnected',
  };
};
