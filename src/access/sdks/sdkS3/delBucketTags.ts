import { DeleteBucketTaggingCommand, S3Client } from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = drops the bucket's whole tag set
 * .why = raw i/o communicator; idempotent — aws no-ops when the bucket has no tags, and an
 *   absent parent bucket (NoSuchBucket) is already in the desired state
 */
export const delBucketTags = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create s3 client
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // drop the tag set; an absent bucket means no tags to drop (idempotent)
  // .note = match on error.name, not `instanceof NoSuchBucket`: aws-sdk v3 can bundle a
  //   duplicate sdk copy that breaks the prototype chain (same boundary idiom as delParameter)
  try {
    await s3.send(new DeleteBucketTaggingCommand({ Bucket: input.name }));
  } catch (error) {
    if (error instanceof Error && error.name === 'NoSuchBucket') return;
    throw error;
  }
};
