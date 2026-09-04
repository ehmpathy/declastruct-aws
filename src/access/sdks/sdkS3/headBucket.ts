import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = checks whether an S3 bucket exists (and is reachable by this account)
 * .why = raw i/o communicator; a 404 surfaces as NotFound -> false so the plan-time get
 *   degrades to CREATE. a 403 (owned by another account) propagates so a name clash fails
 *   loud rather than a silent CREATE that would then error
 */
export const headBucket = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<boolean> => {
  // create s3 client
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // probe the bucket; absence surfaces as NotFound
  // .note = match on error.name, not `instanceof NotFound`: aws-sdk v3 can bundle a duplicate
  //   sdk copy that breaks the prototype chain (same boundary idiom as delParameter)
  try {
    await s3.send(new HeadBucketCommand({ Bucket: input.name }));
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFound') return false;
    throw error;
  }
};
