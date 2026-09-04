import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsS3BucketPolicy } from '@src/domain.objects/DeclaredAwsS3BucketPolicy';
import { delS3BucketPolicy } from '@src/domain.operations/s3BucketPolicy/delS3BucketPolicy';
import { getOneS3BucketPolicy } from '@src/domain.operations/s3BucketPolicy/getOneS3BucketPolicy';
import { setS3BucketPolicy } from '@src/domain.operations/s3BucketPolicy/setS3BucketPolicy';

/**
 * .what = declastruct DAO for AWS S3 Bucket Policy resources
 * .why = wraps the bucket-policy operations to conform to the declastruct interface, so a
 *   bucket policy is drivable through plan/apply like its peers
 * .note = a bucket policy has no primary key (no arn), only the unique key (bucket)
 */
export const DeclaredAwsS3BucketPolicyDao = genDeclastructDao<
  typeof DeclaredAwsS3BucketPolicy,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsS3BucketPolicy,
  get: {
    one: {
      byPrimary: null,
      byUnique: async (input, context) => {
        return getOneS3BucketPolicy({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setS3BucketPolicy({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setS3BucketPolicy({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delS3BucketPolicy({ by: { ref: input } }, context);
    },
  },
});
