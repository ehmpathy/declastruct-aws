import { BadRequestError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import { sdkSsm } from '@src/access/sdks/sdkSsm';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { getEc2Instance } from '@src/domain.operations/ec2Instance/getEc2Instance';

/**
 * .what = executes a shell command on an EC2 instance via SSM
 * .why = enables SSH-less command execution on instances with SSM agent
 * .note
 *   - requires instance to have SSM agent installed and active
 *   - requires ssm:SendCommand and ssm:GetCommandInvocation permissions
 *   - polls for command completion (default 60s timeout)
 */
export const execSsmCommand = async (
  input: {
    instance:
      | { id: string }
      | { exid: string }
      | { id?: string; exid?: string };
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
  // extract id or exid from input
  const hasId = 'id' in input.instance && input.instance.id;
  const hasExid = 'exid' in input.instance && input.instance.exid;

  // failfast if instance ref lacks id or exid
  if (!hasId && !hasExid)
    BadRequestError.throw('instance ref must have id or exid', {
      instance: input.instance,
    });

  // return id directly if provided
  if (hasId) {
    const instanceId = (input.instance as { id: string }).id;
    return sdkSsm.execCommand(
      {
        instanceId,
        commands: input.commands,
        timeoutSeconds: input.timeoutSeconds,
      },
      context,
    );
  }

  // lookup instance by exid
  const exid = (input.instance as { exid: string }).exid;
  const instance = await getEc2Instance({ by: { unique: { exid } } }, context);
  if (!instance) BadRequestError.throw('instance not found by exid', { exid });
  const instanceId = instance.id;

  // execute command via SSM
  return sdkSsm.execCommand(
    {
      instanceId,
      commands: input.commands,
      timeoutSeconds: input.timeoutSeconds,
    },
    context,
  );
};
