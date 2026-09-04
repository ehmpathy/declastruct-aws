import {
  SESv2Client,
  UpdateConfigurationSetEventDestinationCommand,
} from '@aws-sdk/client-sesv2';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';
import { asEventDestinationDefinition } from './asEventDestinationDefinition';

/**
 * .what = updates an extant event destination on an SES configuration set
 * .why = raw i/o communicator; the upsert path when the destination already exists — it
 *   converges the extant one to the desired sink + event types
 */
export const updateConfigurationSetEventDestination = async (
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

  // update the event destination in place
  await ses.send(
    new UpdateConfigurationSetEventDestinationCommand({
      ConfigurationSetName: input.configurationSetName,
      EventDestinationName: input.name,
      EventDestination: asEventDestinationDefinition(input),
    }),
  );
};
