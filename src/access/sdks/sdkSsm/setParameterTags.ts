import { AddTagsToResourceCommand, SSMClient } from '@aws-sdk/client-ssm';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

/**
 * .what = adds/updates tags on a single SSM parameter (AddTagsToResource)
 * .why = tags cannot ride along a PutParameter with Overwrite=true, so they are reconciled
 *   with their own call. AddTagsToResource needs no value, so it is safe for a SecureString.
 * .note = a no-op when there are no tags to set
 */
export const setParameterTags = async (
  input: {
    name: string;
    tags: Record<string, string>;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // no tags to add
  const entries = Object.entries(input.tags);
  if (entries.length === 0) return;

  // create ssm client
  const ssm = new SSMClient({ region: context.aws.credentials.region });

  // add/update the tags
  await ssm.send(
    new AddTagsToResourceCommand({
      ResourceType: 'Parameter',
      ResourceId: input.name,
      Tags: entries.map(([key, value]) => ({ Key: key, Value: value })),
    }),
  );
};
