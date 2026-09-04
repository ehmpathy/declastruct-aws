import {
  type BucketLocationConstraint,
  CreateBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { getAwsClientConfig } from '../getAwsClientConfig';

/**
 * .what = creates an S3 bucket in the given region (or adopts it if already ours)
 * .why = raw i/o communicator; idempotent for OUR bucket — BucketAlreadyOwnedByYou is a
 *   no-op. BucketAlreadyExists (a name held by ANOTHER account) propagates, so a global
 *   name clash fails loud rather than a silent adopt (rule.forbid.silent-resource-theft)
 *
 * .note = us-east-1 must NOT send a LocationConstraint (aws rejects it); every other region
 *   must send its own name as the constraint
 */
export const createBucket = async (
  input: { name: string; region: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  // create s3 client in the target region
  const s3 = new S3Client(getAwsClientConfig({ region: input.region }));

  // create-or-adopt the bucket
  try {
    await s3.send(
      new CreateBucketCommand({
        Bucket: input.name,
        ...(input.region === 'us-east-1'
          ? {}
          : {
              // sdk-boundary cast (rule.forbid.as-cast exempts a third-party sdk boundary):
              // aws types LocationConstraint as its own string-literal enum; our domain carries
              // a friendly `region: string` whose value IS a valid member for every
              // non-us-east-1 region, and aws validates the region at the api, so the cast
              // narrows an equal-or-wider domain string with no runtime risk. removal path: if
              // the domain typed `region` as the sdk's BucketLocationConstraint directly, the
              // cast drops — we keep the friendly string to avoid a hard bind to the sdk enum.
              CreateBucketConfiguration: {
                LocationConstraint: input.region as BucketLocationConstraint,
              },
            }),
      }),
    );
  } catch (error) {
    // match on error.name, not `instanceof BucketAlreadyOwnedByYou`: aws-sdk v3 can bundle a
    // duplicate sdk copy that breaks the prototype chain (same boundary idiom as delParameter)
    if (error instanceof Error && error.name === 'BucketAlreadyOwnedByYou')
      return;
    throw error;
  }
};
