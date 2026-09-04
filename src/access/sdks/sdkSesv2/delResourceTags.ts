import { SESv2Client, UntagResourceCommand } from '@aws-sdk/client-sesv2';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = removes tags (by key) from any SES resource by arn
 * .why = raw i/o communicator; the untag pass of a full tag reconcile — drops the keys
 *   present before but no longer desired
 */
export const delResourceTags = async (
  input: { arn: string; keys: string[] },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // a no-op when there are no keys to drop (UntagResource rejects an empty set)
  if (input.keys.length === 0) return;

  // create sesv2 client
  const ses = new SESv2Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // drop the undesired keys
  await ses.send(
    new UntagResourceCommand({ ResourceArn: input.arn, TagKeys: input.keys }),
  );
};
