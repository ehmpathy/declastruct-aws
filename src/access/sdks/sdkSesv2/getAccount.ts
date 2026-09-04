import { GetAccountCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = reads the SES account-level attributes (production-access flag, enforcement
 *   posture, and the latest production-access review status)
 * .why = raw i/o communicator; the read side of the sandbox-exit resource. GetAccount always
 *   succeeds for a valid caller (the account always exists), so this never returns null —
 *   the sandbox is expressed as `productionAccessEnabled: false`, not an absent account
 */
export const getAccount = async (
  _input: Record<string, never>,
  context: ContextAwsApi & ContextLogTrail,
): Promise<{
  productionAccessEnabled: boolean;
  enforcementStatus: string | null;
  reviewStatus: string | null;
  mailType: string | null;
  websiteUrl: string | null;
  contactLanguage: string | null;
  additionalContactEmails: string[] | null;
}> => {
  // create sesv2 client
  const ses = new SESv2Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  const response = await ses.send(new GetAccountCommand({}));

  const details = response.Details ?? {};
  const additional = details.AdditionalContactEmailAddresses ?? [];

  return {
    productionAccessEnabled: response.ProductionAccessEnabled ?? false,
    enforcementStatus: response.EnforcementStatus ?? null,
    reviewStatus: details.ReviewDetails?.Status ?? null,
    mailType: details.MailType ?? null,
    websiteUrl: details.WebsiteURL ?? null,
    contactLanguage: details.ContactLanguage ?? null,
    additionalContactEmails: additional.length > 0 ? additional : null,
  };
};
