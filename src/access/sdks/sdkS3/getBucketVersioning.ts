import { GetBucketVersioningCommand, S3Client } from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = reads a bucket's version-state status as the RAW aws string (or null when unset)
 * .why = raw i/o communicator; returns null ONLY for the never-configured case (aws returns an empty
 *   body with no Status), and passes any present Status through UNCHANGED — it never degrades an
 *   unmodeled value to null. the cast (`castIntoDeclaredAwsS3Bucket`) is the one boundary that
 *   asserts the string is a modeled value and fails loud otherwise, so a future aws status enum
 *   member stays DISTINGUISHABLE from a genuine absent read rather than a versioned bucket read as
 *   never-versioned (I-5, case=4, rule.forbid.failhide)
 *
 * .note = aws has THREE states: never-configured (no Status) vs Enabled vs Suspended. once a
 *   bucket has a version-state it can only be Suspended, never returned to never-configured — so a
 *   null read means the bucket was never versioned
 */
export const getBucketVersioning = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<string | null> => {
  // create s3 client
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  try {
    const response = await s3.send(
      new GetBucketVersioningCommand({ Bucket: input.name }),
    );

    // an absent Status = never configured; else pass the RAW string through (the cast asserts it)
    return response.Status ?? null;
  } catch (error) {
    // the bucket vanished between the caller's head and this read (concurrent delete) — treat
    // as absent (null), a no-op, consistent with the lifecycle read boundary
    if (error instanceof Error && error.name === 'NoSuchBucket') return null;
    throw error;
  }
};
