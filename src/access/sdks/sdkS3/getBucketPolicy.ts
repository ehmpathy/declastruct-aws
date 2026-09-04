import { GetBucketPolicyCommand, S3Client } from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = reads the bucket's resource policy as its raw json string
 * .why = raw i/o communicator; aws throws NoSuchBucketPolicy when a bucket has no policy —
 *   the sdk gives no dedicated class, so match on the error name at this boundary and return
 *   null (the no-policy case)
 * .note = also degrades NoSuchBucket -> null: on the FIRST plan the bucket does not exist yet
 *   (a bucket policy is declared after its bucket, but its own get still runs), so a bare throw
 *   would abort the whole plan. null reads as "absent -> CREATE", which is correct
 *   (rule.forbid.plan-fail-on-apply-guided-prereq)
 */
export const getBucketPolicy = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<string | null> => {
  // create s3 client
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  try {
    const response = await s3.send(
      new GetBucketPolicyCommand({ Bucket: input.name }),
    );
    return response.Policy ?? null;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === 'NoSuchBucketPolicy' || error.name === 'NoSuchBucket')
    )
      return null;
    throw error;
  }
};
