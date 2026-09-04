import { SESClient, UpdateReceiptRuleCommand } from '@aws-sdk/client-ses';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';
import { asReceiptRuleAws } from './asReceiptRuleAws';
import type { ReceiptRuleResolved } from './ReceiptRuleResolved';

/**
 * .what = updates an extant receipt rule in place within a rule set
 * .why = raw i/o communicator; the upsert path — it converges the extant rule to the desired
 *   recipients + actions without a delete/recreate
 */
export const updateReceiptRule = async (
  input: { ruleSetName: string; rule: ReceiptRuleResolved },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create ses (v1) client
  const ses = new SESClient(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // update the rule in place
  await ses.send(
    new UpdateReceiptRuleCommand({
      RuleSetName: input.ruleSetName,
      Rule: asReceiptRuleAws(input.rule),
    }),
  );
};
