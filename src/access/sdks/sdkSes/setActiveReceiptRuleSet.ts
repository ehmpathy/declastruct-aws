import { SESClient, SetActiveReceiptRuleSetCommand } from '@aws-sdk/client-ses';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = makes a receipt rule set the account+region's active one (null deactivates all)
 * .why = raw i/o communicator; the ordered caller guards against a foreign active set before
 *   it calls this, so the set-active never steals another owner's slot
 */
export const setActiveReceiptRuleSet = async (
  input: { name: string | null },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create ses (v1) client
  const ses = new SESClient(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // set (or clear, when null) the active rule set
  await ses.send(
    new SetActiveReceiptRuleSetCommand({
      RuleSetName: input.name ?? undefined,
    }),
  );
};
