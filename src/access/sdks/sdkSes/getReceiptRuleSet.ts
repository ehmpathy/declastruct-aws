import { DescribeReceiptRuleSetCommand, SESClient } from '@aws-sdk/client-ses';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = reads whether an SES receipt rule set exists (by name)
 * .why = raw i/o communicator; returns the name when present, null when absent so the plan
 *   reads CREATE rather than throw
 */
export const getReceiptRuleSet = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<{ name: string } | null> => {
  // create ses (v1) client
  const ses = new SESClient(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // read the rule set (null if absent)
  try {
    const response = await ses.send(
      new DescribeReceiptRuleSetCommand({ RuleSetName: input.name }),
    );
    const name = response.Metadata?.Name ?? input.name;
    return { name };
  } catch (error) {
    if (error instanceof Error && error.name === 'RuleSetDoesNotExistException')
      return null;
    throw error;
  }
};
