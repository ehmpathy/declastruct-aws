import { DeleteEmailIdentityCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = deletes an SES email identity by its value
 * .why = raw i/o communicator; idempotent — an absent identity (NotFoundException) is a no-op
 */
export const delEmailIdentity = async (
  input: { identity: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create sesv2 client
  const ses = new SESv2Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // delete the identity; an absent identity is already in the desired state
  try {
    await ses.send(
      new DeleteEmailIdentityCommand({ EmailIdentity: input.identity }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundException') return;
    throw error;
  }
};
