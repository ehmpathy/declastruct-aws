import { asProcedure } from 'as-procedure';
import type { RefByUnique } from 'domain-objects';
import type { ContextLogTrail } from 'sdk-logs';

import { getBucketPolicy } from '@src/access/sdks/sdkS3/getBucketPolicy';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsS3BucketPolicy } from '@src/domain.objects/DeclaredAwsS3BucketPolicy';

import { castIntoDeclaredAwsS3BucketPolicy } from './castIntoDeclaredAwsS3BucketPolicy';

/**
 * .what = gets a single S3 bucket policy from aws by unique (bucket)
 * .why = enables declarative drift detection; returns null when absent so the plan reads
 *   CREATE rather than throw (rule.forbid.plan-fail-on-apply-guided-prereq)
 */
export const getOneS3BucketPolicy = asProcedure(
  async (
    input: {
      by: { unique: RefByUnique<typeof DeclaredAwsS3BucketPolicy> };
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<DeclaredAwsS3BucketPolicy | null> => {
    // the bucket ref is the whole identity
    const bucketName = input.by.unique.bucket.name;

    // read the raw policy json (null if absent)
    const policyJson = await getBucketPolicy({ name: bucketName }, context);
    if (!policyJson) return null;

    // cast to domain format
    return castIntoDeclaredAwsS3BucketPolicy({ bucketName, policyJson });
  },
);
