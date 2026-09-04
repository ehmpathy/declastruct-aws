import { PutAccountDetailsCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = submits the SES account details + a production-access request (the sandbox exit)
 * .why = raw i/o communicator; the write side of the sandbox-exit resource. AWS does not
 *   flip the flag inline — it opens a REVIEW case, so this returns void and the caller
 *   re-reads GetAccount for the review status
 * .note = a ConflictException means a review is ALREADY in flight; the caller tolerates it
 *   as convergence (the request is submitted — re-submitting is a no-op), so it is NOT
 *   swallowed here (surfaced to the caller to classify) per rule.forbid.failhide
 */
export const putAccountDetails = async (
  input: {
    mailType: 'MARKETING' | 'TRANSACTIONAL';
    websiteUrl: string;
    productionAccessEnabled: boolean;
    contactLanguage: 'EN' | 'JA' | null;
    additionalContactEmails: string[] | null;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create sesv2 client
  const ses = new SESv2Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  await ses.send(
    new PutAccountDetailsCommand({
      MailType: input.mailType,
      WebsiteURL: input.websiteUrl,
      ProductionAccessEnabled: input.productionAccessEnabled,
      ContactLanguage: input.contactLanguage ?? undefined,
      AdditionalContactEmailAddresses:
        input.additionalContactEmails ?? undefined,
    }),
  );
};
