import { CreateReceiptRuleSetCommand, SESClient } from '@aws-sdk/client-ses';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = creates an empty SES receipt rule set
 * .why = raw i/o communicator; idempotent for OUR set — AlreadyExistsException is a no-op (the
 *   caller looks the set up first, so a re-run converges)
 */
export const createReceiptRuleSet = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create ses (v1) client
  const ses = new SESClient(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // create the rule set
  try {
    await ses.send(
      new CreateReceiptRuleSetCommand({ RuleSetName: input.name }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'AlreadyExistsException')
      return;
    throw error;
  }
};
