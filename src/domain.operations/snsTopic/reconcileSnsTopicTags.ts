import type { ContextLogTrail } from 'sdk-logs';

import { delTopicTags } from '@src/access/sdks/sdkSns/delTopicTags';
import { setTopicTags } from '@src/access/sdks/sdkSns/setTopicTags';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { getAllTagKeysToRemove } from '@src/domain.operations/tags/getAllTagKeysToRemove';

/**
 * .what = reconciles an SNS topic's tags to the desired set (drop absent, add desired)
 * .why = TagResource upserts but never removes, so a full reconcile needs an untag pass
 *   first; mirrors reconcileSsmParameterTags with SNS's Tag/UntagResource calls
 */
export const reconcileSnsTopicTags = async (
  input: {
    arn: string;
    before: Record<string, string> | null;
    desired: Record<string, string> | null;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // drop the keys present before but no longer desired
  const keysToRemove = getAllTagKeysToRemove({
    before: input.before,
    desired: input.desired,
  });
  await delTopicTags({ arn: input.arn, keys: keysToRemove }, context);

  // add/update the desired set
  await setTopicTags({ arn: input.arn, tags: input.desired ?? {} }, context);
};
