import { DeleteReceiptRuleCommand, SESClient } from '@aws-sdk/client-ses';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = deletes a receipt rule from a rule set
 * .why = raw i/o communicator; idempotent — an absent rule or set is a no-op so a repeat
 *   delete converges
 */
export const delReceiptRule = async (
  input: { ruleSetName: string; ruleName: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create ses (v1) client
  const ses = new SESClient(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // delete the rule (idempotent)
  try {
    await ses.send(
      new DeleteReceiptRuleCommand({
        RuleSetName: input.ruleSetName,
        RuleName: input.ruleName,
      }),
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === 'RuleDoesNotExistException' ||
        error.name === 'RuleSetDoesNotExistException')
    )
      return;
    throw error;
  }
};
