import {
  DeleteConfigurationSetCommand,
  SESv2Client,
} from '@aws-sdk/client-sesv2';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = deletes an SES configuration set by name
 * .why = raw i/o communicator; idempotent — an absent set (NotFoundException) is a no-op
 */
export const delConfigurationSet = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create sesv2 client
  const ses = new SESv2Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // delete the set; an absent set is already in the desired state
  try {
    await ses.send(
      new DeleteConfigurationSetCommand({ ConfigurationSetName: input.name }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundException') return;
    throw error;
  }
};
