import {
  GetBucketLifecycleConfigurationCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { S3BucketLifecycleParams } from '@src/domain.objects/S3BucketLifecycleParams';

import { getAwsClientConfig } from '../getAwsClientConfig';
import { getBucketLifecycleOwnership } from './getBucketLifecycleOwnership';

/**
 * .what = reads the single whole-bucket lifecycle rule declastruct manages
 * .why = raw i/o communicator; returns null for the no-lifecycle (persist) case so a
 *   declared null converges to KEEP. aws throws NoSuchLifecycleConfiguration when absent —
 *   the sdk gives no dedicated class, so match on the error name at this boundary
 */
export const getBucketLifecycle = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<S3BucketLifecycleParams | null> => {
  // create s3 client
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  try {
    const response = await s3.send(
      new GetBucketLifecycleConfigurationCommand({ Bucket: input.name }),
    );

    // read ONLY the declastruct-owned rule (matched by its id), never the first rule blindly —
    // a foreign rule added via the console or another IaC tool must not be misread as ours and
    // then wiped on the next put (rule.forbid.silent-resource-theft)
    const { owned: rule } = getBucketLifecycleOwnership({
      rules: response.Rules ?? [],
    });
    if (!rule) return null;

    const transitions = (rule.Transitions ?? []).flatMap((transition) =>
      transition.Days != null && transition.StorageClass
        ? [{ afterDays: transition.Days, class: transition.StorageClass }]
        : [],
    );

    // read the noncurrent-version expiry back as its two axes; null when aws sends no rule.
    // present-but-empty cannot occur (aws only stores the container when >=1 axis was written),
    // but guard it anyway — a container with neither axis reads as absent
    const noncurrent = rule.NoncurrentVersionExpiration;
    const versionExpiry =
      noncurrent &&
      (noncurrent.NoncurrentDays != null ||
        noncurrent.NewerNoncurrentVersions != null)
        ? {
            afterDays: noncurrent.NoncurrentDays ?? null,
            keep: noncurrent.NewerNoncurrentVersions ?? null,
          }
        : null;

    return {
      transitions,
      objectExpireDays: rule.Expiration?.Days ?? null,
      versionExpiry,
      multipartExpireDays:
        rule.AbortIncompleteMultipartUpload?.DaysAfterInitiation ?? null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'NoSuchLifecycleConfiguration')
      return null;
    // the bucket vanished between the caller's head and this read (concurrent delete) —
    // treat as absent (null), a no-op, as the del* side tolerates NoSuchBucket too.
    //
    // ⚠️ this DOES collapse two states into one value — "the bucket has no lifecycle" and "the
    // bucket is gone" both read null. that is safe only because every caller fails loud on the
    // second state one step later, stated here so the next reader need not re-derive it:
    //   - `getOneS3Bucket` heads the bucket BEFORE this read, so a null here on a live bucket is
    //     genuinely "no lifecycle"; a null from a vanished one yields a bucket the caller then
    //     re-heads and reports absent
    //   - the RETRACT poll (`isStable: live === null`) would read a vanished bucket as converged —
    //     and `setS3Bucket`'s read-back then throws `UnexpectedCodePathError('not found after set')`
    //   - the PUT poll (`doesS3BucketLifecycleReadMatchDesired`) returns false on a null live, so a
    //     vanished bucket polls to the deadline and throws rather than reports a false convergence
    // ⇒ a caller added later that trusts this null WITHOUT one of those downstream checks would
    // turn a concurrent delete into a silent success (rule.forbid.failhide)
    if (error instanceof Error && error.name === 'NoSuchBucket') return null;
    throw error;
  }
};
