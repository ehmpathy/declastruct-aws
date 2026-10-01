import { PutBucketVersioningCommand, S3Client } from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { AwsS3BucketVersionStatus } from '@src/domain.objects/isAwsS3BucketVersionStatus';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = sets a bucket's version-state (Enabled | Suspended)
 * .why = raw i/o communicator; the version-state put is the one IRREVERSIBLE write in this wish
 *   (invariant I-1) — a bucket that was Enabled cannot return to never-versioned, only Suspended.
 *   so callers MUST run this LAST, after every reversible step has succeeded (see setS3Bucket)
 *
 * .note
 *   - idempotent — a re-put of the same status is a no-op against live state
 *   - `status` takes the SHARED `AwsS3BucketVersionStatus`, never a re-typed inline union. the read
 *     path asserts against that same closed set via `isAwsS3BucketVersionStatus`, so one declaration
 *     governs both directions — a second copy here could drift from the read's set on a single edit
 */
export const putBucketVersioning = async (
  input: { name: string; status: AwsS3BucketVersionStatus },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create s3 client
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  await s3.send(
    new PutBucketVersioningCommand({
      Bucket: input.name,
      VersioningConfiguration: { Status: input.status },
    }),
  );
};
