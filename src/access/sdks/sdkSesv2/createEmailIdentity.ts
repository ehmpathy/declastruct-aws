import { CreateEmailIdentityCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = begins verification of an SES identity (a domain or an email address)
 * .why = raw i/o communicator; a domain value auto-enables easy-dkim (aws generates the 3
 *   tokens); tags are applied at create. idempotent for OUR identity — AlreadyExistsException
 *   is a no-op (the caller looks the identity up first, so a re-run converges)
 */
export const createEmailIdentity = async (
  input: { identity: string; tags: Record<string, string> },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create sesv2 client
  const ses = new SESv2Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // begin verification
  try {
    await ses.send(
      new CreateEmailIdentityCommand({
        EmailIdentity: input.identity,
        Tags: Object.entries(input.tags).map(([Key, Value]) => ({
          Key,
          Value,
        })),
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'AlreadyExistsException')
      return;
    throw error;
  }
};
