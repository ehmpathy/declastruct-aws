import {
  PutEmailIdentityDkimAttributesCommand,
  SESv2Client,
} from '@aws-sdk/client-sesv2';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = turns easy-dkim on or off for an SES email identity
 * .why = raw i/o communicator; converges the identity's dkim state to the declared value
 */
export const putEmailIdentityDkim = async (
  input: { identity: string; enabled: boolean },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create sesv2 client
  const ses = new SESv2Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // converge the dkim state
  await ses.send(
    new PutEmailIdentityDkimAttributesCommand({
      EmailIdentity: input.identity,
      SigningEnabled: input.enabled,
    }),
  );
};
