import type { ContextLogTrail } from 'sdk-logs';

import { delResourceTags } from '@src/access/sdks/sdkSesv2/delResourceTags';
import { setResourceTags } from '@src/access/sdks/sdkSesv2/setResourceTags';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAllTagKeysToRemove } from './getAllTagKeysToRemove';

/**
 * .what = reconciles ANY sesv2-taggable resource's tags to the desired set, keyed on its arn
 *   (drop the keys no longer desired, then add/update the desired set)
 * .why = TagResource upserts but never removes, so a full reconcile needs an untag pass first.
 *   every sesv2 resource (email identity, configuration set, ...) reconciles identically once
 *   its arn is resolved, so this holds the shared body for the SESv2 family — each caller resolves
 *   its own arn via its own as*Arn transformer and delegates here (no per-resource copy of this
 *   logic within SESv2)
 * .note = reconcileSnsTopicTags mirrors this delta-then-set control flow for SNS (a different
 *   communicator pair). the two are a deliberate wet duplicate per rule.prefer.wet-over-dry —
 *   only 2 delta-based reconcilers exist today, so a shared reconcileTagsByArn abstraction waits
 *   for a 3rd (reconcileS3BucketTags is NOT one — S3 does a whole-set replace, no delta)
 */
export const reconcileSesv2ResourceTags = async (
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
  await delResourceTags({ arn: input.arn, keys: keysToRemove }, context);

  // add/update the desired set
  await setResourceTags({ arn: input.arn, tags: input.desired ?? {} }, context);
};
