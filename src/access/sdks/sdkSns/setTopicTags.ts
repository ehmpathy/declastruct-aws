import { SNSClient, TagResourceCommand } from '@aws-sdk/client-sns';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = adds/overwrites tags on an SNS topic
 * .why = raw i/o communicator for SNS; TagResource upserts the given keys (it does not
 *   drop absent keys — removal is delTopicTags's job)
 */
export const setTopicTags = async (
  input: { arn: string; tags: Record<string, string> },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // no-op on an empty desired set
  const entries = Object.entries(input.tags);
  if (entries.length === 0) return;

  // create sns client
  const sns = new SNSClient(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // add/overwrite the desired tags
  await sns.send(
    new TagResourceCommand({
      ResourceArn: input.arn,
      Tags: entries.map(([Key, Value]) => ({ Key, Value })),
    }),
  );
};
