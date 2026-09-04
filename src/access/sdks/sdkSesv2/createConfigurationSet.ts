import {
  CreateConfigurationSetCommand,
  SESv2Client,
} from '@aws-sdk/client-sesv2';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = creates an SES configuration set, with tags applied at create
 * .why = raw i/o communicator; idempotent for OUR set — AlreadyExistsException is a no-op (the
 *   caller looks the set up first, so a re-run converges)
 */
export const createConfigurationSet = async (
  input: { name: string; tags: Record<string, string> },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create sesv2 client
  const ses = new SESv2Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // create the configuration set
  try {
    await ses.send(
      new CreateConfigurationSetCommand({
        ConfigurationSetName: input.name,
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
