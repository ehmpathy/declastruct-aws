import { asProcedure } from 'as-procedure';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { putBucketPolicy } from '@src/access/sdks/sdkS3/putBucketPolicy';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsS3BucketPolicy } from '@src/domain.objects/DeclaredAwsS3BucketPolicy';
import { castFromDeclaredAwsIamPolicyDocument } from '@src/domain.operations/iamRole/castFromDeclaredAwsIamPolicyDocument';

import { getOneS3BucketPolicy } from './getOneS3BucketPolicy';

/**
 * .what = creates or updates an S3 bucket's resource policy (findsert | upsert)
 * .why = enables declarative management of the SES PutObject grant on the mail store
 *
 * .idempotency
 *   - findsert on the FULL unique key (bucket = the whole identity): look up by bucket,
 *     return the extant if present, else PutBucketPolicy. a re-run converges to KEEP.
 *   - upsert always writes the desired document (PutBucketPolicy replaces the whole policy).
 */
export const setS3BucketPolicy = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsS3BucketPolicy;
      upsert: DeclaredAwsS3BucketPolicy;
    }>,
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<DeclaredAwsS3BucketPolicy> => {
    const desired = input.findsert ?? input.upsert;

    // find the extant policy by unique bucket ref
    const foundBefore = await getOneS3BucketPolicy(
      { by: { unique: { bucket: desired.bucket } } },
      context,
    );

    // findsert: return the extant unchanged
    if (foundBefore && input.findsert) return foundBefore;

    // serialize the shared policy document to aws json
    const policyJson = castFromDeclaredAwsIamPolicyDocument(desired.document);

    // write the whole resource policy
    await putBucketPolicy(
      { name: desired.bucket.name, policy: policyJson },
      context,
    );

    // read back the written policy
    const foundAfter = await getOneS3BucketPolicy(
      { by: { unique: { bucket: desired.bucket } } },
      context,
    );

    // failfast if absent after set
    if (!foundAfter)
      UnexpectedCodePathError.throw('s3 bucket policy not found after set', {
        desired,
      });

    return foundAfter;
  },
);
