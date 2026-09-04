import { asProcedure } from 'as-procedure';
import { isRefByUnique, type Ref } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import { delBucketPolicy } from '@src/access/sdks/sdkS3/delBucketPolicy';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsS3BucketPolicy } from '@src/domain.objects/DeclaredAwsS3BucketPolicy';

/**
 * .what = deletes an S3 bucket's resource policy by unique ref (bucket)
 * .why = the idempotent destroy path the DAO's set.delete drives; an absent policy is a
 *   no-op so a repeat delete converges
 */
export const delS3BucketPolicy = asProcedure(
  async (
    input: {
      by: { ref: Ref<typeof DeclaredAwsS3BucketPolicy> };
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<void> => {
    // a bucket policy is keyed only by the bucket ref (unique)
    if (!isRefByUnique({ of: DeclaredAwsS3BucketPolicy })(input.by.ref))
      UnexpectedCodePathError.throw(
        'bucket policies only support a unique ref for deletion',
        { ref: input.by.ref },
      );
    const ref = input.by.ref;

    // drop the resource policy (idempotent)
    await delBucketPolicy({ name: ref.bucket.name }, context);
  },
);
