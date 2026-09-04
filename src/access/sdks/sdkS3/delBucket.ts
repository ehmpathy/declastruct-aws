import { DeleteBucketCommand, S3Client } from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = deletes an S3 bucket by name
 * .why = raw i/o communicator; idempotent — an absent bucket (NoSuchBucket) is a no-op
 * .note = aws requires the bucket be empty; a non-empty bucket fails loud (by design — we
 *   never silently purge objects)
 */
export const delBucket = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create s3 client
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // delete the bucket; an absent bucket is already in the desired state
  // .note = match on error.name, not `instanceof NoSuchBucket`: aws-sdk v3 can bundle a
  //   duplicate sdk copy that breaks the prototype chain (same boundary idiom as delParameter)
  try {
    await s3.send(new DeleteBucketCommand({ Bucket: input.name }));
  } catch (error) {
    if (error instanceof Error && error.name === 'NoSuchBucket') return;
    throw error;
  }
};
