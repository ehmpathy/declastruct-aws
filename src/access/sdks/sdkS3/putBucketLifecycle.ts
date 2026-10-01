import {
  PutBucketLifecycleConfigurationCommand,
  S3Client,
  type TransitionStorageClass,
} from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { S3BucketLifecycleParams } from '@src/domain.objects/S3BucketLifecycleParams';

import { getAwsClientConfig } from '../getAwsClientConfig';
import { DECLASTRUCT_LIFECYCLE_RULE_ID } from './declastructLifecycleRuleId';
import { getBucketLifecycleRulesOwned } from './getBucketLifecycleRulesOwned';

/**
 * .what = writes the single whole-bucket lifecycle rule (transitions + object expiry +
 *   noncurrent-version expiry + incomplete-multipart abort)
 * .why = raw i/o communicator; replaces the bucket's rule set with one declastruct-owned
 *   rule (Filter Prefix '' = every object) so the read-back is deterministic
 *
 * .note
 *   - the write is a REPLACE-ALL (PutBucketLifecycleConfiguration overwrites every rule), so it
 *     FAILS LOUD when a FOREIGN rule is present — a replace-all would destroy a lifecycle rule
 *     someone added via the console or another IaC tool (rule.forbid.silent-resource-theft).
 *     ⇒ that precondition is `getBucketLifecycleRulesOwned`, shared verbatim with
 *     delBucketLifecycle's replace-all delete, so a future edit to it reaches both sides
 *   - a rule with `Transitions: []` and only the noncurrent-expiry + multipart-abort actions is a
 *     wire shape this repo did not previously produce. ⚠️ A-6 is UNVERIFIED — whether aws accepts
 *     this exact shape is carried to phase 5c (integration/acceptance) for live confirmation; the
 *     sdk types every action optional but is silent on api validation. aws rejects an ACTIONLESS
 *     rule, so the caller (setS3Bucket) must only call this when >=1 action is present
 */
export const putBucketLifecycle = async (
  input: { name: string } & S3BucketLifecycleParams,
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create s3 client
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // prove no foreign rule occupies the bucket before the replace-all; throws if one does. a null
  // return is "no configuration yet", which is exactly what a first write expects — so unlike the
  // delete side, this caller proceeds on it rather than early-returns
  await getBucketLifecycleRulesOwned({ name: input.name }, context);

  // write one whole-bucket rule that holds every transition (+ optional expiry)
  await s3.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: input.name,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: DECLASTRUCT_LIFECYCLE_RULE_ID,
            Status: 'Enabled',
            // whole-bucket scope. ⚠️ this Filter is LOAD-BEARING beyond the scope it declares:
            // aws returns `InvalidRequest` for a `NewerNoncurrentVersions` sent with no <Filter>
            // element ("To specify the number of noncurrent versions to retain, you must also
            // provide a <Filter> element" — s3 user guide, intro-lifecycle-rules). ⇒ do NOT make
            // this conditional; a `versions.expire.keep` declaration would fail at apply (A-10)
            Filter: { Prefix: '' },
            // ⚠️ A-6 — a backup store declares ZERO transitions, so this sends `Transitions: []`,
            // a wire shape this package has never produced. NARROWED 2026-09-21 by a doc read: the
            // s3 user guide says a rule consists of "one or more transition or expiration actions"
            // and enumerates `NoncurrentVersionExpiration` + `AbortIncompleteMultipartUpload` among
            // them, so the RULE SHAPE is documented-legal with no `Transition` present. what stays
            // unverified is only the empty-ARRAY serialization (does the sdk emit zero <Transition>
            // elements, or a container the api rejects?) — a live put, at phase 5c
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
            // current-object expiry (LifecycleExpiration)
            ...(input.objectExpireDays != null
              ? { Expiration: { Days: input.objectExpireDays } }
              : {}),
            // noncurrent-version expiry — by age (NoncurrentDays), count (NewerNoncurrentVersions),
            // or both; the union guarantees at least one is present (F18, I-9)
            ...(input.versionExpiry
              ? {
                  NoncurrentVersionExpiration: {
                    ...(input.versionExpiry.afterDays != null
                      ? { NoncurrentDays: input.versionExpiry.afterDays }
                      : {}),
                    ...(input.versionExpiry.keep != null
                      ? { NewerNoncurrentVersions: input.versionExpiry.keep }
                      : {}),
                  },
                }
              : {}),
            // incomplete-multipart abort (in-progress parts only)
            ...(input.multipartExpireDays != null
              ? {
                  AbortIncompleteMultipartUpload: {
                    DaysAfterInitiation: input.multipartExpireDays,
                  },
                }
              : {}),
          },
        ],
      },
    }),
  );
};
