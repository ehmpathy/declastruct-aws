import {
  DeleteConfigurationSetEventDestinationCommand,
  SESv2Client,
} from '@aws-sdk/client-sesv2';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = deletes an event destination from an SES configuration set
 * .why = raw i/o communicator; idempotent — a NotFoundException (absent destination or
 *   absent set) is a no-op so a repeat delete converges
 */
export const delConfigurationSetEventDestination = async (
  input: { configurationSetName: string; name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create sesv2 client
  const ses = new SESv2Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // delete the event destination (idempotent)
  try {
    await ses.send(
      new DeleteConfigurationSetEventDestinationCommand({
        ConfigurationSetName: input.configurationSetName,
        EventDestinationName: input.name,
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundException') return;
    throw error;
  }
};
