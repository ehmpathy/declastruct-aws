import {
  DeleteBucketLifecycleCommand,
  GetBucketLifecycleConfigurationCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';
import { getBucketLifecycleForeignRuleError } from './getBucketLifecycleForeignRuleError';
import { getBucketLifecycleOwnership } from './getBucketLifecycleOwnership';

/**
 * .what = removes the bucket's declastruct-owned lifecycle rule (the persist mode)
 * .why = raw i/o communicator; idempotent — aws no-ops when no lifecycle is set, and an
 *   absent parent bucket (NoSuchBucket) is already in the desired state
 * .note = DeleteBucketLifecycleConfiguration is a REPLACE-ALL wipe (it drops EVERY rule, foreign
 *   included), so — exactly like putBucketLifecycle's replace-all write — it first reads the
 *   extant rules and FAILS LOUD if a FOREIGN rule is present. a blind delete would silently
 *   destroy a lifecycle rule someone added via the console or another IaC tool
 *   (rule.forbid.silent-resource-theft — the delete-side twin of the put-side guard). the delete
 *   fires only when the config holds our rule alone (or no rule at all).
 */
export const delBucketLifecycle = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create s3 client
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // read the extant rules; a replace-all delete must never clobber a foreign-owned rule
  // .note = match on error.name, not `instanceof X`: aws-sdk v3 can bundle a duplicate sdk copy
  //   that breaks the prototype chain (same boundary idiom as delParameter)
  const before = await s3
    .send(new GetBucketLifecycleConfigurationCommand({ Bucket: input.name }))
    .catch((error) => {
      // no lifecycle set (or the bucket is absent) — already in the desired persist state
      if (
        error instanceof Error &&
        (error.name === 'NoSuchLifecycleConfiguration' ||
          error.name === 'NoSuchBucket')
      )
        return null;
      throw error;
    });

  // no config to drop — idempotent no-op
  if (!before) return;

  // fail loud if a foreign rule occupies the bucket — a replace-all delete would wipe it too
  const { foreignRuleIds } = getBucketLifecycleOwnership({
    rules: before.Rules ?? [],
  });
  if (foreignRuleIds.length)
    throw getBucketLifecycleForeignRuleError({
      name: input.name,
      foreignRuleIds,
    });

  // only our rule (or no rule) remains — safe to drop the whole config
  // .note = match on error.name, not `instanceof NoSuchBucket`: aws-sdk v3 prototype-chain hazard
  try {
    await s3.send(new DeleteBucketLifecycleCommand({ Bucket: input.name }));
  } catch (error) {
    if (error instanceof Error && error.name === 'NoSuchBucket') return;
    throw error;
  }
};
