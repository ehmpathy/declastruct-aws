import type { ContextLogTrail } from 'sdk-logs';

import { delParameterTags } from '@src/access/sdks/sdkSsm/delParameterTags';
import { setParameterTags } from '@src/access/sdks/sdkSsm/setParameterTags';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { getAllTagKeysToRemove } from '@src/domain.operations/tags/getAllTagKeysToRemove';

/**
 * .what = reconciles a single SSM parameter's tags to the desired set (drop absent, add desired)
 * .why = tags cannot ride a PutParameter Overwrite, so they reconcile with their own calls. this
 *   3-call sequence (getAllTagKeysToRemove -> delParameterTags -> setParameterTags) was byte-identical
 *   in setSsmParameterPlain + setSsmParameterSecure, so it lifts here to the shared ssmParameter leaf
 *   (rule.prefer.most-common-denominator) — ONE place to get the security-adjacent reconcile right.
 * .note = both AddTagsToResource + RemoveTagsFromResource need no value, so this is safe for a
 *   SecureString even when its value is left unchanged (mirrors setIamRole's tag reconcile).
 * .note = no unchanged-guard on purpose: unlike PutParameter, Add/RemoveTags do NOT bump the
 *   parameter Version or LastModifiedDate, so an unchanged reconcile causes zero drift (KEEP still
 *   converges). a tagsChanged guard would add a per-key diff to save an idempotent no-op — held
 *   per rule.prefer.wet-over-dry until a real need (rate limits, tags-heavy fan-out) appears.
 */
export const reconcileSsmParameterTags = async (
  input: {
    name: string;
    before: Record<string, string> | null;
    desired: Record<string, string> | null;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // drop the keys present before but no longer desired
  const tagKeysToRemove = getAllTagKeysToRemove({
    before: input.before,
    desired: input.desired,
  });
  await delParameterTags({ name: input.name, keys: tagKeysToRemove }, context);

  // add/update the desired set
  await setParameterTags(
    { name: input.name, tags: input.desired ?? {} },
    context,
  );
};
