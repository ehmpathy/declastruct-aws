import { DeleteBucketLifecycleCommand, S3Client } from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';
import { getBucketLifecycleRulesOwned } from './getBucketLifecycleRulesOwned';

/**
 * .what = removes the bucket's declastruct-owned lifecycle rule (the persist mode)
 * .why = raw i/o communicator; idempotent — aws no-ops when no lifecycle is set, and an
 *   absent parent bucket (NoSuchBucket) is already in the desired state
 * .note = DeleteBucketLifecycleConfiguration is a REPLACE-ALL wipe (it drops EVERY rule, foreign
 *   included), so it FAILS LOUD when a FOREIGN rule is present — a blind delete would destroy a
 *   lifecycle rule someone added via the console or another IaC tool
 *   (rule.forbid.silent-resource-theft). the delete fires only when the config holds our rule
 *   alone. ⇒ that precondition is `getBucketLifecycleRulesOwned`, shared verbatim with
 *   putBucketLifecycle's replace-all write, so a future edit to it cannot reach one side only
 */
export const delBucketLifecycle = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create s3 client
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // prove no foreign rule occupies the bucket before the replace-all delete; throws if one does
  const before = await getBucketLifecycleRulesOwned(
    { name: input.name },
    context,
  );

  // no config to drop (or the bucket is absent) — already in the desired persist state
  if (!before) return;

  // only our rule (or no rule) remains — safe to drop the whole config
  // .note = match on error.name, not `instanceof NoSuchBucket`: aws-sdk v3 prototype-chain hazard
  try {
    await s3.send(new DeleteBucketLifecycleCommand({ Bucket: input.name }));
  } catch (error) {
    if (error instanceof Error && error.name === 'NoSuchBucket') return;
    throw error;
  }
};
