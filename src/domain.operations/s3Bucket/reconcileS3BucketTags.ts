import type { ContextLogTrail } from 'sdk-logs';

import { delBucketTags } from '@src/access/sdks/sdkS3/delBucketTags';
import { putBucketTags } from '@src/access/sdks/sdkS3/putBucketTags';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

/**
 * .what = reconciles an S3 bucket's tags to the desired set
 * .why = the whole-set put replaces every tag, so a desired record is written whole; an
 *   empty desired set drops the tags via the del wrapper (a put of an empty set is invalid)
 */
export const reconcileS3BucketTags = async (
  input: {
    name: string;
    desired: Record<string, string> | null;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // an empty desired set means drop all tags
  const desiredKeys = Object.keys(input.desired ?? {});
  if (desiredKeys.length === 0) {
    await delBucketTags({ name: input.name }, context);
    return;
  }

  // write the whole desired set (replace)
  await putBucketTags({ name: input.name, tags: input.desired ?? {} }, context);
};
