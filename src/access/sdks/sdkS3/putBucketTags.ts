import { PutBucketTaggingCommand, S3Client } from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = writes the bucket's whole tag set (replace, not merge)
 * .why = raw i/o communicator; aws PutBucketTagging replaces the entire set, so the
 *   caller hands the full desired record and the read-back is deterministic
 */
export const putBucketTags = async (
  input: { name: string; tags: Record<string, string> },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create s3 client
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  // replace the whole tag set with the desired record
  await s3.send(
    new PutBucketTaggingCommand({
      Bucket: input.name,
      Tagging: {
        TagSet: Object.entries(input.tags).map(([Key, Value]) => ({
          Key,
          Value,
        })),
      },
    }),
  );
};
