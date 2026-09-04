import {
  PutEmailIdentityMailFromAttributesCommand,
  SESv2Client,
} from '@aws-sdk/client-sesv2';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = sets (or clears) the custom MAIL FROM domain for an SES email identity
 * .why = raw i/o communicator; a null domain clears the custom MAIL FROM (SES falls back to
 *   amazonses.com), so a declared null converges the identity to no custom MAIL FROM
 */
export const putEmailIdentityMailFrom = async (
  input: {
    identity: string;
    mailFrom: {
      domain: string;
      behaviorOnMxFailure: 'USE_DEFAULT_VALUE' | 'REJECT_MESSAGE';
    } | null;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create sesv2 client
  const ses = new SESv2Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // converge the mail-from config (an absent domain clears it)
  await ses.send(
    new PutEmailIdentityMailFromAttributesCommand({
      EmailIdentity: input.identity,
      MailFromDomain: input.mailFrom?.domain,
      BehaviorOnMxFailure: input.mailFrom?.behaviorOnMxFailure,
    }),
  );
};
