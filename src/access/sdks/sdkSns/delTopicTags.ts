import { SNSClient, UntagResourceCommand } from '@aws-sdk/client-sns';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = removes tags from an SNS topic by key
 * .why = raw i/o communicator for SNS; the removal half of tag reconcile
 */
export const delTopicTags = async (
  input: { arn: string; keys: string[] },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // no-op on an empty key set
  if (input.keys.length === 0) return;

  // create sns client
  const sns = new SNSClient(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // drop the given tag keys
  await sns.send(
    new UntagResourceCommand({ ResourceArn: input.arn, TagKeys: input.keys }),
  );
};
