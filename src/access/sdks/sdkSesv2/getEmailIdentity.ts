import { GetEmailIdentityCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = reads an SES email identity's attributes (verification, dkim, mail-from, tags)
 * .why = raw i/o communicator; returns null when the identity is absent so the plan reads
 *   CREATE rather than throw
 */
export const getEmailIdentity = async (
  input: { identity: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<{
  verified: boolean;
  dkimEnabled: boolean;
  dkimStatus: string | null;
  dkimTokens: string[];
  mailFrom: {
    domain: string;
    behaviorOnMxFailure: 'USE_DEFAULT_VALUE' | 'REJECT_MESSAGE';
  } | null;
  tags: Record<string, string> | null;
} | null> => {
  // create sesv2 client
  const ses = new SESv2Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  try {
    const response = await ses.send(
      new GetEmailIdentityCommand({ EmailIdentity: input.identity }),
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

    // fold the custom mail-from attributes (null when unset)
    const mailFromDomain = response.MailFromAttributes?.MailFromDomain;
    const mailFrom = mailFromDomain
      ? {
          domain: mailFromDomain,
          behaviorOnMxFailure:
            response.MailFromAttributes?.BehaviorOnMxFailure ??
            'USE_DEFAULT_VALUE',
        }
      : null;

    return {
      verified: response.VerifiedForSendingStatus ?? false,
      dkimEnabled: response.DkimAttributes?.SigningEnabled ?? false,
      dkimStatus: response.DkimAttributes?.Status ?? null,
      dkimTokens: response.DkimAttributes?.Tokens ?? [],
      mailFrom,
      tags,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundException')
      return null;
    throw error;
  }
};
