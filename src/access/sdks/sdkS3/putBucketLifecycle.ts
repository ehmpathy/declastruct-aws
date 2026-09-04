import {
  GetBucketLifecycleConfigurationCommand,
  PutBucketLifecycleConfigurationCommand,
  S3Client,
  type TransitionStorageClass,
} from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';
import { DECLASTRUCT_LIFECYCLE_RULE_ID } from './declastructLifecycleRuleId';
import { getBucketLifecycleForeignRuleError } from './getBucketLifecycleForeignRuleError';
import { getBucketLifecycleOwnership } from './getBucketLifecycleOwnership';

/**
 * .what = writes the single whole-bucket lifecycle rule
 * .why = raw i/o communicator; replaces the bucket's rule set with one declastruct-owned
 *   rule (Filter Prefix '' = every object) so the read-back is deterministic
 * .note = the write is a REPLACE-ALL (PutBucketLifecycleConfiguration overwrites every rule), so
 *   it first reads the extant rules and FAILS LOUD if a FOREIGN rule is present — a replace-all
 *   would silently destroy a lifecycle rule someone added via the console or another IaC tool
 *   (rule.forbid.silent-resource-theft — a peer of the receipt-rule-set active-slot guard)
 */
export const putBucketLifecycle = async (
  input: {
    name: string;
    transitions: { afterDays: number; class: string }[];
    expireAfterDays: number | null;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create s3 client
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // read the extant rules; a replace-all must never clobber a foreign-owned rule
  const before = await s3
    .send(new GetBucketLifecycleConfigurationCommand({ Bucket: input.name }))
    .catch((error) => {
      // no lifecycle yet (or the bucket vanished mid-flight) — no rules to protect
      if (
        error instanceof Error &&
        (error.name === 'NoSuchLifecycleConfiguration' ||
          error.name === 'NoSuchBucket')
      )
        return { Rules: [] };
      throw error;
    });

  // fail loud if a foreign rule occupies the bucket — force disambiguation, never a silent wipe
  const { foreignRuleIds } = getBucketLifecycleOwnership({
    rules: before.Rules ?? [],
  });
  if (foreignRuleIds.length)
    throw getBucketLifecycleForeignRuleError({
      name: input.name,
      foreignRuleIds,
    });

  // write one whole-bucket rule that holds every transition (+ optional expiry)
  await s3.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: input.name,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: DECLASTRUCT_LIFECYCLE_RULE_ID,
            Status: 'Enabled',
            Filter: { Prefix: '' },
            Transitions: input.transitions.map((transition) => ({
              Days: transition.afterDays,
              // sdk-boundary cast (rule.forbid.as-cast exempts a third-party sdk boundary):
              // our domain carries a friendly `class: string` drawn from a closed union that is
              // a subset of aws's TransitionStorageClass enum, and aws validates the class at the
              // api, so the cast narrows a subset domain string with no runtime risk. removal
              // path: if the domain typed `class` as the sdk's TransitionStorageClass directly,
              // the cast drops — we keep the friendly string to avoid a hard bind to the sdk enum.
              StorageClass: transition.class as TransitionStorageClass,
            })),
            ...(input.expireAfterDays != null
              ? { Expiration: { Days: input.expireAfterDays } }
              : {}),
          },
        ],
      },
    }),
  );
};
