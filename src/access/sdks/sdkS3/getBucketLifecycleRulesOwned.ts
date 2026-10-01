import {
  GetBucketLifecycleConfigurationCommand,
  type LifecycleRule,
  S3Client,
} from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';
import { getBucketLifecycleForeignRuleError } from './getBucketLifecycleForeignRuleError';
import { getBucketLifecycleOwnership } from './getBucketLifecycleOwnership';

/**
 * .what = reads a bucket's extant lifecycle rules and PROVES none are foreign, or throws
 * .why = the ONE precondition both replace-all mutations share. s3 gives no partial write:
 *   PutBucketLifecycleConfiguration overwrites every rule and DeleteBucketLifecycleConfiguration
 *   drops every rule, so each must first confirm the bucket holds no rule but our own — else it
 *   silently destroys a lifecycle rule a human added via the console or another IaC tool
 *   (rule.forbid.silent-resource-theft).
 *
 *   ⇒ the guard lived as two hand-copied blocks, one per caller. a widened catch set, a new
 *   adopt mode, or a changed error applied to one copy and not the other would reopen the theft
 *   on whichever side was missed — and the miss is SILENT, since the surviving copy still reads
 *   correct. one source makes that edit reach both callers by construction
 *
 * .note = the return distinguishes the two absent-ish states the callers treat differently:
 *   - `null` — no lifecycle configuration exists at all (or the bucket vanished mid-flight).
 *     the DELETE side early-returns on this as its idempotent no-op; the PUT side proceeds to
 *     write, since a bucket with no config is exactly what a first write expects
 *   - `LifecycleRule[]` — a configuration exists, and every rule in it is ours
 * .note = match on `error.name`, never `instanceof X`: aws-sdk v3 can bundle a duplicate sdk copy
 *   that breaks the prototype chain (the same boundary idiom as delParameter)
 */
export const getBucketLifecycleRulesOwned = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<LifecycleRule[] | null> => {
  // create s3 client
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // read the extant rules; a replace-all must never clobber a foreign-owned rule
  const before = await s3
    .send(new GetBucketLifecycleConfigurationCommand({ Bucket: input.name }))
    .catch((error) => {
      // no lifecycle set (or the bucket is absent) — there are no rules to protect
      if (
        error instanceof Error &&
        (error.name === 'NoSuchLifecycleConfiguration' ||
          error.name === 'NoSuchBucket')
      )
        return null;
      throw error;
    });

  // no configuration at all — the caller decides what that means for its mutation
  if (!before) return null;

  // fail loud if a foreign rule occupies the bucket — force disambiguation, never a silent wipe
  const { foreignRuleIds } = getBucketLifecycleOwnership({
    rules: before.Rules ?? [],
  });
  if (foreignRuleIds.length)
    throw getBucketLifecycleForeignRuleError({
      name: input.name,
      foreignRuleIds,
    });

  return before.Rules ?? [];
};
