import { PutBucketPolicyCommand, S3Client } from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = writes the bucket's resource policy from a raw json string
 * .why = raw i/o communicator; PutBucketPolicy replaces the whole policy, so the caller
 *   hands the full desired json and the read-back is deterministic
 */
export const putBucketPolicy = async (
  input: { name: string; policy: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create s3 client
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // replace the whole resource policy
  await s3.send(
    new PutBucketPolicyCommand({ Bucket: input.name, Policy: input.policy }),
  );
};
