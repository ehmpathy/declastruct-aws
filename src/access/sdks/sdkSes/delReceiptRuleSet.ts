import { DeleteReceiptRuleSetCommand, SESClient } from '@aws-sdk/client-ses';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = deletes an SES receipt rule set (and the rules it holds)
 * .why = raw i/o communicator; idempotent — an absent set is a no-op so a repeat delete
 *   converges. aws forbids a delete of the ACTIVE set, so the caller deactivates first
 */
export const delReceiptRuleSet = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create ses (v1) client
  const ses = new SESClient(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // delete the rule set (idempotent)
  try {
    await ses.send(
      new DeleteReceiptRuleSetCommand({ RuleSetName: input.name }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'RuleSetDoesNotExistException')
      return;
    throw error;
  }
};
