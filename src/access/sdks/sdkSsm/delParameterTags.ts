import { RemoveTagsFromResourceCommand, SSMClient } from '@aws-sdk/client-ssm';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

/**
 * .what = removes tags from a single SSM parameter by key (RemoveTagsFromResource)
 * .why = reconcile drops tags no longer desired; needs no value, so safe for a SecureString
 * .note = a no-op when there are no keys to remove
 */
export const delParameterTags = async (
  input: {
    name: string;
    keys: string[];
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // no keys to remove
  if (input.keys.length === 0) return;

  // create ssm client
  const ssm = new SSMClient({ region: context.aws.credentials.region });

  // remove the tags
  await ssm.send(
    new RemoveTagsFromResourceCommand({
      ResourceType: 'Parameter',
      ResourceId: input.name,
      TagKeys: input.keys,
    }),
  );
};
