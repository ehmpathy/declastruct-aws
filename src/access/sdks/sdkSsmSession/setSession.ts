import { SSMClient, StartSessionCommand } from '@aws-sdk/client-ssm';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

/**
 * .what = starts an SSM session with an EC2 instance
 * .why = raw i/o communicator for SSM Session Manager
 * .note = returns session details for WebSocket connection
 */
export const setSession = async (
  input: {
    instanceId: string;
    documentName?: string;
    parameters?: Record<string, string[]>;
    reason?: string;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<{
  sessionId: string;
  tokenValue: string;
  streamUrl: string;
}> => {
  // create ssm client
  const ssm = new SSMClient({ region: context.aws.credentials.region });

  // start session
  const response = await ssm.send(
    new StartSessionCommand({
      Target: input.instanceId,
      DocumentName: input.documentName,
      Parameters: input.parameters,
      Reason: input.reason,
    }),
  );

  // return session details
  return {
    sessionId: response.SessionId ?? '',
    tokenValue: response.TokenValue ?? '',
    streamUrl: response.StreamUrl ?? '',
  };
};
