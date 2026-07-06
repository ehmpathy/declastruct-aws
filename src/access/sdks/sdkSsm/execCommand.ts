import {
  GetCommandInvocationCommand,
  SendCommandCommand,
  SSMClient,
} from '@aws-sdk/client-ssm';
import { sleep } from '@ehmpathy/uni-time';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

/**
 * .what = executes a shell command on an EC2 instance via SSM and polls for result
 * .why = raw i/o communicator for SSM Run Command
 */
export const execCommand = async (
  input: {
    instanceId: string;
    commands: string[];
    timeoutSeconds?: number;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<{
  commandId: string;
  status: 'Success' | 'Failed' | 'TimedOut' | 'Cancelled';
  stdout: string;
  stderr: string;
  exitCode: number;
}> => {
  // create ssm client
  const ssm = new SSMClient({ region: context.aws.credentials.region });

  // send command, retry while the ssm agent registers
  // note: a freshly started/resumed instance is EC2-active before its SSM agent
  //       reports Online, so SendCommand throws InvalidInstanceId for a window;
  //       retry with backoff until the agent settles rather than fail
  const sendResponse = await (async () => {
    const maxSendAttempts = 18; // 18 * 10s = 3 min for the agent to come Online
    const sendBackoffMs = 10_000;
    for (let attempt = 1; attempt <= maxSendAttempts; attempt++) {
      try {
        return await ssm.send(
          new SendCommandCommand({
            InstanceIds: [input.instanceId],
            DocumentName: 'AWS-RunShellScript',
            Parameters: {
              commands: input.commands,
            },
            TimeoutSeconds: input.timeoutSeconds ?? 60,
          }),
        );
      } catch (error) {
        const agentNotReady =
          error instanceof Error &&
          (error.name === 'InvalidInstanceId' ||
            error.message.includes('not in a valid state'));
        if (!agentNotReady || attempt === maxSendAttempts) throw error;
        context.log?.debug?.('ssm agent not ready yet, retry send-command', {
          instanceId: input.instanceId,
          attempt,
        });
        await sleep(sendBackoffMs);
      }
    }
    return UnexpectedCodePathError.throw(
      'ssm send-command retry loop exited without a response',
      { instanceId: input.instanceId },
    );
  })();

  // extract command id
  const commandId = sendResponse.Command?.CommandId;
  if (!commandId)
    UnexpectedCodePathError.throw('SSM SendCommand did not return command id', {
      sendResponse,
    });

  // poll for command completion
  const maxAttempts = 60;
  const pollInterval = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // wait before poll (except first attempt)
    if (attempt > 1) await sleep(pollInterval);

    // get command invocation status
    // note: immediately after SendCommand, GetCommandInvocation can throw
    //       InvocationDoesNotExist until the invocation propagates; treat that
    //       as a transient unresolved state and poll again rather than fail
    const invocationResponse = await (async () => {
      try {
        return await ssm.send(
          new GetCommandInvocationCommand({
            CommandId: commandId,
            InstanceId: input.instanceId,
          }),
        );
      } catch (error) {
        if (error instanceof Error && error.name === 'InvocationDoesNotExist')
          return null;
        throw error;
      }
    })();

    // invocation not yet propagated — poll again
    if (!invocationResponse) continue;

    const status = invocationResponse.Status;

    // continue poll if still in progress
    if (status === 'Pending' || status === 'InProgress') continue;

    // return result for terminal states
    return {
      commandId,
      status: status as 'Success' | 'Failed' | 'TimedOut' | 'Cancelled',
      stdout: invocationResponse.StandardOutputContent ?? '',
      stderr: invocationResponse.StandardErrorContent ?? '',
      exitCode: invocationResponse.ResponseCode ?? -1,
    };
  }

  // timeout after max attempts
  return {
    commandId,
    status: 'TimedOut',
    stdout: '',
    stderr: 'command poll timeout after max attempts',
    exitCode: -1,
  };
};
