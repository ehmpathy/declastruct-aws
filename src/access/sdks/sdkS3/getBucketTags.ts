import { GetBucketTaggingCommand, S3Client } from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = reads the bucket's tag set as a plain key/value record
 * .why = raw i/o communicator; aws throws NoSuchTagSet when a bucket has no tags —
 *   the sdk gives no dedicated class, so match on the error name at this boundary and
 *   return null (the untagged case)
 */
export const getBucketTags = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<Record<string, string> | null> => {
  // create s3 client
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  try {
    const response = await s3.send(
      new GetBucketTaggingCommand({ Bucket: input.name }),
    );

    // fold the aws tag list into a plain record
    return Object.fromEntries(
      (response.TagSet ?? []).flatMap((tag) =>
        tag.Key != null && tag.Value != null ? [[tag.Key, tag.Value]] : [],
      ),
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'NoSuchTagSet') return null;
    // the bucket vanished between the caller's head and this read (concurrent delete) —
    // treat as absent (null), a no-op, as the del* side tolerates NoSuchBucket too
    if (error instanceof Error && error.name === 'NoSuchBucket') return null;
    throw error;
  }
};
