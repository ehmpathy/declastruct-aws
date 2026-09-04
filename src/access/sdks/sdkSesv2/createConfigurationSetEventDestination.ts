import {
  CreateConfigurationSetEventDestinationCommand,
  SESv2Client,
} from '@aws-sdk/client-sesv2';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';
import { asEventDestinationDefinition } from './asEventDestinationDefinition';

/**
 * .what = creates an event destination on an SES configuration set
 * .why = raw i/o communicator; idempotent for OUR destination — AlreadyExistsException is a
 *   no-op (the caller looks it up first, so a re-run converges)
 */
export const createConfigurationSetEventDestination = async (
  input: {
    configurationSetName: string;
    name: string;
    enabled: boolean;
    eventTypes: string[];
    cloudwatch: Array<{
      name: string;
      source: string;
      defaultValue: string;
    }> | null;
    snsTopicArn: string | null;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create sesv2 client
  const ses = new SESv2Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // create the event destination
  try {
    await ses.send(
      new CreateConfigurationSetEventDestinationCommand({
        ConfigurationSetName: input.configurationSetName,
        EventDestinationName: input.name,
        EventDestination: asEventDestinationDefinition(input),
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'AlreadyExistsException')
      return;
    throw error;
  }
};
