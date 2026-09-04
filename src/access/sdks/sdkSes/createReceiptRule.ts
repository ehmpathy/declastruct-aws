import { CreateReceiptRuleCommand, SESClient } from '@aws-sdk/client-ses';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';
import { asReceiptRuleAws } from './asReceiptRuleAws';
import type { ReceiptRuleResolved } from './ReceiptRuleResolved';

/**
 * .what = creates a receipt rule within a rule set
 * .why = raw i/o communicator; idempotent for OUR rule — AlreadyExistsException is a no-op
 *   (the caller looks it up first, so a re-run converges)
 * .note = SES does a live test-put against the s3 bucket at create time, so the bucket + its
 *   policy must already exist (declare the rule AFTER the bucket + policy)
 */
export const createReceiptRule = async (
  input: { ruleSetName: string; rule: ReceiptRuleResolved },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create ses (v1) client
  const ses = new SESClient(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // create the rule
  try {
    await ses.send(
      new CreateReceiptRuleCommand({
        RuleSetName: input.ruleSetName,
        Rule: asReceiptRuleAws(input.rule),
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'AlreadyExistsException')
      return;
    throw error;
  }
};
