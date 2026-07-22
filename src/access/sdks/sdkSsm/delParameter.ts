import {
  DeleteParameterCommand,
  ParameterNotFound,
  SSMClient,
} from '@aws-sdk/client-ssm';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

/**
 * .what = deletes an SSM parameter by name
 * .why = raw i/o communicator for SSM Parameter Store; idempotent (a no-op if absent)
 */
export const delParameter = async (
  input: {
    name: string;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create ssm client
  const ssm = new SSMClient({ region: context.aws.credentials.region });

  // delete parameter; tolerate absent (idempotent delete)
  try {
    await ssm.send(new DeleteParameterCommand({ Name: input.name }));
  } catch (error) {
    if (error instanceof ParameterNotFound) return;
    throw error;
  }
};
