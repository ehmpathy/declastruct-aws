import {
  GetConfigurationSetEventDestinationsCommand,
  SESv2Client,
} from '@aws-sdk/client-sesv2';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = reads all event destinations on an SES configuration set, as a friendly shape
 * .why = raw i/o communicator; the caller finds one by name to drift-check it. returns null
 *   when the configuration set itself is absent (so the plan reads CREATE, not throw)
 */
export const getConfigurationSetEventDestinations = async (
  input: { configurationSetName: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<Array<{
  name: string;
  enabled: boolean;
  eventTypes: string[];
  cloudwatch: Array<{
    name: string;
    source: string;
    defaultValue: string;
  }> | null;
  snsTopicArn: string | null;
}> | null> => {
  // create sesv2 client
  const ses = new SESv2Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // read the event destinations (null if the configuration set is absent)
  try {
    const response = await ses.send(
      new GetConfigurationSetEventDestinationsCommand({
        ConfigurationSetName: input.configurationSetName,
      }),
    );

    // map each destination to a friendly shape
    return (response.EventDestinations ?? []).map((destination) => ({
      name: destination.Name ?? '',
      enabled: destination.Enabled ?? false,
      eventTypes: destination.MatchingEventTypes ?? [],
      cloudwatch: destination.CloudWatchDestination
        ? (destination.CloudWatchDestination.DimensionConfigurations ?? []).map(
            (dimension) => ({
              name: dimension.DimensionName ?? '',
              source: dimension.DimensionValueSource ?? '',
              defaultValue: dimension.DefaultDimensionValue ?? '',
            }),
          )
        : null,
      snsTopicArn: destination.SnsDestination?.TopicArn ?? null,
    }));
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundException')
      return null;
    throw error;
  }
};
