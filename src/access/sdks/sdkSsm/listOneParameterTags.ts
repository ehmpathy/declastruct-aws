import { ListTagsForResourceCommand, SSMClient } from '@aws-sdk/client-ssm';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

/**
 * .what = lists the tags on a single SSM parameter by name (metadata only, NO value)
 * .why = tags are roundtrip read-write; this metadata-only call lets a SecureString be
 *   reconciled with its tags WITHOUT GetParameter or kms:Decrypt. ListTagsForResource is
 *   resource-scopable, so it can be tightly scoped to the param arns.
 * .note = returns null when the parameter has no tags (so a declared `tags: null` converges
 *   to KEEP rather than an empty-object diff)
 */
export const listOneParameterTags = async (
  input: {
    name: string;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<Record<string, string> | null> => {
  // create ssm client
  const ssm = new SSMClient({ region: context.aws.credentials.region });

  // list the tags for this parameter (metadata only, no value)
  const response = await ssm.send(
    new ListTagsForResourceCommand({
      ResourceType: 'Parameter',
      ResourceId: input.name,
    }),
  );

  // fold the tag list into a record; null when there are no tags
  const tagList = response.TagList ?? [];
  if (tagList.length === 0) return null;
  return tagList.reduce(
    (acc, tag) => {
      if (tag.Key && tag.Value !== undefined) acc[tag.Key] = tag.Value;
      return acc;
    },
    {} as Record<string, string>,
  );
};
