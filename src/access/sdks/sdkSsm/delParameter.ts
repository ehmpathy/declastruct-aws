import {
  DeleteParameterCommand,
  ParameterNotFound,
  SSMClient,
} from '@aws-sdk/client-ssm';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

/**
 * .what = true when the error is the SSM ParameterNotFound service error
 * .why = aws-sdk v3 deserializes service errors such that a single identity signal is
 *   unreliable across bundled/duplicated sdk copies: `instanceof` breaks when a second sdk
 *   copy was bundled, and even `error.name` can be absent on some deserialized shapes. so we
 *   check every stable signal — the class, the name, the constructor name, and the wire
 *   `__type` — and tolerate only when at least one matches. any other error still throws.
 */
const isParameterNotFound = (error: unknown): boolean => {
  if (error instanceof ParameterNotFound) return true;
  if (!(error instanceof Error)) return false;
  if (error.name === 'ParameterNotFound') return true;
  if (error.constructor?.name === 'ParameterNotFound') return true;
  const wireType = (error as { __type?: string }).__type;
  return typeof wireType === 'string' && wireType.includes('ParameterNotFound');
};

/**
 * .what = deletes an SSM parameter by name
 * .why = raw i/o communicator for SSM Parameter Store; idempotent (a no-op if absent)
 * .note = the absent case is matched via isParameterNotFound across all identity signals
 *   rather than a lone `instanceof`, since aws-sdk v3 can bundle a duplicate copy that
 *   breaks the prototype chain — same boundary technique as getBucketPolicy.
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
    if (isParameterNotFound(error)) return;
    throw error;
  }
};
