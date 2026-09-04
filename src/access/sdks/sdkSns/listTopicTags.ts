import { ListTagsForResourceCommand, SNSClient } from '@aws-sdk/client-sns';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = lists an SNS topic's tags by arn
 * .why = raw i/o communicator for SNS; returns null for the no-tags case so a declared
 *   `null` converges to KEEP
 */
export const listTopicTags = async (
  input: { arn: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<Record<string, string> | null> => {
  // create sns client
  const sns = new SNSClient(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // read the tags
  const response = await sns.send(
    new ListTagsForResourceCommand({ ResourceArn: input.arn }),
  );
  const tags = response.Tags ?? [];
  if (tags.length === 0) return null;

  // fold the aws {Key,Value}[] into a plain record
  return Object.fromEntries(
    tags
      .filter((tag): tag is { Key: string; Value: string } => !!tag.Key)
      .map((tag) => [tag.Key, tag.Value ?? '']),
  );
};
