import {
  DescribeActiveReceiptRuleSetCommand,
  SESClient,
} from '@aws-sdk/client-ses';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = reads the name of the account+region's currently ACTIVE receipt rule set (if any)
 * .why = raw i/o communicator; lets set-active detect a foreign active set and fail loud
 *   instead of a silent steal of the one active slot (rule.forbid.silent-resource-theft)
 */
export const getActiveReceiptRuleSet = async (
  input: Record<string, never>,
  context: ContextAwsApi & ContextLogTrail,
): Promise<{ name: string } | null> => {
  // create ses (v1) client
  const ses = new SESClient(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // read the active rule set (null if none is active)
  const response = await ses.send(new DescribeActiveReceiptRuleSetCommand({}));
  const name = response.Metadata?.Name;
  if (!name) return null;
  return { name };
};
