import { GetPublicAccessBlockCommand, S3Client } from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { S3BucketPublicAccessBlockParams } from '@src/domain.objects/S3BucketPublicAccessBlockParams';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = reads a bucket's public-access-block config (the four aws booleans)
 * .why = raw i/o communicator; returns null when no block was ever written, so a plan can tell
 *   "never set" apart from "set to all-false"
 *
 * .note
 *   - aws returns `NoSuchPublicAccessBlockConfiguration` with http 404 when no block exists.
 *     🟢 A-5 CLOSED 2026-09-27 by a live measurement — `s3Bucket.journey` [t3b] deletes the block
 *     and pins both the name and the status. the docs page carries no Errors section and the sdk
 *     models no class for it, so the live call was the only instrument that could settle it
 *   - the off-signal is still matched on the name OR the 404, so a future rename by aws alone
 *     does not abort the whole plan; [t3b] would surface such a rename as a red test
 *   - ⚠️ ONLY the 404 / absent-config signal degrades to null; every other error (esp.
 *     `AccessDenied`, a 403) propagates, or a widened catch would turn a loud iam failure into a
 *     silent phantom (rule.forbid.plan-fail-on-apply-guided-prereq, rule.forbid.failhide)
 *   - a sub-field aws omits is read as false (`?? false`) — the unblocked value, so a partial
 *     block plans UPDATE to the real desired block rather than a false-KEEP of an exposed bucket
 *     (case=4 [t2], I-8)
 */
export const getBucketPublicAccessBlock = async (
  input: { name: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<S3BucketPublicAccessBlockParams | null> => {
  // create s3 client
  const s3 = new S3Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

  try {
    const response = await s3.send(
      new GetPublicAccessBlockCommand({ Bucket: input.name }),
    );
    const config = response.PublicAccessBlockConfiguration;

    // no config body = never set = null (absent, not all-false)
    if (!config) return null;

    // an omitted sub-field reads as its UNBLOCKED value (false), never as secure — an omitted
    // field that is genuinely false must plan UPDATE, not false-KEEP an exposed bucket (I-8)
    return {
      blockPublicAcls: config.BlockPublicAcls ?? false,
      ignorePublicAcls: config.IgnorePublicAcls ?? false,
      blockPublicPolicy: config.BlockPublicPolicy ?? false,
      restrictPublicBuckets: config.RestrictPublicBuckets ?? false,
    };
  } catch (error) {
    if (!(error instanceof Error)) throw error;

    // the bucket vanished between the caller's head and this read (concurrent delete)
    if (error.name === 'NoSuchBucket') return null;

    // "absent" = a bucket with no block configured. the name is measured live ([t3b]); the 404
    // match stays so an aws rename alone cannot abort the whole plan for every no-block bucket
    const httpStatusCode = (
      error as { $metadata?: { httpStatusCode?: number } }
    ).$metadata?.httpStatusCode;
    if (
      error.name === 'NoSuchPublicAccessBlockConfiguration' ||
      httpStatusCode === 404
    )
      return null;

    // every other error — esp. AccessDenied (a 403) — propagates loud
    throw error;
  }
};
