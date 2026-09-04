import { SESv2Client, TagResourceCommand } from '@aws-sdk/client-sesv2';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = adds or updates tags on any SES resource by arn
 * .why = raw i/o communicator; TagResource upserts tags but never removes, so a full
 *   reconcile pairs this with delResourceTags
 */
export const setResourceTags = async (
  input: { arn: string; tags: Record<string, string> },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // a no-op when there are no tags to add (TagResource rejects an empty set)
  const entries = Object.entries(input.tags);
  if (entries.length === 0) return;

  // create sesv2 client
  const ses = new SESv2Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // upsert the desired tags
  await ses.send(
    new TagResourceCommand({
      ResourceArn: input.arn,
      Tags: entries.map(([Key, Value]) => ({ Key, Value })),
    }),
  );
};
