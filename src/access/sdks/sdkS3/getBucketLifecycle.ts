import {
  GetBucketLifecycleConfigurationCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

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
): Promise<{
  transitions: { afterDays: number; class: string }[];
  expireAfterDays: number | null;
} | null> => {
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

    return { transitions, expireAfterDays: rule.Expiration?.Days ?? null };
  } catch (error) {
    if (error instanceof Error && error.name === 'NoSuchLifecycleConfiguration')
      return null;
    // the bucket vanished between the caller's head and this read (concurrent delete) —
    // treat as absent (null), a no-op, as the del* side tolerates NoSuchBucket too
    if (error instanceof Error && error.name === 'NoSuchBucket') return null;
    throw error;
  }
};
