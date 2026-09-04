import { GetConfigurationSetCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = reads an SES configuration set (its name + tags)
 * .why = raw i/o communicator; returns null when absent so the plan reads CREATE rather than
 *   throw
 */
export const getConfigurationSet = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<{ tags: Record<string, string> | null } | null> => {
  // create sesv2 client
  const ses = new SESv2Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  try {
    const response = await ses.send(
      new GetConfigurationSetCommand({ ConfigurationSetName: input.name }),
    );

    // fold tags into a plain record (null when absent)
    const tagList = response.Tags ?? [];
    const tags =
      tagList.length > 0
        ? Object.fromEntries(
            tagList.flatMap((tag) =>
              tag.Key != null && tag.Value != null
                ? [[tag.Key, tag.Value]]
                : [],
            ),
          )
        : null;

    return { tags };
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundException')
      return null;
    throw error;
  }
};
