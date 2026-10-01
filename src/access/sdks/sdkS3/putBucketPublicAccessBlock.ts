import { PutPublicAccessBlockCommand, S3Client } from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { S3BucketPublicAccessBlockParams } from '@src/domain.objects/S3BucketPublicAccessBlockParams';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = writes a bucket's public-access-block config (the four aws booleans)
 * .why = raw i/o communicator; a reversible write (unlike the version-state put), so it runs
 *   before the version-state put in setS3Bucket
 *
 * .note = idempotent — a re-put of the same four booleans is a no-op against live state
 */
export const putBucketPublicAccessBlock = async (
  input: { name: string } & S3BucketPublicAccessBlockParams,
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create s3 client
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  await s3.send(
    new PutPublicAccessBlockCommand({
      Bucket: input.name,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: input.blockPublicAcls,
        IgnorePublicAcls: input.ignorePublicAcls,
        BlockPublicPolicy: input.blockPublicPolicy,
        RestrictPublicBuckets: input.restrictPublicBuckets,
      },
    }),
  );
};
